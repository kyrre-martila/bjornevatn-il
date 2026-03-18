import type { Request } from "express";
import type {
  ObservabilityActorContext,
  ObservabilityRouteContext,
} from "./observability.service";

export function getActorFromRequest(
  req?: Request,
): ObservabilityActorContext | undefined {
  const user = (req as Request & { user?: { id?: string; role?: string } })
    ?.user;
  if (!user?.id && !user?.role) {
    return undefined;
  }

  return {
    id: user.id ?? null,
    role: user.role ?? null,
    type: user.id ? "user" : null,
  };
}

export function getContextFromRequest(
  req?: Request,
  moduleName?: string,
): ObservabilityRouteContext {
  const requestIdHeader = req?.headers?.["x-request-id"];
  const requestId =
    (req as Request & { id?: string })?.id ||
    (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) ||
    null;

  const routePath =
    (req as Request & { route?: { path?: string } })?.route?.path ||
    req?.originalUrl ||
    req?.url ||
    null;

  return {
    requestId,
    route: routePath,
    module: moduleName ?? null,
  };
}
