import { Queue } from "bullmq"; import { Redis } from "ioredis"; import type { ScanJob } from "@zerra/schema";
const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
export const scanQueue = new Queue<ScanJob>("scan", { connection, defaultJobOptions: { attempts: 4, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 1000 } });
export const notificationQueue = new Queue("notification", { connection, defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 1000 } } });
