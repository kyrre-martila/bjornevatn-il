"use client";

import { useCallback, useEffect, useState } from "react";
import { createHealthProbeUrl, readBrowserCsrfToken } from "./api";

export type CsrfHook = {
  token: string | null;
  refresh: () => Promise<void>;
};

export function canUseDom(): boolean {
  return typeof window !== "undefined";
}

export function useCsrfToken(): CsrfHook {
  const [token, setToken] = useState<string | null>(null);

  const readToken = useCallback(() => {
    const nextToken = readBrowserCsrfToken();
    setToken(nextToken);
    return nextToken;
  }, []);

  const refresh = useCallback(async () => {
    if (!canUseDom()) {
      setToken(null);
      return;
    }
    try {
      await fetch(createHealthProbeUrl(), { credentials: "include" });
    } catch {
      // ignore network errors
    } finally {
      readToken();
    }
  }, [readToken]);

  useEffect(() => {
    if (canUseDom()) {
      void refresh();
    }
  }, [refresh]);

  return { token, refresh };
}
