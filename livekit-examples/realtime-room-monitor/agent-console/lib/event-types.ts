import {
  ChatMessage,
  ConnectionQuality,
  ConnectionState,
  DataPacket_Kind,
  DisconnectReason,
  LocalParticipant,
  LocalTrackPublication,
  Participant,
  ParticipantKind,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  SubscriptionError,
  Track,
  TrackPublication,
  TranscriptionSegment,
} from "livekit-client";
import { ParticipantPermission } from "livekit-server-sdk";

export type EventMap = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => void;
};

export enum EventLevel {
  Info = "info",
  Warn = "warn",
  Error = "error",
}

export enum EventSource {
  System = "system",
  Client = "client",
  Server = "server",
}

export type RoomEventCallbacks = {
  connected: () => void;
  reconnecting: () => void;
  signalReconnecting: () => void;
  reconnected: () => void;
  disconnected: (reason?: DisconnectReason) => void;
  connectionStateChanged: (state: ConnectionState) => void;
  mediaDevicesChanged: () => void;
  participantConnected: (participant: RemoteParticipant) => void;
  participantDisconnected: (participant: RemoteParticipant) => void;
  trackPublished: (publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  trackSubscribed: (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => void;
  trackSubscriptionFailed: (
    trackSid: string,
    participant: RemoteParticipant,
    reason?: SubscriptionError
  ) => void;
  trackUnpublished: (publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  trackUnsubscribed: (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => void;
  trackMuted: (publication: TrackPublication, participant: Participant) => void;
  trackUnmuted: (publication: TrackPublication, participant: Participant) => void;
  localTrackPublished: (publication: LocalTrackPublication, participant: LocalParticipant) => void;
  localTrackUnpublished: (
    publication: LocalTrackPublication,
    participant: LocalParticipant
  ) => void;
  localAudioSilenceDetected: (publication: LocalTrackPublication) => void;
  participantMetadataChanged: (
    metadata: string | undefined,
    participant: RemoteParticipant | LocalParticipant
  ) => void;
  participantNameChanged: (name: string, participant: RemoteParticipant | LocalParticipant) => void;
  participantPermissionsChanged: (
    prevPermissions: ParticipantPermission | undefined,
    participant: RemoteParticipant | LocalParticipant
  ) => void;
  participantAttributesChanged: (
    changedAttributes: Record<string, string>,
    participant: RemoteParticipant | LocalParticipant
  ) => void;
  activeSpeakersChanged: (speakers: Array<Participant>) => void;
  roomMetadataChanged: (metadata: string) => void;
  dataReceived: (
    payload: Uint8Array,
    participant?: RemoteParticipant,
    kind?: DataPacket_Kind,
    topic?: string
  ) => void;
  sipDTMFReceived: (dtmf: unknown, participant?: RemoteParticipant) => void;
  transcriptionReceived: (
    transcription: TranscriptionSegment[],
    participant?: Participant,
    publication?: TrackPublication
  ) => void;
  connectionQualityChanged: (quality: ConnectionQuality, participant: Participant) => void;
  mediaDevicesError: (error: Error) => void;
  trackStreamStateChanged: (
    publication: RemoteTrackPublication,
    streamState: Track.StreamState,
    participant: RemoteParticipant
  ) => void;
  trackSubscriptionPermissionChanged: (
    publication: RemoteTrackPublication,
    status: TrackPublication.PermissionStatus,
    participant: RemoteParticipant
  ) => void;
  trackSubscriptionStatusChanged: (
    publication: RemoteTrackPublication,
    status: TrackPublication.SubscriptionStatus,
    participant: RemoteParticipant
  ) => void;
  audioPlaybackChanged: (playing: boolean) => void;
  videoPlaybackChanged: (playing: boolean) => void;
  signalConnected: () => void;
  recordingStatusChanged: (recording: boolean) => void;
  participantEncryptionStatusChanged: (encrypted: boolean, participant?: Participant) => void;
  encryptionError: (error: Error) => void;
  dcBufferStatusChanged: (isLow: boolean, kind: DataPacket_Kind) => void;
  activeDeviceChanged: (kind: MediaDeviceKind, deviceId: string) => void;
  chatMessage: (message: ChatMessage, participant?: RemoteParticipant | LocalParticipant) => void;
  localTrackSubscribed: (publication: LocalTrackPublication, participant: LocalParticipant) => void;
  metricsReceived: (metrics: unknown, participant?: Participant) => void;
};

export const isAgent = (participant: Participant) => {
  return participant.kind === ParticipantKind.AGENT;
};

export const getDisconnectReason = (reason: DisconnectReason | undefined) => {
  switch (reason) {
    case DisconnectReason.UNKNOWN_REASON:
      return "Unknown disconnect reason";
    case DisconnectReason.CLIENT_INITIATED:
      return "Client intentionally disconnected";
    case DisconnectReason.DUPLICATE_IDENTITY:
      return "Duplicate participant identity";
    case DisconnectReason.SERVER_SHUTDOWN:
      return "Server is shutting down";
    case DisconnectReason.PARTICIPANT_REMOVED:
      return "Participant was removed by host";
    case DisconnectReason.ROOM_DELETED:
      return "Room was deleted by host";
    case DisconnectReason.STATE_MISMATCH:
      return "Session state mismatch (attempted to resume unknown session)";
    case DisconnectReason.JOIN_FAILURE:
      return "Failed to establish connection";
    case DisconnectReason.MIGRATION:
      return "Connection migration required by server";
    case DisconnectReason.SIGNAL_CLOSE:
      return "Network connection lost (signal channel closed)";
    case DisconnectReason.ROOM_CLOSED:
      return "Room closed automatically (no active participants)";
    case DisconnectReason.USER_UNAVAILABLE:
      return "User did not respond";
    case DisconnectReason.USER_REJECTED:
      return "Call declined by user";
    case DisconnectReason.SIP_TRUNK_FAILURE:
      return "SIP system error (protocol failure)";
    default:
      return "Unknown connection issue";
  }
};

export const getSubscriptionError = (error: SubscriptionError | undefined) => {
  switch (error) {
    case SubscriptionError.SE_CODEC_UNSUPPORTED:
      return "Codec unsupported";
    case SubscriptionError.SE_TRACK_NOTFOUND:
      return "Track not found";
    default:
      return "Unknown subscription error";
  }
};

export const roomEventCallbackData = {
  connected: () => ({}),
  reconnecting: () => ({}),
  signalReconnecting: () => ({}),
  reconnected: () => ({}),
  disconnected: (reason?: DisconnectReason) => ({
    reason: getDisconnectReason(reason),
    code: reason,
  }),
  connectionStateChanged: (state: ConnectionState) => ({ state }),
  mediaDevicesChanged: () => ({}),
  participantConnected: (participant: RemoteParticipant) => ({
    participant,
  }),
  participantDisconnected: (participant: RemoteParticipant) => ({
    participant,
  }),
  trackPublished: (publication: RemoteTrackPublication, participant: RemoteParticipant) => ({
    publication,
    participant,
  }),
  trackSubscribed: (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => ({
    track,
    publication,
    participant,
  }),
  trackSubscriptionFailed: (
    trackSid: string,
    participant: RemoteParticipant,
    reason?: SubscriptionError
  ) => ({
    trackSid,
    participant,
    reason: getSubscriptionError(reason),
    code: reason,
  }),
  trackUnpublished: (publication: RemoteTrackPublication, participant: RemoteParticipant) => ({
    publication,
    participant,
  }),
  trackUnsubscribed: (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => ({
    track,
    publication,
    participant,
  }),
  trackMuted: (publication: TrackPublication, participant: Participant) => ({
    publication,
    participant,
  }),
  trackUnmuted: (publication: TrackPublication, participant: Participant) => ({
    publication,
    participant,
  }),
  localTrackPublished: (publication: LocalTrackPublication, participant: LocalParticipant) => ({
    publication,
    participant,
  }),
  localTrackUnpublished: (publication: LocalTrackPublication, participant: LocalParticipant) => ({
    publication,
    participant,
  }),
  localAudioSilenceDetected: (publication: LocalTrackPublication) => ({
    publication,
  }),
  participantMetadataChanged: (
    metadata: string | undefined,
    participant: RemoteParticipant | LocalParticipant
  ) => ({
    participant,
    metadata,
  }),
  participantNameChanged: (
    name: string | undefined,
    participant: RemoteParticipant | LocalParticipant
  ) => ({
    participant,
    name,
  }),
  participantPermissionsChanged: (
    prevPermissions: ParticipantPermission | undefined,
    participant: RemoteParticipant | LocalParticipant
  ) => ({
    participant,
    prevPermissions,
  }),
  participantAttributesChanged: (
    changedAttributes: Record<string, string>,
    participant: RemoteParticipant | LocalParticipant
  ) => ({
    participant,
    changedAttributes,
  }),
  activeSpeakersChanged: (speakers: Array<Participant>) => ({
    speakers,
  }),
  roomMetadataChanged: (metadata: string) => ({
    metadata,
  }),
  dataReceived: (
    payload: Uint8Array,
    participant?: RemoteParticipant,
    kind?: DataPacket_Kind,
    topic?: string
  ) => ({
    payload,
    participant,
    kind,
    topic,
  }),
  sipDTMFReceived: (dtmf: unknown, participant?: RemoteParticipant) => ({
    dtmf,
    participant,
  }),
  transcriptionReceived: (
    transcription: TranscriptionSegment[],
    participant?: Participant,
    publication?: TrackPublication
  ) => ({
    transcription,
    participant,
    publication,
  }),
  connectionQualityChanged: (quality: ConnectionQuality, participant: Participant) => ({
    quality,
    participant,
  }),
  mediaDevicesError: (error: Error) => ({
    error,
  }),
  trackStreamStateChanged: (
    publication: RemoteTrackPublication,
    streamState: Track.StreamState,
    participant: RemoteParticipant
  ) => ({
    publication,
    streamState,
    participant,
  }),
  trackSubscriptionPermissionChanged: (
    publication: RemoteTrackPublication,
    status: TrackPublication.PermissionStatus,
    participant: RemoteParticipant
  ) => ({
    publication,
    status,
    participant,
  }),
  trackSubscriptionStatusChanged: (
    publication: RemoteTrackPublication,
    status: TrackPublication.SubscriptionStatus,
    participant: RemoteParticipant
  ) => ({
    publication,
    status,
    participant,
  }),
  audioPlaybackChanged: (playing: boolean) => ({
    playing,
  }),
  videoPlaybackChanged: (playing: boolean) => ({
    playing,
  }),
  signalConnected: () => ({}),
  recordingStatusChanged: (recording: boolean) => ({
    recording,
  }),
  participantEncryptionStatusChanged: (encrypted: boolean, participant?: Participant) => ({
    participant,
    encrypted,
  }),
  encryptionError: (error: Error) => ({
    error,
  }),
  dcBufferStatusChanged: (isLow: boolean, kind: DataPacket_Kind) => ({
    isLow,
    kind,
  }),
  activeDeviceChanged: (kind: MediaDeviceKind, deviceId: string) => ({
    deviceType: kind,
    deviceId,
  }),
  chatMessage: (message: ChatMessage, participant?: RemoteParticipant | LocalParticipant) => ({
    message,
    participant,
  }),
  localTrackSubscribed: (publication: LocalTrackPublication, participant: LocalParticipant) => ({
    publication,
    participant,
  }),
  metricsReceived: (metrics: unknown, participant?: Participant) => ({
    metrics,
    participant,
  }),
};

export type RoomEventCallbackData = typeof roomEventCallbackData;
