/**
 * Domain Error Types
 *
 * Typed error hierarchy for consistent error handling across the application.
 * All errors extend AppError for uniform structure.
 */

/**
 * Base application error
 * All custom errors should extend this class.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for logging/API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
    };
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, "NOT_FOUND");
  }
}

/**
 * Authorization/permission error
 */
export class AuthorizationError extends AppError {
  constructor(message = "Not authorized to perform this action") {
    super(message, "UNAUTHORIZED");
  }
}

/**
 * Authentication error (not logged in)
 */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHENTICATED");
  }
}

/**
 * Input validation error
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message, "VALIDATION_ERROR");
  }
}

/**
 * Database operation error
 */
export class DatabaseError extends AppError {
  constructor(operation: string, cause?: unknown) {
    super(`Database operation failed: ${operation}`, "DATABASE_ERROR", cause);
  }
}

/**
 * External service error (Discord, S3, etc.)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, operation: string, cause?: unknown) {
    super(
      `${service} error during ${operation}`,
      "EXTERNAL_SERVICE_ERROR",
      cause,
    );
  }
}

/**
 * Conflict error (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT");
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract error message safely from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}
