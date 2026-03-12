import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import {
  ValidationPipe,
  RequestMethod,
  type INestApplication,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { validateSecurityConfig } from "./config/security.config";
import {
  assertMigrationsApplied,
  resolveCorsOrigins,
  validateRequiredEnvVariables,
} from "./config/startup-checks";
import * as express from "express";
import type { Request, Response, NextFunction } from "express";
import { createCsrfMiddleware } from "./middleware/csrf.middleware";
import { DomainErrorInterceptor } from "./common/interceptors/domain-error.interceptor";
import { SensitiveLoggingInterceptor } from "./common/interceptors/sensitive-logging.interceptor";
import {
  HTTP_LOGGER_TOKEN,
  LOGGER_TOKEN,
} from "./common/logging/logger.module";
import { MetricsMiddleware } from "./common/metrics/metrics.middleware";
import { MetricsGuard } from "./common/metrics/metrics.guard";
import { trace } from "@opentelemetry/api";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { Logger } from "pino";
import { startOtel, shutdownOtel } from "../otel";
import { PrismaService } from "./prisma/prisma.service";

function configureCors(app: INestApplication, allowedOrigins: string[]) {
  const allowedMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
  const allowedHeaders =
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-csrf-token";
  const exposedHeaders = "Location";

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string | undefined;

    if (!origin) {
      if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Methods", allowedMethods);
        res.header("Access-Control-Allow-Headers", allowedHeaders);
        res.header("Access-Control-Expose-Headers", exposedHeaders);
        return res.sendStatus(200);
      }
      return next();
    }

    if (!allowedOrigins.includes(origin)) {
      if (req.method === "OPTIONS") {
        return res.sendStatus(403);
      }
      return res.status(403).json({ message: "Origin not allowed" });
    }

    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", allowedMethods);
    res.header("Access-Control-Allow-Headers", allowedHeaders);
    res.header("Access-Control-Expose-Headers", exposedHeaders);

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    return next();
  });
}

const API_PREFIX = "api/v1";

async function emitOpenApiDocument(app: INestApplication) {
  const { SwaggerModule, DocumentBuilder } = await import("@nestjs/swagger");
  const config = new DocumentBuilder()
    .setTitle("Blueprint API")
    .setVersion("1.0.0")
    .addServer(`/api/v1`)
    .addCookieAuth("access", { type: "apiKey", in: "cookie" })
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const outputDir = "packages/contracts";
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(`${outputDir}/openapi.v1.json`, JSON.stringify(doc, null, 2));
  return doc;
}

async function bootstrap() {
  validateRequiredEnvVariables();
  validateSecurityConfig();
  const corsOrigins = resolveCorsOrigins();

  await startOtel();

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  expressApp.set("trust proxy", 1);
  const logger = app.get<Logger>(LOGGER_TOKEN);
  const httpLogger =
    app.get<(req: Request, res: Response, next: NextFunction) => void>(
      HTTP_LOGGER_TOKEN,
    );
  const metricsMiddleware = app.get(MetricsMiddleware);
  const metricsGuard = app.get(MetricsGuard);

  const prisma = app.get(PrismaService);
  await assertMigrationsApplied(prisma);

  if (httpLogger) {
    app.use(httpLogger);
  }

  app.use(
    (req: Request & { id?: string }, res: Response, next: NextFunction) => {
      const header = req.headers["x-request-id"];
      let requestId = Array.isArray(header) ? header[0] : header;
      if (!requestId) {
        requestId = randomUUID();
        req.headers["x-request-id"] = requestId;
      }
      if (!req.id) {
        req.id = requestId;
      }
      if (typeof res.setHeader === "function") {
        res.setHeader("x-request-id", requestId);
      }
      const span = trace.getActiveSpan();
      if (span) {
        span.setAttribute("request_id", requestId);
      }
      next();
    },
  );

  if (metricsMiddleware) {
    app.use((req: Request, res: Response, next: NextFunction) =>
      metricsMiddleware.use(req, res, next),
    );
  }

  if (metricsGuard) {
    app.useGlobalGuards(metricsGuard);
  }

  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });

  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.url === "/v1" || req.url.startsWith("/v1/")) {
      return next();
    }
    return res.status(410).json({ error: "API version required. Use /api/v1" });
  });

  configureCors(app, corsOrigins);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: { action: "deny" },
      hsts: { includeSubDomains: true, preload: true },
    }),
  );
  app.use(helmet.noSniff());

  app.use(cookieParser(config.getOrThrow<string>("COOKIE_SECRET")));

  app.use(createCsrfMiddleware(config));

  app.use(
    `/${API_PREFIX}/auth`,
    rateLimit({
      windowMs: 10 * 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(
    new SensitiveLoggingInterceptor(),
    new DomainErrorInterceptor(),
  );

  app.use("/uploads", express.static(join(process.cwd(), "uploads")));

  const shouldEmitOpenApi =
    process.env.NODE_ENV !== "production" || process.env.EMIT_OPENAPI === "1";
  if (shouldEmitOpenApi) {
    await emitOpenApiDocument(app);
    if (process.env.EMIT_OPENAPI === "1") {
      process.exit(0);
    }
  }

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  logger?.info(
    {
      event: "api_started",
      port,
      environment: process.env.NODE_ENV ?? "development",
      logLevel: process.env.LOG_LEVEL ?? "info",
      metricsAllowlistConfigured: Boolean(process.env.METRICS_ALLOWLIST),
      metricsBasicAuthEnabled: Boolean(
        process.env.METRICS_USER && process.env.METRICS_PASS,
      ),
      corsOriginCount: corsOrigins.length,
      otelExporterEndpoint:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        "http://localhost:4318/v1/traces",
    },
    "API bootstrap complete",
  );

  const gracefulShutdown = async () => {
    logger?.info("Shutting down API");
    await app.close();
    await shutdownOtel();
  };

  process.once("SIGTERM", gracefulShutdown);
  process.once("SIGINT", gracefulShutdown);
}

bootstrap().catch(async (error) => {
  console.error("Failed to bootstrap API", error);
  await shutdownOtel().catch(() => undefined);
  process.exit(1);
});
