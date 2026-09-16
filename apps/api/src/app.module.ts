import { Module } from "@nestjs/common"; import { WebhookController, HealthController } from "./controllers.js";
@Module({ controllers: [WebhookController, HealthController] }) export class AppModule {}
