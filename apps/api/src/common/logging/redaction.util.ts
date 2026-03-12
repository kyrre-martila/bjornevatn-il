const REDACTED_VALUE = "[REDACTED]";
const MAX_DEPTH = 10;

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /api[-_]?key/i,
  /credential/i,
  /session/i,
  /csrf/i,
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function shouldRedactKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}


function isSensitiveString(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return (
    /^(Bearer|Basic)\s+/i.test(trimmed) ||
    /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(trimmed) ||
    /^[-_a-zA-Z0-9]{24,}$/.test(trimmed)
  );
}

function redactCookieString(cookieHeader: string): string {
  const cookiePairs = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  if (cookiePairs.length === 0) {
    return REDACTED_VALUE;
  }

  return cookiePairs
    .map((pair) => {
      const separator = pair.indexOf("=");
      if (separator === -1) {
        return REDACTED_VALUE;
      }
      const cookieName = pair.slice(0, separator).trim();
      return `${cookieName}=${REDACTED_VALUE}`;
    })
    .join("; ");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return REDACTED_VALUE;
  }

  if (value == null) {
    return REDACTED_VALUE;
  }

  if (Array.isArray(value)) {
    return value.map(() => REDACTED_VALUE);
  }

  if (typeof value === "object") {
    return REDACTED_VALUE;
  }

  return REDACTED_VALUE;
}

export function redactSensitiveData(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) {
    return "[MAX_DEPTH_REACHED]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, depth + 1));
  }

  if (typeof value === "string") {
    return isSensitiveString(value) ? REDACTED_VALUE : value;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitizedEntries = Object.entries(value).map(([key, currentValue]) => {
    if (shouldRedactKey(key)) {
      if (/cookie/i.test(key) && typeof currentValue === "string") {
        return [key, redactCookieString(currentValue)];
      }
      return [key, redactValue(currentValue)];
    }

    return [key, redactSensitiveData(currentValue, depth + 1)];
  });

  return Object.fromEntries(sanitizedEntries);
}

export function redactErrorForLogs(err: unknown): unknown {
  if (err instanceof Error) {
    const enumerableErrorProps = redactSensitiveData(
      Object.fromEntries(Object.entries(err as Error & Record<string, unknown>)),
    ) as Record<string, unknown>;

    return {
      ...enumerableErrorProps,
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...("cause" in err
        ? { cause: redactSensitiveData((err as Error & { cause?: unknown }).cause) }
        : {}),
    };
  }

  return redactSensitiveData(err);
}

export function getRedactedValuePlaceholder(): string {
  return REDACTED_VALUE;
}
