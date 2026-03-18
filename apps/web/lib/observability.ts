type ServerTimingInput = {
  flow: string;
  route: string;
  module: string;
  metadata?: Record<string, unknown>;
};

export async function measureServerTiming<T>(
  input: ServerTimingInput,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await operation();
    console.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        eventType: "request_timed",
        severity: "info",
        context: {
          route: input.route,
          module: input.module,
        },
        metadata: {
          ...input.metadata,
          flow: input.flow,
          durationMs: Date.now() - startedAt,
        },
      }),
    );
    return result;
  } catch (error) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        eventType: "request_timed",
        severity: "error",
        context: {
          route: input.route,
          module: input.module,
        },
        metadata: {
          ...input.metadata,
          flow: input.flow,
          durationMs: Date.now() - startedAt,
          failed: true,
          reason:
            error instanceof Error ? error.message : "Server timing failed",
        },
      }),
    );
    throw error;
  }
}
