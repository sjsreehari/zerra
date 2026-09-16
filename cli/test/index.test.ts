import { describe, expect, it } from "vitest"; import { readFileSync } from "node:fs"; import { join } from "node:path";
describe("CLI",()=>{it("uses docker compose and opens setup",()=>{const source=readFileSync(join(import.meta.dirname,"../src/index.ts"),"utf8"); expect(source).toContain("infra/docker-compose.yml"); expect(source).toContain("/setup");});});
