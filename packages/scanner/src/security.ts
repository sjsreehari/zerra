const SAFE_PATH = /^(?!-)[a-zA-Z0-9_./@:+,=~\\-]+$/;
const SAFE_REF = /^(?!-)[A-Za-z0-9][A-Za-z0-9._/-]{0,254}$/;

export function safeRepositoryUrl(value: string): string {
  const allowed = /^(https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?|git@github\.com:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git)$/;
  if (!allowed.test(value)) throw new Error("Repository URL must be a GitHub HTTPS or SSH URL");
  return value;
}
export function safeGitRef(value: string): string { if (!SAFE_REF.test(value)) throw new Error("Unsafe git ref"); return value; }
export function safeRelativePath(value: string): string {
  if (!SAFE_PATH.test(value) || value.includes("..") || value.startsWith("/")) throw new Error("Unsafe relative path");
  return value;
}
