import { IDomainEventPublisher } from "@/lib/domain/ports/domain-event.publisher.port";
import { LibraryEvents } from "@/lib/domain/events";
import { DomainEventBus } from "./dispatcher";

export class AppwriteDomainEventPublisher implements IDomainEventPublisher {
  async publishLibraryUploaded(
    payload: Parameters<IDomainEventPublisher["publishLibraryUploaded"]>[0],
  ): Promise<void> {
    await DomainEventBus.publish(LibraryEvents.LIBRARY_UPLOADED, payload);
  }
}
