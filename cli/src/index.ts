#!/usr/bin/env node
/**
 * Zerra CLI — Local-first security platform command line interface.
 *
 * Commands:
 *   zerra init          Start Zerra (Docker Compose) and open the dashboard
 *   zerra doctor        Check all prerequisites are installed and healthy
 *   zerra scan <path>   Scan a local project path or GitHub URL
 *   zerra vault         Manage credentials in the encrypted vault
 *   zerra logs          Stream logs from the running stack
 *   zerra stop          Stop all Zerra services
 *   zerra update        Pull latest images and restart
 */

import { Command } from "commander";
import { spawnSync, execSync } from "node:child_process";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir, platform } from "node:os";
import { createInterface } from "node:readline";
import { DOCKER_NOT_RUNNING_MESSAGE, isDockerDaemonRunning } from "./docker.js";
import { isGitIdentityConfigured } from "./git.js";

const run = promisify(exec);
const program = new Command();

// ─── Utilities ───────────────────────────────────────────────────────────────

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function info(msg: string)    { console.log(`${GREEN}[zerra]${RESET} ${msg}`); }
function warn(msg: string)    { console.log(`${YELLOW}[warn] ${RESET} ${msg}`); }
function error(msg: string)   { console.error(`${RED}[error]${RESET} ${msg}`); }
function heading(msg: string) { console.log(`\n${CYAN}${BOLD}── ${msg} ──${RESET}`); }
function ok(msg: string)      { console.log(`  ${GREEN}✓${RESET} ${msg}`); }
function fail(msg: string)    { console.log(`  ${RED}✗${RESET} ${msg}`); }

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function openBrowser(url: string): Promise<void> {
  const cmd = platform() === "win32"
    ? `start "" "${url}"`
    : platform() === "darwin"
    ? `open "${url}"`
    : `xdg-open "${url}"`;
  await run(cmd).catch(() => info(`Open: ${url}`));
}

function findComposeFile(): string {
  // Walk up from cwd looking for compose.yaml
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const f = join(dir, "compose.yaml");
    if (existsSync(f)) return f;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  // Fall back to home install
  const homeCompose = join(homedir(), ".zerra", "compose.yaml");
  if (existsSync(homeCompose)) return homeCompose;
  return "compose.yaml";
}

function inferenceUrl(port = 8000) { return `http://localhost:${port}`; }

async function waitForHealth(url: string, timeoutMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  process.stdout.write(`Waiting for ${url}/health `);
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) { process.stdout.write(" ready!\n"); return true; }
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
    process.stdout.write(".");
  }
  process.stdout.write(" timed out!\n");
  return false;
}

// ─── init ─────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Start Zerra services and open the local dashboard")
  .option("--port <port>", "Dashboard port", "3000")
  .option("--no-open", "Don't open browser automatically")
  .action(async (opts) => {
    heading("Starting Zerra");

    const composeFile = findComposeFile();
    const composeDir  = join(composeFile, "..");

    if (!existsSync(composeFile)) {
      error(`compose.yaml not found. Run 'cd /path/to/zerra && zerra init' or install Zerra first.`);
      process.exit(1);
    }

    if (!isDockerDaemonRunning()) {
      error(DOCKER_NOT_RUNNING_MESSAGE);
      process.exit(1);
    }

    const up = spawnSync(
      "docker",
      ["compose", "-f", composeFile, "up", "-d", "--build", "--remove-orphans"],
      { stdio: "inherit", shell: false, cwd: composeDir }
    );
    if (up.status !== 0) {
      error("docker compose up failed. Is Docker running?");
      process.exit(up.status ?? 1);
    }

    const healthy = await waitForHealth(inferenceUrl());
    if (!healthy) {
      warn("Inference API health check failed. Check: docker compose logs inference");
    }

    const url = `http://localhost:${opts.port}`;
    info(`Zerra dashboard: ${BOLD}${url}${RESET}`);

    if (opts.open !== false) {
      await openBrowser(url);
    }
  });

// ─── doctor ──────────────────────────────────────────────────────────────────

program
  .command("doctor")
  .description("Check all prerequisites and service health")
  .action(async () => {
    heading("Zerra Doctor");

    const checks: Array<[string, () => boolean | Promise<boolean>, string]> = [
      ["Docker installed", () => { try { execSync("docker --version", { stdio: "pipe" }); return true; } catch { return false; } }, "https://docs.docker.com/get-docker/"],
      ["Docker daemon running", () => { try { execSync("docker info", { stdio: "pipe" }); return true; } catch { return false; } }, "Start Docker Desktop"],
      ["docker compose available", () => { try { execSync("docker compose version", { stdio: "pipe" }); return true; } catch { return false; } }, "Update Docker Desktop (includes Compose v2)"],
      ["git installed", () => { try { execSync("git --version", { stdio: "pipe" }); return true; } catch { return false; } }, "https://git-scm.com/downloads"],
      ["Node.js 18+", () => { try { const v = execSync("node --version", { encoding: "utf8" }).trim(); return parseInt(v.slice(1)) >= 18; } catch { return false; } }, "https://nodejs.org"],
      ["Zerra inference API", async () => { try { const res = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(2000) }); return res.ok; } catch { return false; } }, "Run: zerra init"],
      ["Zerra gateway", async () => { try { const res = await fetch("http://localhost:8080/health", { signal: AbortSignal.timeout(2000) }); return res.ok || res.status < 500; } catch { return false; } }, "Run: zerra init"],
    ];

    let allOk = true;
    for (const [name, checkFn, hint] of checks) {
      const passed = await checkFn();
      if (passed) {
        ok(name);
      } else {
        fail(`${name} — ${hint}`);
        allOk = false;
      }
    }

    if (isGitIdentityConfigured()) {
      ok("Git user identity configured");
    } else {
      warn(
        'Git user identity is not set. Run:\n' +
        '         git config --global user.name "Your Name"\n' +
        '         git config --global user.email "you@example.com"'
      );
    }

    // Python version
    try {
      const pyVer = execSync("python --version 2>&1 || python3 --version 2>&1", { encoding: "utf8" }).trim();
      ok(`Python: ${pyVer}`);
    } catch {
      warn("Python not found (needed to run the agent without Docker)");
    }

    console.log("");
    if (allOk) {
      info("All checks passed! Zerra is healthy.");
    } else {
      warn("Some checks failed. See hints above.");
      process.exit(1);
    }
  });

// ─── scan ────────────────────────────────────────────────────────────────────

program
  .command("scan [target]")
  .description("Scan a local project path or GitHub repository URL")
  .option("-b, --branch <branch>", "Git branch to scan", "main")
  .option("-m, --mode <mode>", "Scan mode: quick | standard | deep", "standard")
  .option("--api <url>", "Zerra API base URL", "http://localhost:8000")
  .option("--json", "Output results as JSON")
  .action(async (target, opts) => {
    heading("Starting Scan");

    // Default to current directory
    const rawTarget = target ?? process.cwd();
    const isGitUrl = rawTarget.startsWith("https://") || rawTarget.startsWith("git@");
    const repoUrl  = isGitUrl ? rawTarget : resolve(rawTarget);

    info(`Target: ${repoUrl}`);
    info(`Mode:   ${opts.mode}`);
    info(`Branch: ${opts.branch}`);

    let response: Response;
    try {
      response = await fetch(`${opts.api}/v1/queue/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, branch: opts.branch, mode: opts.mode }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err: any) {
      error(`Could not reach Zerra API at ${opts.api}. Is Zerra running? (zerra init)`);
      process.exit(1);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      error(`Scan enqueue failed (HTTP ${response.status}): ${body}`);
      process.exit(1);
    }

    const job = await response.json() as { id: string; status: string };
    info(`Scan job queued: ${BOLD}${job.id}${RESET}`);
    info(`Status: ${job.status}`);
    info(`Track progress at: ${opts.api}/v1/queue/jobs/${job.id}`);
    info(`Dashboard: http://localhost:3000/dashboard/scans`);

    if (opts.json) {
      console.log(JSON.stringify(job, null, 2));
    }
  });

// ─── vault ───────────────────────────────────────────────────────────────────

const vault = program
  .command("vault")
  .description("Manage credentials in the encrypted local vault");

vault
  .command("list")
  .description("List stored credential keys")
  .option("--api <url>", "Zerra API base URL", "http://localhost:8000")
  .action(async (opts) => {
    const res = await fetch(`${opts.api}/v1/vault/keys`).catch(() => null);
    if (!res || !res.ok) { error("Could not reach Zerra API. Is Zerra running?"); process.exit(1); }
    const { keys } = await res.json() as { keys: string[] };
    if (keys.length === 0) {
      info("Vault is empty.");
    } else {
      heading("Stored credential keys (values are never shown)");
      keys.forEach((k: string) => console.log(`  • ${k}`));
    }
  });

vault
  .command("set <key>")
  .description("Store a credential in the vault")
  .option("--api <url>", "Zerra API base URL", "http://localhost:8000")
  .option("--value <value>", "Value (if not supplied, you will be prompted securely)")
  .action(async (key, opts) => {
    let value = opts.value;
    if (!value) {
      process.stdout.write(`Enter value for '${key}' (input hidden): `);
      value = await new Promise<string>((resolve) => {
        process.stdin.setRawMode?.(true);
        process.stdin.resume();
        let buf = "";
        process.stdin.on("data", (ch) => {
          const c = ch.toString();
          if (c === "\r" || c === "\n") { process.stdin.pause(); process.stdout.write("\n"); resolve(buf); }
          else if (c === "\u0003") process.exit(0);
          else { buf += c; }
        });
      });
    }
    const res = await fetch(`${opts.api}/v1/vault/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }).catch(() => null);
    if (!res || !res.ok) { error("Failed to store credential."); process.exit(1); }
    info(`Stored: ${key}`);
  });

vault
  .command("delete <key>")
  .description("Delete a stored credential")
  .option("--api <url>", "Zerra API base URL", "http://localhost:8000")
  .action(async (key, opts) => {
    const res = await fetch(`${opts.api}/v1/vault/keys/${key}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) { error(`Failed to delete '${key}'.`); process.exit(1); }
    info(`Deleted: ${key}`);
  });

vault
  .command("github-token <repo-url>")
  .description("Store a GitHub token scoped to a repository")
  .option("--api <url>", "Zerra API base URL", "http://localhost:8000")
  .action(async (repoUrl, opts) => {
    process.stdout.write(`Enter GitHub token for ${repoUrl}: `);
    const token = await new Promise<string>((resolve) => {
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      let buf = "";
      process.stdin.on("data", (ch) => {
        const c = ch.toString();
        if (c === "\r" || c === "\n") { process.stdin.pause(); process.stdout.write("\n"); resolve(buf); }
        else if (c === "\u0003") process.exit(0);
        else { buf += c; }
      });
    });
    const res = await fetch(`${opts.api}/v1/vault/github-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: repoUrl, token }),
    }).catch(() => null);
    if (!res || !res.ok) { error("Failed to store GitHub token."); process.exit(1); }
    info(`GitHub token stored for ${repoUrl}`);
  });

// ─── logs ────────────────────────────────────────────────────────────────────

program
  .command("logs [service]")
  .description("Stream logs from the Zerra stack (default: all services)")
  .action((service) => {
    const composeFile = findComposeFile();
    const args = ["compose", "-f", composeFile, "logs", "-f", "--tail=50"];
    if (service) args.push(service);
    const proc = spawnSync("docker", args, { stdio: "inherit", shell: false });
    process.exit(proc.status ?? 0);
  });

// ─── stop ──────────────────────────────────────────────────────────────────

program
  .command("stop")
  .description("Stop all Zerra services")
  .action(() => {
    const composeFile = findComposeFile();
    heading("Stopping Zerra");
    const proc = spawnSync("docker", ["compose", "-f", composeFile, "stop"], { stdio: "inherit", shell: false });
    if (proc.status === 0) info("Zerra stopped.");
    process.exit(proc.status ?? 0);
  });

// ─── update ──────────────────────────────────────────────────────────────────

program
  .command("update")
  .description("Pull latest Zerra images and restart")
  .action(() => {
    const composeFile = findComposeFile();
    heading("Updating Zerra");
    spawnSync("git", ["-C", join(composeFile, ".."), "pull", "--ff-only"], { stdio: "inherit" });
    spawnSync("docker", ["compose", "-f", composeFile, "pull"], { stdio: "inherit" });
    const proc = spawnSync(
      "docker", ["compose", "-f", composeFile, "up", "-d", "--build", "--remove-orphans"],
      { stdio: "inherit" }
    );
    if (proc.status === 0) info("Zerra updated and restarted.");
    process.exit(proc.status ?? 0);
  });

// ─── version ─────────────────────────────────────────────────────────────────

program
  .name("zerra")
  .description("Zerra local-first blue-team security platform CLI")
  .version("0.2.0");

program.parseAsync().catch((err) => {
  error(err.message ?? String(err));
  process.exit(1);
});
