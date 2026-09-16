import { describe, expect, it } from "vitest"; import { isUnifiedDiff } from "../src/index.js";
describe("patch validation", () => { it("only permits a proper unified diff", () => { expect(isUnifiedDiff("diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-x\n+y\n")).toBe(true); expect(isUnifiedDiff("replace the file")).toBe(false); }); });
