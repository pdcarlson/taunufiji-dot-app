/**
 * Test Mock Factory
 *
 * Utilities to create typed mock Repositories and Providers for Unit Testing.
 * Decouples tests from specific implementations (Appwrite/Discord).
 */

import { vi } from "vitest";
import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { IUserRepository } from "@/lib/domain/ports/user.repository";
import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";
import { ILibraryRepository } from "@/lib/domain/ports/library.repository";
import { INotificationProvider } from "@/lib/domain/ports/notification.provider";
import { IIdentityProvider } from "@/lib/domain/ports/identity.provider";

export const MockFactory = {
  createTaskRepository: (): ITaskRepository => ({
    findById: vi.fn(),
    findOpen: vi.fn(),
    findPending: vi.fn(),
    findByAssignee: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findScheduleById: vi.fn(),
    findActiveSchedules: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
  }),

  createUserRepository: (): IUserRepository => ({
    findById: vi.fn(),
    findByAuthId: vi.fn(),
    findByDiscordId: vi.fn(),
    findTopByPoints: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updatePoints: vi.fn(),
    countWithPointsGreaterThan: vi.fn(),
  }),

  createLedgerRepository: (): ILedgerRepository => ({
    findById: vi.fn(),
    findByUser: vi.fn(),
    findMany: vi.fn(),
    getTotalPoints: vi.fn(),
    create: vi.fn(),
  }),

  createLibraryRepository: (): ILibraryRepository => ({
    search: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    exists: vi.fn(),
    getStats: vi.fn(),
    getMetadata: vi.fn(),
    ensureMetadata: vi.fn(),
  }),

  createNotificationProvider: (): INotificationProvider => ({
    sendDM: vi.fn(),
    sendToChannel: vi.fn(),
  }),

  createIdentityProvider: (): IIdentityProvider => ({
    listIdentities: vi.fn(),
    getIdentity: vi.fn(),
    updateName: vi.fn(),
  }),
};
