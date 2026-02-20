import { getContainer, Container } from "@/lib/infrastructure/container";
import {
  createJWTClient,
} from "@/lib/presentation/server/appwrite";

type ActionContext = {
  container: Container;
  userId: string; // The authenticated Appwrite Auth ID
  account: any;
};

type ActionOptions = {
  jwt?: string;
  allowedRoles?: string[];
  public?: boolean;
};

export type ActionResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string };

/**
 * Standardized Wrapper for Server Actions
 * Handles:
 * 1. Authentication (Session or JWT)
 * 2. Dependency Injection (Container)
 * 3. Authorization (RBAC)
 * 4. Error Handling (Catch-All)
 */
export async function safeAction<T>(
  action: (ctx: ActionContext) => Promise<T>,
  options: ActionOptions = {},
): Promise<ActionResult<T>> {
  try {
    const container = getContainer();
    let account;
    let userId = "";

    // 1. Authentication
    // If public, we might skip auth, but usually we still want the container.
    // Assuming all our actions currently need auth based on existing code.
    if (!options.public) {
      if (options.jwt) {
        const client = createJWTClient(options.jwt);
        account = client.account;
      } else {
        throw new Error("Authentication Required: No JWT provided.");
      }

      const user = await account.get();
      userId = user.$id;

      // 2. Global Authorization (Brother Check)
      // Every action requires at least "Verified Brother" status unless public
      const isBrother = await container.authService.verifyBrother(userId);
      if (!isBrother) {
        throw new Error("Unauthorized Access: You are not a verified Brother.");
      }

      // 3. Role-Based Authorization
      if (options.allowedRoles && options.allowedRoles.length > 0) {
        const hasRole = await container.authService.verifyRole(
          userId,
          options.allowedRoles,
        );
        if (!hasRole) {
          throw new Error("Unauthorized Access: Insufficient Permissions.");
        }
      }
    }

    // 4. Execution
    const data = await action({ container, userId, account });

    return { success: true, data };
  } catch (error) {
    console.error("Action Failed:", error);
    // Unmask the error for debugging, but in prod we might want to be safer.
    // For now, we return the message.
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: msg };
  }
}
