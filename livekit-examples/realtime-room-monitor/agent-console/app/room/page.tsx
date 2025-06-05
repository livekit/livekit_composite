"use client";

import { CredentialSettings } from "@/components/credential-settings";
import LK from "@/components/lk";
import { ThemeSwitch } from "@/components/theme-switch";
import { useConnectionDetails } from "@/hooks/use-livekit";
import { useRoomInfo } from "@/hooks/use-room-info";
import { LivekitEventInstrumentor } from "@/providers/LivekitEventInstrumentor";
import { LiveKitRoom } from "@livekit/components-react";
import { MediaDeviceFailure } from "livekit-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ConsoleContainer } from "../_components/console-container";

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { connectionDetails, updateConnectionDetails } = useConnectionDetails();
  const { setRoomName, setUserId } = useRoomInfo();

  const roomId = searchParams.get("roomId");
  const userId = searchParams.get("userId");

  useEffect(() => {
    if (!roomId || !userId) {
      router.push("/");
    } else {
      setRoomName(roomId);
      setUserId(userId);
    }
  }, [roomId, userId, router, setRoomName, setUserId]);

  return (
    <main className="h-full w-full bg-accent">
      <LiveKitRoom
        className="w-full h-full flex flex-col"
        token={connectionDetails?.participantToken}
        serverUrl={connectionDetails?.serverUrl}
        connect={connectionDetails !== undefined}
        audio={true}
        video={false}
        onMediaDeviceFailure={onDeviceFailure}
        onDisconnected={() => {
          updateConnectionDetails(undefined);
        }}
      >
        <LivekitEventInstrumentor>
          <div className="flex flex-row justify-between items-center p-3 px-2 pb-1">
            <LK />
            <div className="flex flex-row gap-2">
              <CredentialSettings />
              <ThemeSwitch />
            </div>
          </div>
          <div className="flex-1 p-2">
            <ConsoleContainer className="h-full shadow-sm rounded-md bg-background" />
          </div>
        </LivekitEventInstrumentor>
      </LiveKitRoom>
    </main>
  );
}

function onDeviceFailure(error?: MediaDeviceFailure) {
  console.error(error);
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}
