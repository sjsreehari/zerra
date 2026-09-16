import { Module } from "@nestjs/common"; import { WebhookController, HealthController, DashboardController } from "./controllers.js";
@Module({ controllers: [WebhookController, HealthController, DashboardController] }) export class AppModule {}
