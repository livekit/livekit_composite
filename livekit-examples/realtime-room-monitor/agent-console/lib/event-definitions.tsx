import { ConnectionQuality, DataPacket_Kind, isLocalParticipant } from "livekit-client";
import { defineEvent, renderJson } from "./event-registry";
import { EventLevel, EventSource, isAgent, RoomEventCallbackData } from "./event-types";

type RoomEventReturn<T extends keyof RoomEventCallbackData> = ReturnType<RoomEventCallbackData[T]>;

export const eventRegistryConfig = {
  connected: defineEvent<RoomEventReturn<"connected">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: "You are connected to the room",
  }),
  reconnecting: defineEvent<RoomEventReturn<"reconnecting">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: "You are reconnecting to the room",
  }),
  signalReconnecting: defineEvent<RoomEventReturn<"signalReconnecting">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: "You are reconnecting to the room",
  }),
  reconnected: defineEvent<RoomEventReturn<"reconnected">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: "You have reconnected to the room",
  }),
  disconnected: defineEvent<RoomEventReturn<"disconnected">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ reason, code }) =>
      `You have disconnected from the room with code ${code} because "${reason}"`,
    render: ({ reason, code }) => renderJson({ reason, code }),
  }),
  connectionStateChanged: defineEvent<RoomEventReturn<"connectionStateChanged">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ state }) => `Your connection state has changed to ${state}`,
    render: ({ state }) => renderJson({ state }),
  }),
  mediaDevicesChanged: defineEvent<RoomEventReturn<"mediaDevicesChanged">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: "Your media devices have changed",
  }),
  participantConnected: defineEvent<RoomEventReturn<"participantConnected">>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ participant }) =>
      isAgent(participant)
        ? `An agent "${participant.identity}" has joined the room`
        : `A new remote participant "${participant.identity}" has joined the room`,
    render: ({ participant }) => renderJson({ participant }),
  }),
  participantDisconnected: defineEvent<RoomEventReturn<"participantDisconnected">>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ participant }) =>
      isAgent(participant)
        ? `An agent "${participant.identity}" has left the room`
        : `A remote participant "${participant.identity}" has left the room`,
    render: ({ participant }) => renderJson({ participant }),
  }),
  trackPublished: defineEvent<RoomEventReturn<"trackPublished">>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ publication, participant }) =>
      isAgent(participant)
        ? `An agent "${participant.identity}" has published a ${publication.kind} track from ${publication.source} source`
        : `A remote participant "${participant.identity}" has published a ${publication.kind} track from ${publication.source} source`,
    render: ({ publication, participant }) => renderJson({ publication, participant }),
  }),
  trackSubscribed: defineEvent<RoomEventReturn<"trackSubscribed">>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ track, participant }) =>
      `${participant.identity} subscribed to ${track.source} track`,
    render: ({ track, publication, participant }) =>
      renderJson({ track, publication, participant }),
  }),
  trackSubscriptionFailed: defineEvent<RoomEventReturn<"trackSubscriptionFailed">>({
    level: EventLevel.Error,
    source: EventSource.Server,
    message: ({ trackSid, reason, participant }) =>
      `Track subscription from ${participant.identity} failed for ${trackSid}: ${reason}`,
    render: ({ trackSid, participant, reason }) => renderJson({ trackSid, participant, reason }),
  }),
  trackUnpublished: defineEvent<RoomEventReturn<"trackUnpublished">>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ publication, participant }) =>
      `${participant.identity} unpublished ${publication.kind} track`,
    render: ({ publication, participant }) => renderJson({ publication, participant }),
  }),
  trackUnsubscribed: defineEvent<RoomEventReturn<"trackUnsubscribed">>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ track, participant }) =>
      `Unsubscribed from ${track.source} track by ${participant.identity}`,
    render: ({ track, publication, participant }) =>
      renderJson({ track, publication, participant }),
  }),
  trackMuted: defineEvent<RoomEventReturn<"trackMuted">>({
    level: EventLevel.Warn,
    source: ({ participant }) =>
      isLocalParticipant(participant) ? EventSource.Client : EventSource.Server,
    message: ({ publication, participant }) =>
      isAgent(participant)
        ? `Agent ${participant.identity} muted ${publication.kind} track`
        : `Participant ${participant.identity} muted ${publication.kind} track`,
    render: ({ publication, participant }) => renderJson({ publication, participant }),
  }),
  trackUnmuted: defineEvent<RoomEventReturn<"trackUnmuted">>({
    level: EventLevel.Info,
    source: ({ participant }) =>
      isLocalParticipant(participant) ? EventSource.Client : EventSource.Server,
    message: ({ publication, participant }) =>
      isAgent(participant)
        ? `Agent ${participant.identity} unmuted ${publication.kind} track`
        : `Participant ${participant.identity} unmuted ${publication.kind} track`,
    render: ({ publication, participant }) => renderJson({ publication, participant }),
  }),
  localTrackPublished: defineEvent<RoomEventReturn<"localTrackPublished">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ publication }) =>
      `Published local ${publication.kind} track from ${publication.source}`,
    render: ({ publication, participant }) => renderJson({ publication, participant }),
  }),
  localTrackUnpublished: defineEvent<RoomEventReturn<"localTrackUnpublished">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ publication }) =>
      `Unpublished local ${publication.kind} track from ${publication.source}`,
    render: ({ publication, participant }) => renderJson({ publication, participant }),
  }),
  localAudioSilenceDetected: defineEvent<RoomEventReturn<"localAudioSilenceDetected">>({
    level: EventLevel.Warn,
    source: EventSource.Client,
    message: ({ publication }) =>
      `Local audio silence detected for ${publication.kind} track from ${publication.source}`,
    render: ({ publication }) => renderJson({ publication }),
  }),
  participantMetadataChanged: defineEvent<RoomEventReturn<"participantMetadataChanged">>({
    level: EventLevel.Info,
    source: EventSource.System,
    message: ({ metadata, participant }) =>
      `${
        isLocalParticipant(participant)
          ? "Your"
          : isAgent(participant)
          ? `An agent "${participant.identity}"`
          : `A participant "${participant.identity}"`
      } metadata has changed from "${metadata}"`,
    render: ({ metadata, participant }) => renderJson({ metadata, participant }),
  }),
  participantNameChanged: defineEvent<RoomEventReturn<"participantNameChanged">>({
    level: EventLevel.Info,
    source: EventSource.System,
    message: ({ name, participant }) =>
      `${
        isLocalParticipant(participant)
          ? "Your"
          : isAgent(participant)
          ? `An agent "${participant.identity}"`
          : `A participant "${participant.identity}"`
      } name has changed to ${name}`,
    render: ({ name, participant }) => renderJson({ name, participant }),
  }),
  participantPermissionsChanged: defineEvent<RoomEventReturn<"participantPermissionsChanged">>({
    level: EventLevel.Info,
    source: EventSource.System,
    message: ({ participant }) =>
      `${
        isLocalParticipant(participant)
          ? "Your"
          : isAgent(participant)
          ? `An agent "${participant.identity}"`
          : `A participant "${participant.identity}"`
      } permissions have changed`,
    render: ({ prevPermissions, participant }) => renderJson({ prevPermissions, participant }),
  }),
  participantAttributesChanged: defineEvent<RoomEventReturn<"participantAttributesChanged">>({
    level: EventLevel.Info,
    source: EventSource.System,
    message: ({ changedAttributes, participant }) =>
      `${
        isLocalParticipant(participant)
          ? "Your"
          : isAgent(participant)
          ? `An agent "${participant.identity}"`
          : `A participant "${participant.identity}"`
      } attributes have changed to ${JSON.stringify(changedAttributes)}`,
    render: ({ changedAttributes, participant }) => renderJson({ changedAttributes, participant }),
  }),
  roomMetadataChanged: defineEvent<RoomEventReturn<"roomMetadataChanged">>({
    level: EventLevel.Info,
    source: EventSource.System,
    message: ({ metadata }) => `Room metadata has changed to ${metadata}`,
    render: ({ metadata }) => renderJson({ metadata }),
  }),
  dataReceived: defineEvent<RoomEventReturn<"dataReceived">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ payload, kind, participant, topic }) =>
      `Received data packet (${DataPacket_Kind[kind!]}, ${payload.length} bytes) from ${
        participant?.identity
      } on topic ${topic}`,
    render: ({ payload, participant, kind, topic }) =>
      renderJson({ payload, participant, kind, topic }),
  }),
  sipDTMFReceived: defineEvent<RoomEventReturn<"sipDTMFReceived">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ dtmf, participant }) => `Received DTMF from ${participant?.identity}: ${dtmf}`,
    render: ({ dtmf, participant }) => renderJson({ dtmf, participant }),
  }),
  transcriptionReceived: defineEvent<RoomEventReturn<"transcriptionReceived">>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ transcription, participant }) =>
      `Transcription received from ${participant?.identity}: ${transcription
        .map((t) => t.text)
        .join("")}`,
    render: ({ transcription, participant, publication }) =>
      renderJson({ transcription, participant, publication }),
  }),
  chatMessage: defineEvent<RoomEventReturn<"chatMessage">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ message }) => `Chat: ${message.message}`,
    render: ({ message, participant }) => renderJson({ ...message, participant }),
  }),
  connectionQualityChanged: defineEvent<RoomEventReturn<"connectionQualityChanged">>({
    level: ({ quality }) =>
      quality === ConnectionQuality.Excellent ? EventLevel.Info : EventLevel.Warn,
    source: EventSource.Server,
    message: ({ quality, participant }) => `${participant.identity} connection quality: ${quality}`,
    render: ({ quality, participant }) => renderJson({ quality, participant }),
  }),
  mediaDevicesError: defineEvent<RoomEventReturn<"mediaDevicesError">>({
    level: EventLevel.Error,
    source: EventSource.Client,
    message: ({ error }) => `Media devices error: ${error}`,
    render: ({ error }) => renderJson({ error }),
  }),
  trackStreamStateChanged: defineEvent<RoomEventReturn<"trackStreamStateChanged">>({
    level: EventLevel.Info,
    source: EventSource.System,
    message: ({ publication, participant, streamState }) =>
      `${participant.identity} ${publication.kind} track state: ${streamState}`,
    render: ({ publication, participant, streamState }) =>
      renderJson({ publication, participant, streamState }),
  }),
  trackSubscriptionPermissionChanged: defineEvent<
    RoomEventReturn<"trackSubscriptionPermissionChanged">
  >({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ publication, participant, status }) =>
      `${participant.identity} ${publication.kind} track subscription permission: ${status}`,
    render: ({ publication, participant, status }) =>
      renderJson({ publication, participant, status }),
  }),
  trackSubscriptionStatusChanged: defineEvent<RoomEventReturn<"trackSubscriptionStatusChanged">>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ publication, participant, status }) =>
      `${participant.identity} ${publication.kind} track subscription status: ${status}`,
    render: ({ publication, participant, status }) =>
      renderJson({ publication, participant, status }),
  }),
  audioPlaybackChanged: defineEvent<RoomEventReturn<"audioPlaybackChanged">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ playing }) => `Audio playback: ${playing ? "playing" : "paused"}`,
    render: ({ playing }) => renderJson({ playing }),
  }),
  videoPlaybackChanged: defineEvent<RoomEventReturn<"videoPlaybackChanged">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ playing }) => `Video playback: ${playing ? "playing" : "paused"}`,
    render: ({ playing }) => renderJson({ playing }),
  }),
  recordingStatusChanged: defineEvent<RoomEventReturn<"recordingStatusChanged">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ recording }) => `Recording status: ${recording ? "recording" : "not recording"}`,
    render: ({ recording }) => renderJson({ recording }),
  }),
  participantEncryptionStatusChanged: defineEvent<
    RoomEventReturn<"participantEncryptionStatusChanged">
  >({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ encrypted, participant }) =>
      `${participant?.identity} encryption status: ${encrypted ? "encrypted" : "not encrypted"}`,
    render: ({ encrypted, participant }) => renderJson({ encrypted, participant }),
  }),
  encryptionError: defineEvent<RoomEventReturn<"encryptionError">>({
    level: EventLevel.Error,
    source: EventSource.Server,
    message: ({ error }) => `Encryption error: ${error}`,
    render: ({ error }) => renderJson({ error }),
  }),
  dcBufferStatusChanged: defineEvent<RoomEventReturn<"dcBufferStatusChanged">>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ isLow, kind }) =>
      `DC buffer status: ${isLow ? "low" : "high"} for ${DataPacket_Kind[kind!]}`,
    render: ({ isLow, kind }) => renderJson({ isLow, kind }),
  }),
  activeDeviceChanged: defineEvent<RoomEventReturn<"activeDeviceChanged">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ deviceType }) => `Active device changed to ${deviceType}`,
    render: ({ deviceType, deviceId }) => renderJson({ deviceType, deviceId }),
  }),
  localTrackSubscribed: defineEvent<RoomEventReturn<"localTrackSubscribed">>({
    level: EventLevel.Info,
    source: EventSource.Client,
    message: ({ publication, participant }) =>
      `${participant?.identity} subscribed to local ${publication.kind} track`,
    render: ({ publication, participant }) => renderJson({ publication, participant }),
  }),
  metricsReceived: defineEvent<RoomEventReturn<"metricsReceived">>({
    level: EventLevel.Info,
    source: EventSource.Server,
    message: ({ metrics, participant }) =>
      `Metrics received from ${participant?.identity}: ${metrics}`,
    render: ({ metrics, participant }) => renderJson({ metrics, participant }),
  }),
};

export type EventRegistry = typeof eventRegistryConfig;
