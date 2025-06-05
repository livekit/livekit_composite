import { DataPacket_Kind, SendDataOptions, UpdateParticipantOptions } from "livekit-server-sdk";

export interface UpdateRoomMetadataRequest {
  roomName: string;
  metadata: string;
}

export interface RemoveParticipantRequest {
  roomName: string;
  identity: string;
}

export interface MuteTrackRequest {
  roomName: string;
  identity: string;
  trackSid: string;
  muted: boolean;
}

export interface UpdateParticipantRequest {
  roomName: string;
  identity: string;
  options: UpdateParticipantOptions;
}

export interface SendDataRequest {
  roomName: string;
  data: Uint8Array;
  kind: DataPacket_Kind;
  options: SendDataOptions;
}

// Re-export other relevant types if needed
export * from "./livekit-utils";
