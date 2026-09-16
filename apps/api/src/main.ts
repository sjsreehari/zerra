import "reflect-metadata"; import { NestFactory } from "@nestjs/core"; import { json } from "express"; import { AppModule } from "./app.module.js";
const app = await NestFactory.create(AppModule, { rawBody: true }); app.use(json({ limit: "2mb" })); await app.listen(Number(process.env.API_PORT ?? 3001));
