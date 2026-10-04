import { execSync } from "node:child_process";

type GitConfigRunner = (command: string) => string;

/** Whether Git can resolve a non-empty user name and email in this directory. */
export function isGitIdentityConfigured(
  run: GitConfigRunner = (command) => execSync(command, { encoding: "utf8", stdio: "pipe" })
): boolean {
  try {
    return Boolean(
      run("git config user.name").trim() && run("git config user.email").trim()
    );
  } catch {
    return false;
  }
}
