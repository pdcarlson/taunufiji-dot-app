import { getContainer, Container } from "@/lib/infrastructure/container";
import {
  createSessionClient,
  createJWTClient,
} from "@/lib/presentation/server/appwrite";

type ActionContext = {
  container: Container;
  userId: string; // The authenticated Appwrite Auth ID (not necessarily Profile ID)
  account: any;
};

type ActionOptions = {
  jwt?: string;
  allowedRoles?: string[]; // If provided, strictly enforces one of these roles
  public?: boolean; // If true, skip Brother verification
};

/**
 * Standardized Wrapper for Server Actions
 * Handles:
 * 1. Authentication (Session or JWT)
 * 2. Dependency Injection (Container)
 * 3. Authorization (RBAC)
 * 4. Error Handling
 */
export async function actionWrapper<T>(
  action: (ctx: ActionContext) => Promise<T>,
  options: ActionOptions = {},
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    // 1. Authentication
    let account;
    if (options.jwt) {
      const client = createJWTClient(options.jwt);
      account = client.account;
    } else {
      const session = await createSessionClient();
      account = session.account;
    }

    const user = await account.get();
    const { authService } = getContainer();

    // 2. Global Authorization (Brother Check)
    // Skip if public option is set
    if (!options.public) {
      const isBrother = await authService.verifyBrother(user.$id);
      if (!isBrother) {
        throw new Error("Unauthorized Access: You are not a verified Brother.");
      }
    }

    // 3. Role-Based Authorization
    if (options.allowedRoles && options.allowedRoles.length > 0) {
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
    const data = await action({ container, userId: user.$id, account });

    return { success: true, data };
  } catch (error) {
    console.error("Action Failed:", error);
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: msg };
  }
}
