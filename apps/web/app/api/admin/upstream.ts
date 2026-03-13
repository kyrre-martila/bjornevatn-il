import { NextResponse } from "next/server";
import { buildForwardHeaders, getApiBase } from "./utils";

type JsonMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type JsonProxyOptions = {
  method?: JsonMethod;
  request?: Request;
  query?: URLSearchParams;
  errorMessage: string;
  includeJsonContentType?: boolean;
  cache?: RequestCache;
};

export async function proxyAdminJson(
  path: string,
  {
    method = "GET",
    request,
    query,
    errorMessage,
    includeJsonContentType,
    cache,
  }: JsonProxyOptions,
) {
  const headers = buildForwardHeaders(includeJsonContentType ?? method !== "GET");
  const queryString = query && query.size > 0 ? `?${query.toString()}` : "";

  const init: RequestInit = {
    method,
    headers,
    cache,
  };

  if (request && method !== "GET") {
    init.body = await request.text();
  }

  const res = await fetch(`${getApiBase()}${path}${queryString}`, init);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(data ?? { error: errorMessage }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}
