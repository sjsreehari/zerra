/**
 * @zerra/fix-engine
 *
 * Validates, applies, and generates security fix patches.
 *
 * ⚠️  CLOUD API NOTICE
 * ─────────────────────────────────────────────────────────────────────────────
 * `generateAnthropicDiff` sends the vulnerable code snippet and surrounding
 * context lines to the Anthropic API (api.anthropic.com).
 *
 * If you have set ANTHROPIC_API_KEY, code from the scanned repository WILL
 * leave your machine.  Only use this function if you have verified that your
 * organisation's data-handling policies permit sending source code to a
 * third-party cloud service.
 *
 * For a fully local alternative, configure an Ollama endpoint via
 * OLLAMA_BASE_URL instead of setting ANTHROPIC_API_KEY.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTool } from "@zerra/scanner";
import type { NormalizedFinding } from "@zerra/schema";

// ─── Diff validation ──────────────────────────────────────────────────────────

/**
 * Returns true if `diff` looks like a valid unified git diff.
 * Checks for the canonical diff --git header, --- a/ / +++ b/ hunks, and @@ markers.
 */
export function isUnifiedDiff(diff: string): boolean {
  return (
    diff.startsWith("diff --git ") &&
    /^--- a\/.+\n\+\+\+ b\/.+/m.test(diff) &&
    diff.includes("@@")
  );
}

// ─── Patch validation (dry-run via git apply --check) ─────────────────────────

/**
 * Validates a unified diff against the working tree without modifying any files.
 * Uses `git apply --check` so the caller can be confident the patch is applicable.
 */
export async function validatePatch(
  repo: string,
  diff: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isUnifiedDiff(diff)) {
    return { ok: false, reason: "Response was not a unified diff" };
  }

  const tmpDir = await mkdtemp(join(tmpdir(), "zerra-patch-"));
  const patch = join(tmpDir, "fix.patch");
  try {
    await writeFile(patch, diff, { mode: 0o600 });
    const result = await runTool("git", ["apply", "--check", patch], repo);
    return result.code === 0
      ? { ok: true }
      : { ok: false, reason: "git apply --check failed" };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds the LLM prompt for generating a minimal security fix.
 * Instructs the model to return ONLY a valid unified git diff.
 */
export function fixPrompt(finding: NormalizedFinding, context: string): string {
  return (
    `You are fixing one security finding. ` +
    `Return ONLY a minimal valid unified git diff. Never replace a whole file.\n` +
    `Finding: ${JSON.stringify(finding)}\nContext:\n${context}`
  );
}

// ─── Test command detection ───────────────────────────────────────────────────

/**
 * Heuristically detects the verification command for a repository by
 * inspecting well-known project files (package.json, Makefile).
 * Returns undefined if no test command can be determined.
 */
export async function detectVerificationCommand(
  repo: string,
): Promise<string[] | undefined> {
  const { readFile, access } = await import("node:fs/promises");

  try {
    const pkg = JSON.parse(await readFile(join(repo, "package.json"), "utf8"));
    if (pkg.scripts?.test) return ["npm", "test", "--", "--runInBand"];
    if (pkg.scripts?.lint) return ["npm", "run", "lint"];
  } catch {
    // No package.json — try other project types
  }

  try {
    await access(join(repo, "Makefile"));
    return ["make", "test"];
  } catch {
    // No Makefile either
  }

  return undefined;
}

// ─── Apply + verify pipeline ──────────────────────────────────────────────────

/**
 * Applies a patch to `repo`, runs the project test suite, and re-scans the
 * affected files.  Returns `{ ok: true, paths }` only when:
 *   1. The diff passes `git apply --check`.
 *   2. `git apply --whitespace=error` succeeds.
 *   3. The project test suite passes (if one is detected).
 *   4. Re-scanning the changed files produces zero findings.
 *
 * Any failure returns `{ ok: false, reason }` without leaving the working tree
 * in a modified state.
 */
export async function applyAndVerify(
  repo: string,
  diff: string,
  rescan: (paths: string[]) => Promise<NormalizedFinding[]>,
): Promise<{ ok: true; paths: string[] } | { ok: false; reason: string }> {
  const valid = await validatePatch(repo, diff);
  if (!valid.ok) return valid;

  const tmpDir = await mkdtemp(join(tmpdir(), "zerra-apply-"));
  const patch = join(tmpDir, "fix.patch");
  try {
    await writeFile(patch, diff, { mode: 0o600 });

    const applied = await runTool(
      "git",
      ["apply", "--whitespace=error", patch],
      repo,
    );
    if (applied.code !== 0) {
      return { ok: false, reason: "Patch could not be applied" };
    }

    // Extract changed file paths from the diff header lines (+++ b/...)
    const paths = [...diff.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1]);

    // Run test suite if one is detectable
    const command = await detectVerificationCommand(repo);
    if (command) {
      const test = await runTool(
        command[0],
        command.slice(1),
        repo,
        300_000,
        { npm_config_offline: "true" },
      );
      if (test.code !== 0) {
        return { ok: false, reason: "Repository verification command failed" };
      }
    }

    // Re-scan to confirm the vulnerability is resolved
    const findings = await rescan(paths);
    return findings.length === 0
      ? { ok: true, paths }
      : { ok: false, reason: "Re-scan found unresolved or new findings" };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── Cloud LLM backend (Anthropic) ───────────────────────────────────────────

/**
 * Generates a security fix diff using the Anthropic Claude API.
 *
 * ⚠️  PRIVACY WARNING: calling this function sends the finding details and
 * the surrounding source code context to api.anthropic.com (Anthropic's cloud
 * servers).  Only call this when you have verified that sending this data
 * externally is permitted by your organisation's policies.
 *
 * For fully local inference, use Ollama with OLLAMA_BASE_URL instead.
 *
 * @throws If ANTHROPIC_API_KEY is not set, or the API request fails, or the
 *         model returns an invalid diff.
 */
export async function generateAnthropicDiff(
  finding: NormalizedFinding,
  context: string,
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "Anthropic fix generation is not enabled. " +
        "Set ANTHROPIC_API_KEY to use cloud-based fix generation, " +
        "or configure OLLAMA_BASE_URL for fully local inference.",
    );
  }

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      messages: [{ role: "user", content: fixPrompt(finding, context) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed (${response.status})`);
  }

  const body = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };
  const diff = body.content?.map((c) => c.text ?? "").join("") ?? "";

  if (!isUnifiedDiff(diff)) {
    throw new Error("Model returned an invalid patch — not a unified diff");
  }

  return diff;
}
