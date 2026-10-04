import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDockerDaemonRunning } from "../src/docker.js";

describe("CLI init", () => {
  it("starts the stack with docker compose and checks the daemon first", () => {
    const source = readFileSync(join(import.meta.dirname, "../src/index.ts"), "utf8");
    expect(source).toContain("compose.yaml");
    expect(source).toContain("isDockerDaemonRunning");
    expect(source).toContain("error(DOCKER_NOT_RUNNING_MESSAGE)");
    expect(source).toContain("process.exit(1)");
    expect(source).toContain('["compose", "-f", composeFile, "up"');
  });
});

describe("isDockerDaemonRunning", () => {
  it("returns false when docker info exits non-zero", () => {
    const run = () => ({ status: 1 });
    expect(isDockerDaemonRunning(run)).toBe(false);
  });

  it("returns false when docker cannot be spawned", () => {
    const run = () => ({ status: null });
    expect(isDockerDaemonRunning(run)).toBe(false);
  });

  it("returns false when the runner throws", () => {
    const run = () => {
      throw new Error("spawn docker ENOENT");
    };
    expect(isDockerDaemonRunning(run)).toBe(false);
  });

  it("returns true only when docker info exits 0", () => {
    const calls: string[][] = [];
    const run = (command: string, args: readonly string[]) => {
      calls.push([command, ...args]);
      return { status: 0 };
    };
    expect(isDockerDaemonRunning(run)).toBe(true);
    expect(calls).toEqual([["docker", "info"]]);
  });
});
