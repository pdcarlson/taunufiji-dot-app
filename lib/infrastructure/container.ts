import "server-only";
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
import { ILibraryRepository } from "@/lib/domain/ports/library.repository";
import { INotificationProvider } from "@/lib/domain/ports/notification.provider";
import { IIdentityProvider } from "@/lib/domain/ports/identity.provider";
import { IStorageService } from "@/lib/domain/ports/storage.service.port";
import { IDutyService } from "@/lib/domain/ports/services/duty.service.port";
import { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import { AppwriteTaskRepository } from "./persistence/task.repository";
import { AppwriteUserRepository } from "./persistence/user.repository";
import { AppwriteLedgerRepository } from "./persistence/ledger.repository";
import { AppwriteLibraryRepository } from "./persistence/library.repository";
import { DiscordProvider } from "./messaging/discord.provider";
import { AppwriteIdentityProvider } from "./auth/appwrite.identity";
import { S3StorageService } from "./storage/storage";

import {
  DutyService,
  ScheduleService,
  QueryService,
  MaintenanceService,
  AdminService,
} from "@/lib/application/services/housing";
import { PointsService } from "@/lib/application/services/ledger";
import { UserService, AuthService } from "@/lib/application/services/identity";
import { LibraryService } from "@/lib/application/services/library";

// ...

export interface Container {
  taskRepository: ITaskRepository;
  userRepository: IUserRepository;
  ledgerRepository: ILedgerRepository;
  libraryRepository: ILibraryRepository;
  notificationProvider: INotificationProvider;
  identityProvider: IIdentityProvider;
  storageService: IStorageService;
  // Services
  userService: UserService;
  dutyService: IDutyService;
  pointsService: IPointsService;
  authService: AuthService;
  scheduleService: ScheduleService;
  queryService: QueryService;
  maintenanceService: MaintenanceService;
  adminService: AdminService;
  libraryService: LibraryService;
}

// Singleton container instance
let container: Container | null = null;

/**
 * Get the dependency container
 * Lazily initializes the container with default implementations on first call.
 */
export function getContainer(): Container {
  if (!container) {
    // 1. Repositories
    const taskRepository = new AppwriteTaskRepository();
    const userRepository = new AppwriteUserRepository();
    const ledgerRepository = new AppwriteLedgerRepository();
    const libraryRepository = new AppwriteLibraryRepository();

    // 2. Providers
    const notificationProvider = new DiscordProvider();
    const identityProvider = new AppwriteIdentityProvider();
    const storageService = new S3StorageService();

    // 3. Services (Order matters!)
    const userService = new UserService(userRepository);
    const authService = new AuthService(userRepository, identityProvider);
    const dutyService = new DutyService(taskRepository);
    const pointsService = new PointsService(userRepository, ledgerRepository);
    const scheduleService = new ScheduleService(taskRepository);
    const queryService = new QueryService(taskRepository, userRepository);
    const maintenanceService = new MaintenanceService(
      taskRepository,
      dutyService,
    );
    const adminService = new AdminService(taskRepository, scheduleService);
    const libraryService = new LibraryService(
      libraryRepository,
      storageService,
    );

    container = {
      taskRepository,
      userRepository,
      ledgerRepository,
      libraryRepository,
      notificationProvider,
      identityProvider,
      storageService,
      // Services
      userService,
      dutyService,
      pointsService,
      authService,
      scheduleService,
      queryService,
      maintenanceService,
      adminService,
      libraryService,
    };
  }
  return container!;
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
