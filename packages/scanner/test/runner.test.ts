import { describe, expect, it, vi } from "vitest"; import { generateSbom, queryOsvBatch } from "../src/runner.js"; import { runTool } from "../src/tools.js"; import { dependencies } from "../src/coverage.js";
vi.mock("../src/tools.js", () => ({ runTool: vi.fn(), changedPathArgs: (paths: string[]) => paths }));
vi.mock("../src/coverage.js", () => ({ dependencies: vi.fn() }));
describe("OSV client", () => { it("uses querybatch", async () => { const f=vi.fn().mockResolvedValue({ok:true,json:async()=>({results:[{vulns:[]} ]})}); vi.stubGlobal("fetch",f); await queryOsvBatch([{package:{name:"x",ecosystem:"npm"},version:"1.0.0"}]); expect(f.mock.calls[0][0]).toBe("https://api.osv.dev/v1/querybatch"); }); });

type Sbom = { artifacts: Array<{ name: string; version: string }>; warning?: string };

describe("generateSbom resilience (#73)", () => {
  it("falls back to manifest parsing when syft is not installed", async () => {
    vi.mocked(runTool).mockRejectedValue(Object.assign(new Error("spawn syft ENOENT"), { code: "ENOENT" }));
    vi.mocked(dependencies).mockResolvedValue([{ name: "left-pad", version: "1.3.0", ecosystem: "npm", manifest: "package.json" }]);
    const out = (await generateSbom("/nonexistent-repo")) as Sbom;
    expect(out.warning).toBeTruthy();
    expect(out.artifacts.map((a) => a.name)).toContain("left-pad");
    expect(out.artifacts.find((a) => a.name === "left-pad")?.version).toBe("1.3.0");
  });

  it("falls back when syft writes non-JSON to stdout", async () => {
    vi.mocked(runTool).mockResolvedValue({ stdout: "Progress: 12% done\n", stderr: "", code: 0 });
    vi.mocked(dependencies).mockResolvedValue([{ name: "requests", version: "2.31.0", ecosystem: "PyPI", manifest: "requirements.txt" }]);
    const out = (await generateSbom("/nonexistent-repo")) as Sbom;
    expect(out.warning).toBeTruthy();
    expect(out.artifacts.map((a) => a.name)).toContain("requests");
  });

  it("returns valid syft JSON unchanged", async () => {
    const payload = { artifacts: [{ name: "from-syft", version: "9.9.9" }] };
    vi.mocked(runTool).mockResolvedValue({ stdout: JSON.stringify(payload), stderr: "", code: 0 });
    expect(await generateSbom("/nonexistent-repo")).toEqual(payload);
    expect(vi.mocked(dependencies)).not.toHaveBeenCalled();
  });
});
