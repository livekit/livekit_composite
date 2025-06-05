import { useLogger } from "@/hooks/use-logger";
import { EventRegistry, eventRegistryConfig } from "@/lib/event-definitions";
import { roomEventCallbackData, RoomEventCallbackData } from "@/lib/event-types";
import { useRoomContext } from "@livekit/components-react";
import { useEffect } from "react";

const roomEventCallbackDataValues = Object.entries(roomEventCallbackData).filter(
  ([eventType, _]) => {
    return eventType in eventRegistryConfig;
  }
) as [keyof EventRegistry, RoomEventCallbackData[keyof RoomEventCallbackData]][];

interface LivekitEventInstrumentorProps {
  children: React.ReactNode;
}

export const LivekitEventInstrumentor = ({ children }: LivekitEventInstrumentorProps) => {
  const room = useRoomContext();
  const { appendLog } = useLogger();

  useEffect(() => {
    const roomEventCallbacks = roomEventCallbackDataValues.map(([eventType, callback]) => {
      const pipeDataToLogger = (...params) => {
        const data = callback(...params);
        appendLog(eventType, data);
      };

      return {
        eventType,
        callback: pipeDataToLogger,
      };
    }) as {
      eventType: keyof EventRegistry;
      callback: (...params: Parameters<RoomEventCallbackData[keyof RoomEventCallbackData]>) => void;
    }[];

    roomEventCallbacks.forEach(({ eventType, callback }) => {
      console.log("eventType", eventType);
      room.on(eventType, callback);
    });

    return () => {
      roomEventCallbacks.forEach(({ eventType, callback }) => {
        room.off(eventType, callback);
      });
    };
  }, [room]);

  return children;
};
