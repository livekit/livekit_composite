import { useRoomInfo } from "@/hooks/use-room-info";
import {
  MuteTrackRequest,
  RemoveParticipantRequest,
  SendDataRequest,
  UpdateParticipantRequest,
  UpdateRoomMetadataRequest,
} from "@/lib/types";
import { useRoomContext } from "@livekit/components-react";
import { useCallback } from "react";
import { useCredentials } from "../use-credentials";
import { useConnectionDetails } from "./use-conn-details";

export const useLivekitAction = () => {
  const room = useRoomContext();
  const { roomName, userId, hidden } = useRoomInfo();
  const { updateConnectionDetails } = useConnectionDetails();
  const { credentials } = useCredentials();

  const handleConnect = useCallback(async () => {
    const url = new URL("/api/token", window.location.origin);
    const response = await fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ roomName, userId, hidden, ...credentials }),
    });

    const connectionDetailsData = await response.json();
    updateConnectionDetails(connectionDetailsData);
  }, [roomName, updateConnectionDetails, userId, hidden, credentials]);

  const handleDisconnect = useCallback(async () => {
    if (room) await room.disconnect();
    updateConnectionDetails(undefined);
  }, [room, updateConnectionDetails]);

  const handleMuteTrack = async (req: MuteTrackRequest) => {
    const url = new URL("/api/room/mute-track", window.location.origin);
    const response = await fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ ...req, ...credentials }),
    });

    if (!response.ok) {
      throw new Error("Failed to mute track");
    }

    return response.json();
  };

  const handleUpdateParticipant = async (req: UpdateParticipantRequest) => {
    const url = new URL("/api/room/update-participant", window.location.origin);
    const response = await fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ ...req, ...credentials }),
    });

    if (!response.ok) {
      throw new Error("Failed to update participant");
    }

    return response.json();
  };

  const handleRemoveParticipant = async (req: RemoveParticipantRequest) => {
    const url = new URL("/api/room/remove-participant", window.location.origin);
    const response = await fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ ...req, ...credentials }),
    });

    if (!response.ok) {
      throw new Error("Failed to remove participant");
    }

    return response.json();
  };

  const handleSendData = async (req: SendDataRequest) => {
    const url = new URL("/api/room/send-data", window.location.origin);
    const response = await fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ ...req, ...credentials }),
    });

    if (!response.ok) {
      throw new Error("Failed to send data");
    }

    return response.json();
  };

  const handleUpdateRoomMetadata = async (req: UpdateRoomMetadataRequest) => {
    const url = new URL("/api/room/update-metadata", window.location.origin);
    const response = await fetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ ...req, ...credentials }),
    });

    if (!response.ok) {
      throw new Error("Failed to update room metadata");
    }

    return response.json();
  };

  return {
    connect: handleConnect,
    disconnect: handleDisconnect,
    muteTrack: handleMuteTrack,
    removeParticipant: handleRemoveParticipant,
    sendData: handleSendData,
    updateRoomMetadata: handleUpdateRoomMetadata,
    updateParticipant: handleUpdateParticipant,
  };
};
