import { logger } from "@/lib/utils/logger";
import {
  LibraryEvents,
  LibraryUploadedEvent,
  TaskEventMap,
  TaskEvents,
  TaskApprovedEvent,
} from "@/lib/domain/events";
import { initDomainEvents } from "./init";

export { LibraryEvents, TaskEvents };
export type { LibraryUploadedEvent, TaskApprovedEvent };

type EventPayloads = TaskEventMap & {
  [LibraryEvents.LIBRARY_UPLOADED]: LibraryUploadedEvent;
};

type EventKey = keyof EventPayloads;
type EventHandler<K extends EventKey> = (payload: EventPayloads[K]) => Promise<void>;
type GenericEventHandler = (payload: EventPayloads[EventKey]) => Promise<void>;

class EventBus {
  private handlers = new Map<EventKey, GenericEventHandler[]>();

  /**
   * Register a handler for an event.
   */
  public subscribe<TEvent extends EventKey>(
    event: TEvent,
    handler: EventHandler<TEvent>,
  ) {
    const eventHandlers = this.handlers.get(event) ?? [];
    eventHandlers.push(handler as GenericEventHandler);
    this.handlers.set(event, eventHandlers);
  }

  /**
   * Dispatch an event to all subscribers Synchronously (awaited).
   * We await generic handlers to ensure side effects (Points) complete
   * before the Server Action returns to the UI.
   */

  public async publish<TEvent extends EventKey>(
    event: TEvent,
    payload: EventPayloads[TEvent],
  ) {
    // Lazy init to ensure handlers are subscribed before we dispatch
    initDomainEvents();

    const subscribers = (this.handlers.get(event) ??
      []) as EventHandler<TEvent>[];

    if (subscribers.length > 0) {
      logger.log(
        `[EventBus] Publishing ${event} to ${subscribers.length} handlers.`,
      );
    }

    const settledResults = await Promise.allSettled(
      subscribers.map((handler) => handler(payload)),
    );

    const rejectedResults = settledResults.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    if (rejectedResults.length === 1) {
      throw rejectedResults[0].reason;
    }

    if (rejectedResults.length > 1) {
      throw new AggregateError(
        rejectedResults.map((result) => result.reason),
        `Event "${event}" had ${rejectedResults.length} handler failures.`,
      );
    }
  }
}

export const DomainEventBus = new EventBus();
