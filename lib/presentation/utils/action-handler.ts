import { getContainer, Container } from "@/lib/infrastructure/container";
import { createJWTClient } from "@/lib/presentation/server/appwrite";
import { Models } from "node-appwrite";

interface AppwriteAccountClient {
  get: () => Promise<Models.User<Models.Preferences>>;
}

export type ActionContext = {
  container: Container;
  userId: string; // Auth ID when authenticated; empty string for public actions without JWT.
  account: AppwriteAccountClient | null; // Appwrite account client, not the user model
};

type ActionOptions = {
  jwt?: string;
  allowedRoles?: string[]; // If provided, strictly enforces one of these roles
  public?: boolean; // If true, skip Brother verification
  actionName?: string;
};

export type ActionErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INSUFFICIENT_ROLE"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "UNKNOWN_ERROR";

export type ActionResult<T> =
  | { success: true; data: T; error?: never; errorCode?: never }
  | { success: false; data?: never; error: string; errorCode: ActionErrorCode };

export type ActionFailure = Extract<ActionResult<unknown>, { success: false }>;

/**
 * Maps thrown/returned errors to ActionErrorCode.
 * Prefers structured errors (object with code property). Legacy fallback uses
 * message string fragments:
 * - Authentication: "authentication required", "no jwt", "unauthenticated"
 * - Authorization: "unauthorized", "insufficient permissions", "verified brother"
 * - Validation: "invalid", "missing", "not found"
 * - Database: "database operation failed"
 * - External: "discord", "s3", "fetch failed", "external service"
 * TODO: Migrate callers to throw errors with explicit code property.
 */
function classifyActionError(error: unknown): ActionErrorCode {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "UNAUTHENTICATED") return "AUTHENTICATION_REQUIRED";
    if (code === "UNAUTHORIZED") return "INSUFFICIENT_ROLE";
    if (code === "VALIDATION_ERROR" || code === "NOT_FOUND") {
      return "VALIDATION_ERROR";
    }
    if (code === "DATABASE_ERROR") return "DATABASE_ERROR";
    if (code === "EXTERNAL_SERVICE_ERROR") return "EXTERNAL_SERVICE_ERROR";
  }

  // Legacy: message-based fallback
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  if (
    message.includes("authentication required") ||
    message.includes("no jwt") ||
    message.includes("unauthenticated")
  ) {
    return "AUTHENTICATION_REQUIRED";
  }

  if (
    message.includes("unauthorized") ||
    message.includes("insufficient permissions") ||
    message.includes("verified brother")
  ) {
    return "INSUFFICIENT_ROLE";
  }

  if (
    message.includes("invalid") ||
    message.includes("missing") ||
    message.includes("not found")
  ) {
    return "VALIDATION_ERROR";
  }

  if (message.includes("database operation failed")) {
    return "DATABASE_ERROR";
  }

  if (
    message.includes("discord") ||
    message.includes("s3") ||
    message.includes("fetch failed") ||
    message.includes("external service")
  ) {
    return "EXTERNAL_SERVICE_ERROR";
  }

  return "UNKNOWN_ERROR";
}

/**
 * Standardized Wrapper for Server Actions
 * Handles:
 * 1. Authentication (Session or JWT)
 * 2. Dependency Injection (Container)
 * 3. Authorization (RBAC)
 * 4. Error Handling
 */
export async function actionWrapper<T>(
  /**
   * `ctx.userId` is an authenticated Appwrite user ID when a JWT is present.
   * For public actions without JWT, it is an empty string and must be handled.
   */
  action: (ctx: ActionContext) => Promise<T>,
  options: ActionOptions = {},
): Promise<ActionResult<T>> {
  try {
    // 1. Authentication
    let account: AppwriteAccountClient | null = null;
    if (options.jwt) {
      const client = createJWTClient(options.jwt);
      account = client.account;
    }

    if (!options.jwt && !options.public) {
      throw new Error("Authentication Required: No JWT provided.");
    }

    // When options.jwt is absent (public action), we intentionally skip account.get()
    // and keep `user` as null; auth-dependent checks below are gated by options.public.
    let user: Models.User<Models.Preferences> | null = null;
    if (options.jwt && account) {
      user = await account.get();
    }

    const { authService } = getContainer();

    // 2. Global Authorization (Brother Check)
    // Skip if public option is set
    if (!options.public) {
      if (!user) throw new Error("Unauthorized: User not found.");
      const isBrother = await authService.verifyBrother(user.$id);
      if (!isBrother) {
        throw new Error("Unauthorized Access: You are not a verified Brother.");
      }
    }

    // 3. Role-Based Authorization
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      if (!user) throw new Error("Unauthorized: User required for role check.");
      const hasRole = await authService.verifyRole(
        user.$id,
        options.allowedRoles,
      );
      if (!hasRole) {
        throw new Error("Unauthorized Access: Insufficient Permissions.");
      }
    }

    // 4. Execution
    const container = getContainer();
    // For public actions without JWT, userId is intentionally an empty string.
    const userId = user ? user.$id : "";
    // account here is the Appwrite account client used for account.get()
    const data = await action({ container, userId, account });

    return { success: true, data };
  } catch (error) {
    const actionLabel = options.actionName || "unknown-action";
    console.error(`Action Failed [${actionLabel}]`, error);
    const errorCode = classifyActionError(error);
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: msg, errorCode };
  }
}
