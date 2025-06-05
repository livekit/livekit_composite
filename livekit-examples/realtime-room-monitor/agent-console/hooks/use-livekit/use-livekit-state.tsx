import {
  useConnectionQualityIndicator,
  useConnectionState,
  useIsRecording,
  useIsSpeaking,
  useParticipantAttributes,
  useParticipantInfo,
  useParticipantPermissions,
  useParticipants,
  useParticipantTracks,
  useRemoteParticipants,
  useRoomContext,
  useRoomInfo,
  useSpeakingParticipants,
  useTracks,
} from "@livekit/components-react";
import {
  ConnectionQuality,
  isLocalParticipant,
  LocalParticipant,
  Participant,
  Track,
} from "livekit-client";
import { useMemo } from "react";
import { useConnectionDetails } from "./use-conn-details";

export const useLivekitRoomState = () => {
  const { connectionDetails } = useConnectionDetails();

  const { serverInfo } = useRoomContext();
  const { name, metadata } = useRoomInfo();

  const connectionState = useConnectionState();
  const isRecording = useIsRecording();

  return {
    connectionDetails,
    connectionState,
    name,
    metadata,
    serverInfo,
    isRecording,
  };
};

export const useLivekitParticipantState = (participant: Participant | undefined) => {
  const { isLocal, sid, joinedAt } = useMemo(() => {
    if (!participant) {
      return {
        isLocal: false,
        sid: "",
        lastSpokeAt: undefined,
        joinedAt: undefined,
        connectionQuality: ConnectionQuality.Unknown,
      };
    }

    return { ...participant, isLocal: isLocalParticipant(participant) };
  }, [participant]);

  const { quality: connectionQuality } = useConnectionQualityIndicator({ participant });
  const isSpeaking = useIsSpeaking(participant);
  const permissions = useParticipantPermissions({ participant: participant });
  const { identity, name, metadata } = useParticipantInfo({ participant: participant });
  const { attributes } = useParticipantAttributes({ participant: participant });

  const tracks = useParticipantTracks(
    [
      Track.Source.Camera,
      Track.Source.Microphone,
      Track.Source.ScreenShare,
      Track.Source.ScreenShareAudio,
      Track.Source.Unknown,
    ],
    participant?.identity
  );

  const microphoneTracks = tracks.filter((track) => track.source === Track.Source.Microphone);
  const cameraTracks = tracks.filter((track) => track.source === Track.Source.Camera);
  const screenShareTracks = tracks.filter((track) => track.source === Track.Source.ScreenShare);
  const screenShareAudioTracks = tracks.filter(
    (track) => track.source === Track.Source.ScreenShareAudio
  );

  const unknownTracks = tracks.filter((track) => track.source === Track.Source.Unknown);

  const audioLevel = useMemo(() => {
    if (microphoneTracks.length === 0) return undefined;
    return microphoneTracks[0].participant.audioLevel;
  }, [microphoneTracks]);

  const lastSpokeAt = useMemo(() => {
    if (microphoneTracks.length === 0) return undefined;
    return microphoneTracks[0].participant.lastSpokeAt;
  }, [microphoneTracks]);

  const lastMicrophoneError = useMemo(() => {
    if (!participant) return undefined;
    return isLocal ? (participant as unknown as LocalParticipant)?.lastMicrophoneError : undefined;
  }, [isLocal, participant]);

  const lastCameraError = useMemo(() => {
    if (!participant) return undefined;
    return isLocal ? (participant as unknown as LocalParticipant)?.lastCameraError : undefined;
  }, [isLocal, participant]);

  return {
    isLocal,
    connectionQuality: connectionQuality || ConnectionQuality.Unknown,
    audioLevel,
    sid,
    lastSpokeAt,
    joinedAt,
    isSpeaking,
    permissions,
    identity,
    name,
    metadata,
    attributes,
    tracks: {
      microphoneTracks,
      cameraTracks,
      screenShareTracks,
      screenShareAudioTracks,
      unknownTracks,
    },
    errors: {
      lastMicrophoneError,
      lastCameraError,
    },
  };
};

export const useLivekitRemoteParticipants = () => {
  const remoteParticipants = useRemoteParticipants();
  const activeSpeakers = useSpeakingParticipants();

  const activeSpeakerIdentities = useMemo(
    () => activeSpeakers.filter((p) => !isLocalParticipant(p)).map((p) => p.identity),
    [activeSpeakers]
  );

  return {
    remoteParticipants,
    activeSpeakerIdentities,
  };
};

export const useLivekitVideoTracks = () => {
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);

  return {
    cameraTracks,
    screenShareTracks,
  };
};

export const useLivekitState = () => {
  const room = useLivekitRoomState();
  const participants = useParticipants();
  const localParticipant = participants.find((p) => isLocalParticipant(p));
  const localParticipantState = useLivekitParticipantState(localParticipant);
  const remoteParticipants = useLivekitRemoteParticipants();
  const tracks = useLivekitVideoTracks();

  return {
    room,
    localParticipant: localParticipantState,
    remoteParticipants,
    tracks,
  };
};

export type LivekitRoomState = ReturnType<typeof useLivekitRoomState>;
export type LivekitParticipantState = ReturnType<typeof useLivekitParticipantState>;

export type LivekitState = {
  room: LivekitRoomState;
  localParticipant: LivekitParticipantState;
};
