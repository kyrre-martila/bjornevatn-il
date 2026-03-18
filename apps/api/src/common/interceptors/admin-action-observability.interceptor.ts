import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { OperationalEventSeverity } from "@prisma/client";
import { redactErrorForLogs } from "../logging/redaction.util";
import { ObservabilityService } from "../../modules/observability/observability.service";
import {
  getActorFromRequest,
  getContextFromRequest,
} from "../../modules/observability/observability-request.util";

@Injectable()
export class AdminActionObservabilityInterceptor implements NestInterceptor {
  constructor(private readonly observability: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const path = request?.originalUrl || request?.url || "";

    return next.handle().pipe(
      catchError((error: unknown) => {
        if (path.includes("/admin/")) {
          const status =
            error instanceof HttpException ? error.getStatus() : 500;
          void this.observability.logEvent({
            eventType: "admin_action_failed",
            severity:
              status >= 500
                ? OperationalEventSeverity.error
                : OperationalEventSeverity.warn,
            actor: getActorFromRequest(request),
            context: getContextFromRequest(request, "admin"),
            metadata: {
              method: request.method,
              statusCode: status,
              reason:
                error instanceof Error
                  ? String((redactErrorForLogs(error) as { message?: string }).message ?? error.message)
                  : "Unknown admin action failure",
            },
          });
        }

        return throwError(() => error);
      }),
    );
  }
}
