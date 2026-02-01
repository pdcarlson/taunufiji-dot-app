/**
 * Dependency Injection Container
 *
 * Provides a centralized place to wire up all dependencies.
 * Services should use getContainer() to access repositories instead of
 * creating them directly. This enables easy testing through setContainer().
 *
 * Usage:
 *   const { taskRepository, userRepository } = getContainer();
 *   const task = await taskRepository.findById('123');
 *
 * Testing:
 *   setContainer({ taskRepository: mockTaskRepository });
 */

import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { IUserRepository } from "@/lib/domain/ports/user.repository";
import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";
import { AppwriteTaskRepository } from "./persistence/task.repository";
import { AppwriteUserRepository } from "./persistence/user.repository";
import { AppwriteLedgerRepository } from "./persistence/ledger.repository";
import { ILibraryRepository } from "@/lib/domain/ports/library.repository";
import { AppwriteLibraryRepository } from "./persistence/library.repository";
import { INotificationProvider } from "@/lib/domain/ports/notification.provider";
import { DiscordProvider } from "./messaging/discord.provider";
import { IIdentityProvider } from "@/lib/domain/ports/identity.provider";
import { AppwriteIdentityProvider } from "./auth/appwrite.identity";

// ...

export interface Container {
  taskRepository: ITaskRepository;
  userRepository: IUserRepository;
  ledgerRepository: ILedgerRepository;
  libraryRepository: ILibraryRepository;
  notificationProvider: INotificationProvider;
  identityProvider: IIdentityProvider;
}

// Singleton container instance
let container: Container | null = null;

/**
 * Get the dependency container
 * Lazily initializes the container with default implementations on first call.
 */
export function getContainer(): Container {
  if (!container) {
    container = {
      taskRepository: new AppwriteTaskRepository(),
      userRepository: new AppwriteUserRepository(),
      ledgerRepository: new AppwriteLedgerRepository(),
      libraryRepository: new AppwriteLibraryRepository(),
      notificationProvider: new DiscordProvider(),
      identityProvider: new AppwriteIdentityProvider(),
    };
  }
  return container;
}

/**
 * Override container dependencies (for testing)
 *
 * @example
 * ```typescript
 * // In test setup
 * setContainer({
 *   taskRepository: mockTaskRepository,
 * });
 *
 * // In test teardown
 * resetContainer();
 * ```
 */
export function setContainer(overrides: Partial<Container>): void {
  container = { ...getContainer(), ...overrides };
}

/**
 * Reset container to null (forces re-initialization)
 * Useful in test teardown to ensure clean state.
 */
export function resetContainer(): void {
  container = null;
}
