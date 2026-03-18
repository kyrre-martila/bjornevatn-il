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
import { AdminActionObservabilityInterceptor } from "./common/interceptors/admin-action-observability.interceptor";
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
import { OperationalEventSeverity } from "@prisma/client";
import { startOtel, shutdownOtel } from "../otel";
import { PrismaService } from "./prisma/prisma.service";
import { API_PREFIX } from "./config/api-prefix";
import { ObservabilityService } from "./modules/observability/observability.service";
import {
  createOpenApiDocument,
  writeCanonicalOpenApiDocument,
} from "./openapi/openapi-document";

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

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createRateLimiter(input: {
  windowMs: number;
  limit: number;
  message: string;
  endpointCategory: string;
  route: string;
  logger: Logger;
  observability: ObservabilityService;
}) {
  return rateLimit({
    windowMs: input.windowMs,
    limit: input.limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip ?? req.socket.remoteAddress ?? "unknown",
    message: { error: input.message },
    handler: (req, res, _next, options) => {
      const requestIdHeader = req.headers["x-request-id"];
      const requestId =
        (req as Request & { id?: string }).id ||
        (Array.isArray(requestIdHeader)
          ? requestIdHeader[0]
          : requestIdHeader) ||
        null;

      void input.observability.logEvent({
        eventType: "rate_limit_triggered",
        severity: OperationalEventSeverity.warn,
        context: {
          requestId,
          route: input.route,
          module: "security",
        },
        metadata: {
          endpointCategory: input.endpointCategory,
          method: req.method,
          limit: options.limit,
          windowMs: input.windowMs,
          clientAddressCaptured: Boolean(req.ip ?? req.socket.remoteAddress),
        },
      });

      input.logger.warn(
        {
          rateLimitEvent: {
            endpointCategory: input.endpointCategory,
            route: input.route,
            method: req.method,
            requestId,
          },
        },
        "Rate limit triggered",
      );

      res.status(options.statusCode).json(options.message);
    },
  });
}

async function emitOpenApiDocument(app: INestApplication) {
  const outputPath = "packages/contracts/openapi.v1.json";
  const document = createOpenApiDocument(app);
  writeCanonicalOpenApiDocument(document, outputPath);
  return document;
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
  const observability = app.get(ObservabilityService);

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
    createRateLimiter({
      windowMs: envInt("RATE_LIMIT_AUTH_WINDOW_MS", 10 * 60 * 1000),
      limit: envInt("RATE_LIMIT_AUTH_LIMIT", 100),
      message: "Too many authentication attempts. Please try again later.",
      endpointCategory: "auth",
      route: `/${API_PREFIX}/auth`,
      logger,
      observability,
    }),
  );

  app.use(
    `/${API_PREFIX}/clubhouse/bookings`,
    createRateLimiter({
      windowMs: envInt(
        "RATE_LIMIT_PUBLIC_SUBMISSION_WINDOW_MS",
        10 * 60 * 1000,
      ),
      limit: envInt("RATE_LIMIT_CLUBHOUSE_BOOKINGS_LIMIT", 10),
      message: "Too many submissions. Please wait before trying again.",
      endpointCategory: "clubhouse_booking",
      route: `/${API_PREFIX}/clubhouse/bookings`,
      logger,
      observability,
    }),
  );
  app.use(
    `/${API_PREFIX}/membership/applications`,
    createRateLimiter({
      windowMs: envInt(
        "RATE_LIMIT_PUBLIC_SUBMISSION_WINDOW_MS",
        10 * 60 * 1000,
      ),
      limit: envInt("RATE_LIMIT_MEMBERSHIP_APPLICATIONS_LIMIT", 8),
      message: "Too many submissions. Please wait before trying again.",
      endpointCategory: "membership_application",
      route: `/${API_PREFIX}/membership/applications`,
      logger,
      observability,
    }),
  );
  app.use(
    `/${API_PREFIX}/tickets/orders`,
    createRateLimiter({
      windowMs: envInt(
        "RATE_LIMIT_PUBLIC_SUBMISSION_WINDOW_MS",
        10 * 60 * 1000,
      ),
      limit: envInt("RATE_LIMIT_TICKET_ORDER_CREATE_LIMIT", 20),
      message: "Too many ticket requests. Please try again in a few minutes.",
      endpointCategory: "ticket_order_creation",
      route: `/${API_PREFIX}/tickets/orders`,
      logger,
      observability,
    }),
  );

  app.use(
    `/${API_PREFIX}/tickets/orders`,
    createRateLimiter({
      windowMs: envInt("RATE_LIMIT_ORDER_LOOKUP_WINDOW_MS", 10 * 60 * 1000),
      limit: envInt("RATE_LIMIT_ORDER_LOOKUP_LIMIT", 40),
      message: "Too many order lookups. Please wait before trying again.",
      endpointCategory: "public_order_lookup",
      route: `/${API_PREFIX}/tickets/orders`,
      logger,
      observability,
    }),
  );

  app.use(
    createRateLimiter({
      windowMs: envInt("RATE_LIMIT_GLOBAL_WINDOW_MS", 15 * 60 * 1000),
      limit: envInt("RATE_LIMIT_GLOBAL_LIMIT", 1000),
      message: "Too many requests. Please try again later.",
      endpointCategory: "global",
      route: "global",
      logger,
      observability,
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
    new AdminActionObservabilityInterceptor(observability),
  );

  app.use(
    "/uploads",
    express.static(join(process.cwd(), "uploads"), {
      maxAge: "30d",
      etag: true,
      immutable: true,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
        res.setHeader(
          "Surrogate-Control",
          "public, max-age=2592000, stale-while-revalidate=60",
        );
      },
    }),
  );

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
