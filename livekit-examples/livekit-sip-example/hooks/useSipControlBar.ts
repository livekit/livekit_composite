'use client';

import { useCallback, useEffect, useState } from 'react';
import { Track } from 'livekit-client';
import {
  useLocalParticipant,
  usePersistentUserChoices,
  useRoomContext,
} from '@livekit/components-react';

export function useSipControlBar() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { saveAudioInputEnabled, saveAudioInputDeviceId } = usePersistentUserChoices();

  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [pendingMicrophoneState, setPendingMicrophoneState] = useState(false);

  const microphonePublication = localParticipant.getTrackPublication(Track.Source.Microphone);
  const micTrackRef = microphonePublication
    ? {
        participant: localParticipant,
        source: Track.Source.Microphone,
        publication: microphonePublication,
      }
    : undefined;

  useEffect(() => {
    if (microphonePublication) {
      setIsAudioEnabled(microphonePublication.isMuted === false);
    }
  }, [microphonePublication]);

  const toggleMicrophone = useCallback(async () => {
    setPendingMicrophoneState(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
      saveAudioInputEnabled(!isAudioEnabled);
    } finally {
      setPendingMicrophoneState(false);
    }
  }, [localParticipant, isAudioEnabled, saveAudioInputEnabled]);

  const handleAudioDeviceChange = useCallback(
    async (deviceId: string) => {
      // Device switching happens automatically in the DeviceSelect component
      saveAudioInputDeviceId(deviceId);
    },
    [saveAudioInputDeviceId]
  );

  const handleDisconnect = useCallback(() => {
    room.disconnect();
  }, [room]);

  const microphoneToggle = {
    enabled: isAudioEnabled,
    pending: pendingMicrophoneState,
    toggle: toggleMicrophone,
  };

  return {
    micTrackRef,
    microphoneToggle,
    handleAudioDeviceChange,
    handleDisconnect,
  };
}
