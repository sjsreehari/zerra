import { describe,it,expect } from "vitest"; import { scanIac,reachable } from "../src/coverage.js";
describe("coverage",()=>{it("detects IaC exposures and usage",()=>{expect(scanIac("Dockerfile","ENV API_SECRET=x")).toHaveLength(1);expect(reachable("import express from 'express'","express")).toBe(true);});});
