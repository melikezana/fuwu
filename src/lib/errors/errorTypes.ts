import { AppError } from "./AppError";

export const errorCodes = {
  auth: "AUTH_ERROR",
  database: "DATABASE_ERROR",
  notFound: "NOT_FOUND",
  permission: "PERMISSION_ERROR",
  service: "SERVICE_ERROR",
  validation: "VALIDATION_ERROR",
} as const;

export type AppErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

export const publicErrorMessages = {
  auth: "Bu işlem için giriş yapmalısın.",
  database: "İşlem sırasında bir sorun oluştu. Lütfen tekrar dene.",
  notFound: "Kayıt bulunamadı.",
  permission: "Bu alana erişim yetkin yok.",
  service: "İşlem sırasında bir sorun oluştu. Lütfen tekrar dene.",
  validation: "Lütfen bilgileri kontrol edip tekrar dene.",
} as const;

type TypedErrorOptions = {
  cause?: unknown;
  code?: AppErrorCode;
  publicMessage?: string;
  statusCode?: number;
};

export class ValidationError extends AppError {
  constructor(message = "Validation failed.", options: TypedErrorOptions = {}) {
    super(message, {
      cause: options.cause,
      code: options.code ?? errorCodes.validation,
      publicMessage: options.publicMessage ?? publicErrorMessages.validation,
      statusCode: options.statusCode ?? 400,
    });
  }
}

export class AuthError extends AppError {
  constructor(message = "Authentication required.", options: TypedErrorOptions = {}) {
    super(message, {
      cause: options.cause,
      code: options.code ?? errorCodes.auth,
      publicMessage: options.publicMessage ?? publicErrorMessages.auth,
      statusCode: options.statusCode ?? 401,
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database operation failed.", options: TypedErrorOptions = {}) {
    super(message, {
      cause: options.cause,
      code: options.code ?? errorCodes.database,
      publicMessage: options.publicMessage ?? publicErrorMessages.database,
      statusCode: options.statusCode ?? 500,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Record was not found.", options: TypedErrorOptions = {}) {
    super(message, {
      cause: options.cause,
      code: options.code ?? errorCodes.notFound,
      publicMessage: options.publicMessage ?? publicErrorMessages.notFound,
      statusCode: options.statusCode ?? 404,
    });
  }
}

export class PermissionError extends AppError {
  constructor(message = "Permission denied.", options: TypedErrorOptions = {}) {
    super(message, {
      cause: options.cause,
      code: options.code ?? errorCodes.permission,
      publicMessage: options.publicMessage ?? publicErrorMessages.permission,
      statusCode: options.statusCode ?? 403,
    });
  }
}
