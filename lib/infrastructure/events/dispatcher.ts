import { logger } from "@/lib/utils/logger";
import {
  DomainEvents,
  LibraryUploadedEvent,
  TaskApprovedEvent,
} from "./events";
import { initDomainEvents } from "./init";

export { DomainEvents };
export type { LibraryUploadedEvent, TaskApprovedEvent };

type EventHandler<T = any> = (payload: T) => Promise<void>;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Register a handler for an event.
   */
  public subscribe<T>(event: string, handler: EventHandler<T>) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)?.push(handler);
  }

  /**
   * Dispatch an event to all subscribers Synchronously (awaited).
   * We await generic handlers to ensure side effects (Points) complete
   * before the Server Action returns to the UI.
   */

  public async publish<T>(event: string, payload: T) {
    // Lazy init to ensure handlers are subscribed before we dispatch
    initDomainEvents();

    const subscribers = this.handlers.get(event) || [];

    if (subscribers.length > 0) {
      logger.log(
        `[EventBus] Publishing ${event} to ${subscribers.length} handlers.`,
      );
    }

    // Execute all handlers in parallel, but await completion
    await Promise.all(
      subscribers.map(async (handler) => {
        // We propagate errors so the caller (Action) knows something failed.
        await handler(payload);
      }),
    );
  }
}

export const DomainEventBus = new EventBus();
