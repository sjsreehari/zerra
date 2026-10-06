import { describe, expect, it, vi } from "vitest"; import { queryOsvBatch } from "../src/runner.js";
describe("OSV client", () => { it("uses querybatch", async () => { const f=vi.fn().mockResolvedValue({ok:true,json:async()=>({results:[{vulns:[]} ]})}); vi.stubGlobal("fetch",f); await queryOsvBatch([{package:{name:"x",ecosystem:"npm"},version:"1.0.0"}]); expect(f.mock.calls[0][0]).toBe("https://api.osv.dev/v1/querybatch"); }); });

describe("SBOM failures", () => {
  it.each(["missing", "malformed", "nonzero"])("falls back to direct manifests when Syft is %s", async (failure) => {
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const { generateSbom } = await import("../src/runner.js");
    const tools = await import("../src/tools.js");
    const run = vi.spyOn(tools, "runTool");
    if (failure === "missing") run.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
    else run.mockResolvedValue({ code: failure === "nonzero" ? 1 : 0, stdout: "not JSON", stderr: "diagnostic" });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const repo = await mkdtemp(join(tmpdir(), "zerra-sbom-"));
    try {
      await writeFile(join(repo, "package.json"), JSON.stringify({ dependencies: { example: "1.2.3" } }));
      const result = await generateSbom(repo) as { artifacts: { name: string; version: string }[]; warnings: string[] };
      expect(result.artifacts).toEqual([expect.objectContaining({ name: "example", version: "1.2.3" })]);
      expect(result.warnings[0]).toMatch(/transitive/);
      expect(warning).toHaveBeenCalledOnce();
    } finally {
      run.mockRestore();
      warning.mockRestore();
      await rm(repo, { recursive: true, force: true });
    }
  });
});


describe("successful SBOM", () => {
  it("preserves Syft output without invoking fallback warnings", async () => {
    const { generateSbom } = await import("../src/runner.js");
    const tools = await import("../src/tools.js");
    const expected = { artifacts: [{name: "resolved", version: "2.0.0"}], descriptor: {name: "syft"} };
    const run = vi.spyOn(tools, "runTool").mockResolvedValue({code: 0, stdout: JSON.stringify(expected), stderr: ""});
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(await generateSbom("unused")).toEqual(expected);
      expect(warning).not.toHaveBeenCalled();
    } finally {
      run.mockRestore();
      warning.mockRestore();
    }
  });
});
