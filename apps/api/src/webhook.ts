import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyGithubSignature(raw: Buffer, signature: string | undefined, secret: string): boolean {
  if (!signature?.startsWith("sha256=") || !secret) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  const actual = Buffer.from(signature); const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}
export function isPullRequestEvent(event: string, body: unknown): body is { action:string; pull_request:{number:number; base:{sha:string}; head:{sha:string}}; repository:{id:number; full_name:string; default_branch:string}; installation:{id:number} } {
  return event === "pull_request" && !!body && typeof body === "object" && ["opened", "synchronize", "reopened"].includes((body as {action?:string}).action ?? "");
}
