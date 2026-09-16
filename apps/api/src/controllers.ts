import { Controller, Get, HttpCode, Param, Post, Req, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express"; import { scanQueue } from "./queue.js"; import { isPullRequestEvent, verifyGithubSignature } from "./webhook.js";
const Prisma = await import("@prisma/client") as unknown as { PrismaClient: new () => any }; const prisma = new Prisma.PrismaClient();
@Controller() export class HealthController { @Get("health") health() { return { status: "ok" }; } }
@Controller() export class DashboardController {
  @Get("repos") async repos() { const repos=await prisma.repo.findMany({include:{scans:{orderBy:{startedAt:"desc"},take:1}}}); return repos.map((repo:any)=>({id:repo.id,fullName:repo.fullName,defaultBranch:repo.defaultBranch,lastScan:repo.scans[0]??null})); }
  @Get("findings") async findings() { return prisma.finding.findMany({orderBy:{createdAt:"desc"},take:200,include:{scan:{include:{repo:true}},fixAttempts:true}}); }
  @Get("activity") async activity() { return prisma.auditLogEntry.findMany({orderBy:{createdAt:"desc"},take:100}); }
  @Get("scans/:id/sarif") async sarif(@Param("id") id:string) { const scan=await prisma.scan.findUniqueOrThrow({where:{id},include:{findings:true}}); return {version:"2.1.0",$schema:"https://json.schemastore.org/sarif-2.1.0.json",runs:[{tool:{driver:{name:"Zerra",rules:scan.findings.map((f:any)=>({id:f.ruleId,name:f.title,shortDescription:{text:f.title}}))}},results:scan.findings.map((f:any)=>({ruleId:f.ruleId,level:f.severity.toLowerCase(),message:{text:f.description},locations:[{physicalLocation:{artifactLocation:{uri:f.path},region:{startLine:f.line}}}]}))}]}; }
}
@Controller("webhooks") export class WebhookController {
  @Post("github") @HttpCode(200) async github(@Req() req: Request & { rawBody?: Buffer }) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    if (!verifyGithubSignature(raw, req.header("x-hub-signature-256"), process.env.GITHUB_WEBHOOK_SECRET ?? "")) throw new UnauthorizedException("Invalid GitHub webhook signature");
    const deliveryId = req.header("x-github-delivery"); const event = req.header("x-github-event") ?? "unknown";
    if (!deliveryId) throw new UnauthorizedException("Missing GitHub delivery id");
    try { await prisma.processedWebhookDelivery.create({ data: { deliveryId, event } }); } catch { return { accepted: true, duplicate: true }; }
    if (!isPullRequestEvent(event, req.body)) return { accepted: true, ignored: true };
    const p = req.body; const installation = await prisma.installation.upsert({ where: { githubInstallationId: BigInt(p.installation.id) }, update: { accountLogin: p.repository.full_name.split("/")[0] }, create: { githubInstallationId: BigInt(p.installation.id), accountLogin: p.repository.full_name.split("/")[0] } });
    const repo = await prisma.repo.upsert({ where: { githubId: BigInt(p.repository.id) }, update: { fullName: p.repository.full_name, defaultBranch: p.repository.default_branch, installationId: installation.id }, create: { githubId: BigInt(p.repository.id), fullName: p.repository.full_name, defaultBranch: p.repository.default_branch, installationId: installation.id } });
    await scanQueue.add("pull-request", { repoId: repo.id, installationId: installation.id, pullNumber: p.pull_request.number, baseSha: p.pull_request.base.sha, headSha: p.pull_request.head.sha, repository: p.repository.full_name });
    return { accepted: true, duplicate: false };
  }
}
