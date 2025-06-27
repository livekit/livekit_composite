'use client';

import * as React from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { motion } from 'motion/react';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { toastAlert } from '@/components/alert-toast';
import { SessionView } from '@/components/session-view';
import { Toaster } from '@/components/ui/sonner';
import { Welcome } from '@/components/welcome';
import useConnectionDetails from '@/hooks/useConnectionDetails';
import type { AppConfig } from '@/lib/types';

const MotionSessionView = motion.create(SessionView);
const MotionWelcome = motion.create(Welcome);

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const [sessionStarted, setSessionStarted] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [roomName, setRoomName] = React.useState<string | null>(null);
  const { startButtonText } = appConfig;

  const { connectionDetails } = useConnectionDetails(phoneNumber);

  const room = React.useMemo(() => new Room(), []);

  const handleDeleteRoom = React.useCallback(async () => {
    if (roomName) {
      try {
        const response = await fetch('/api/delete-room', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomName }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete room');
        }

        console.log('Room deleted successfully');
      } catch (error) {
        console.error('Error deleting room:', error);
        toastAlert({
          title: 'Error deleting room',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }, [roomName]);

  React.useEffect(() => {
    const onDisconnected = () => {
      setSessionStarted(false);
      setPhoneNumber(''); // Clear phone number to prevent re-dialing
      setRoomName(null);
      // Don't refresh connection details here since we're going back to homepage
    };
    const onMediaDevicesError = (error: Error) => {
      toastAlert({
        title: 'Encountered an error with your media devices',
        description: `${error.name}: ${error.message}`,
      });
    };
    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
    };
  }, [room]);

  React.useEffect(() => {
    if (sessionStarted && room.state === 'disconnected' && connectionDetails) {
      setRoomName(connectionDetails.roomName);
      Promise.all([
        room.localParticipant.setMicrophoneEnabled(true, undefined, {
          preConnectBuffer: true,
        }),
        room.connect(connectionDetails.serverUrl, connectionDetails.participantToken),
      ]).catch((error) => {
        toastAlert({
          title: 'There was an error connecting to the call',
          description: `${error.name}: ${error.message}`,
        });
      });
    }
    return () => {
      room.disconnect();
    };
  }, [room, sessionStarted, connectionDetails]);

  return (
    <>
      <MotionWelcome
        key="welcome"
        startButtonText={startButtonText}
        onStartCall={(phone) => {
          setPhoneNumber(phone);
          setSessionStarted(true);
        }}
        disabled={sessionStarted}
        initial={{ opacity: 0 }}
        animate={{ opacity: sessionStarted ? 0 : 1 }}
        transition={{ duration: 0.5, ease: 'linear', delay: sessionStarted ? 0 : 0.5 }}
      />

      <RoomContext.Provider value={room}>
        <RoomAudioRenderer />
        <StartAudio label="Start Audio" />
        {/* --- */}
        <MotionSessionView
          key="session-view"
          sessionStarted={sessionStarted}
          disabled={!sessionStarted}
          onDeleteRoom={handleDeleteRoom}
          initial={{ opacity: 0 }}
          animate={{ opacity: sessionStarted ? 1 : 0 }}
          transition={{
            duration: 0.5,
            ease: 'linear',
            delay: sessionStarted ? 0.5 : 0,
          }}
        />
      </RoomContext.Provider>

      <Toaster />
    </>
  );
}
