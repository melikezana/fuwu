type LogContext = Record<string, unknown>;

const redactedValue = "[redacted]";
const sensitiveKeyPattern =
  /(^key$|password|secret|token|authorization|cookie|api[_-]?key|anon[_-]?key|service[_-]?role|private|env|phone|whatsapp|email|e[_-]?mail)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeString(value: string) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}...${redactedValue}@${domain}`;
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length >= 10 && digits.length <= 14) {
    return `${digits.slice(0, 3)}...${redactedValue}${digits.slice(-2)}`;
  }

  if (value.length > 160) {
    return `${value.slice(0, 24)}...${redactedValue}`;
  }

  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value)) {
    return `${value.slice(0, 10)}...${redactedValue}`;
  }

  return value;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[max-depth]";
  }

  if (value instanceof Error) {
    return {
      message: sanitizeString(value.message),
      name: value.name,
    };
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.entries(value).reduce<LogContext>((safeContext, [key, entryValue]) => {
    safeContext[key] = sensitiveKeyPattern.test(key)
      ? redactedValue
      : sanitizeValue(entryValue, depth + 1);

    return safeContext;
  }, {});
}

function createLogPayload(context?: LogContext) {
  if (!context) {
    return undefined;
  }

  return sanitizeValue(context);
}

function canLogToConsole() {
  return process.env.NODE_ENV !== "production";
}

export function logInfo(message: string, context?: LogContext) {
  if (!canLogToConsole()) {
    // TODO: Send sanitized breadcrumbs to Sentry when production monitoring is enabled.
    return;
  }

  console.info(`[Fuwu] ${message}`, createLogPayload(context) ?? "");
}

export function logWarn(message: string, context?: LogContext) {
  if (!canLogToConsole()) {
    // TODO: Send sanitized warning events to Sentry when production monitoring is enabled.
    return;
  }

  console.warn(`[Fuwu] ${message}`, createLogPayload(context) ?? "");
}

export function logError(message: string, context?: LogContext) {
  if (!canLogToConsole()) {
    // TODO: Send sanitized error events to Sentry when production monitoring is enabled.
    return;
  }

  console.error(`[Fuwu] ${message}`, createLogPayload(context) ?? "");
}
