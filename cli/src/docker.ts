import { spawnSync, type SpawnSyncReturns } from "node:child_process";

export const DOCKER_NOT_RUNNING_MESSAGE =
  "Docker is not running. Please start Docker Desktop and try again.";

type DockerInfoResult = Pick<SpawnSyncReturns<string>, "status">;

export type DockerInfoRunner = (
  command: string,
  args: readonly string[],
  options: { stdio: "pipe"; shell: false; encoding: "utf8" }
) => DockerInfoResult;

/** True only when `docker info` can talk to a running daemon. */
export function isDockerDaemonRunning(run: DockerInfoRunner = spawnSync): boolean {
  try {
    const result = run("docker", ["info"], {
      stdio: "pipe",
      shell: false,
      encoding: "utf8",
    });
    return result.status === 0;
  } catch {
    return false;
  }
}
