export type AppErrorOptions = {
  cause?: unknown;
  code: string;
  publicMessage: string;
  statusCode: number;
};

export class AppError extends Error {
  readonly code: string;
  readonly isOperational = true;
  readonly publicMessage: string;
  readonly statusCode: number;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.code = options.code;
    this.publicMessage = options.publicMessage;
    this.statusCode = options.statusCode;

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}
