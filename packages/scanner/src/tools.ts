import { spawn } from "node:child_process";
import { safeRelativePath } from "./security.js";

export interface ToolResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Safely executes a binary or CLI command without shell interpolation.
 */
export async function runTool(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = 120_000,
  env?: NodeJS.ProcessEnv,
): Promise<ToolResult> {
  args.forEach((a) => {
    if (a.includes("\0")) {
      throw new Error("NUL byte in command argument");
    }
  });

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      stdout += d;
    });

    child.stderr.on("data", (d) => {
      stderr += d;
    });

    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

export function changedPathArgs(paths: string[]): string[] {
  return paths.map(safeRelativePath);
}
