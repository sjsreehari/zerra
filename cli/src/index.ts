#!/usr/bin/env node
import { Command } from "commander"; import { spawnSync } from "node:child_process"; import { exec } from "node:child_process"; import { promisify } from "node:util";
const run=promisify(exec); const program=new Command();
async function open(url:string) { const command=process.platform==="win32"?`start "" "${url}"`:process.platform==="darwin"?`open "${url}"`:`xdg-open "${url}"`; await run(command); }
program.name("zerra").description("Zerra secure onboarding CLI");
program.command("init").option("--port <port>","dashboard port","3000").action(async ({port})=>{ const compose=spawnSync("docker",["compose","-f","infra/docker-compose.yml","up","-d","--build"],{stdio:"inherit",shell:false}); if(compose.status!==0) process.exit(compose.status??1); const url=`http://localhost:${Number(port)}/setup`; await open(url); console.log(`Zerra setup opened at ${url}`); });
program.parseAsync().catch(error=>{ console.error(error.message); process.exit(1); });
