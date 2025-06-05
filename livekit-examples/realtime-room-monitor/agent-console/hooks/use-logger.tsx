import { EventRegistry, eventRegistryConfig } from "@/lib/event-definitions";
import { createEventRegistry } from "@/lib/event-registry";

const registry = createEventRegistry<EventRegistry>(eventRegistryConfig);

export const { useLogger, renderEventLog, getEventLevel, getEventMessage } = registry;

export type LogEntry = ReturnType<typeof useLogger.getState>["logs"][number];
