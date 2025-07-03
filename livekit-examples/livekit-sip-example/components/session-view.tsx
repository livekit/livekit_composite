'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RoomEvent, Track } from 'livekit-client';
import { motion } from 'motion/react';
import { BarVisualizer, useRemoteParticipants, useTracks } from '@livekit/components-react';
import { SipControlBar } from '@/components/livekit/sip-control-bar';
import { useDebugMode } from '@/hooks/useDebug';
import { cn } from '@/lib/utils';

interface SessionViewProps {
  disabled: boolean;
  sessionStarted: boolean;
  onDeleteRoom?: () => Promise<void>;
}

export const SessionView = ({
  disabled,
  sessionStarted,
  onDeleteRoom,
  ref,
}: React.ComponentProps<'div'> & SessionViewProps) => {
  const [hasHadSipParticipant, setHasHadSipParticipant] = useState(false);
  const remoteParticipants = useRemoteParticipants();

  // Get only remote microphone tracks (exclude local participant)
  const microphoneTracks = useTracks([Track.Source.Microphone], {
    updateOnlyOn: [
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
    ],
    onlySubscribed: true,
  }).filter((track) => track.participant.isLocal === false);

  useDebugMode();

  // Find the SIP participant
  const sipParticipant = remoteParticipants.find((p) => p.identity.startsWith('sip_'));

  // Get the SIP call status from participant attributes
  const sipCallStatus = sipParticipant?.attributes?.['sip.callStatus'];

  // Find the SIP participant's microphone track from the tracks array
  const sipMicrophoneTrack = microphoneTracks.find((trackRef) =>
    trackRef.participant.identity.startsWith('sip_')
  );

  // Use the track reference from useTracks if available
  const sipTrackRef = useMemo(() => {
    if (sipCallStatus === 'active' && sipMicrophoneTrack) {
      return sipMicrophoneTrack;
    }
    return undefined;
  }, [sipCallStatus, sipMicrophoneTrack]);

  // Track if we've ever had a SIP participant
  useEffect(() => {
    if (sipParticipant && (sipCallStatus === 'active' || sipCallStatus === 'ringing')) {
      setHasHadSipParticipant(true);
    }
  }, [sipParticipant, sipCallStatus]);

  // Debug logging
  useEffect(() => {
    if (sipParticipant) {
      console.log('SIP Participant:', {
        identity: sipParticipant.identity,
        name: sipParticipant.name,
        status: sipCallStatus,
        hasMicrophoneTrack: !!sipMicrophoneTrack,
        trackRef: sipTrackRef,
        allMicTracks: microphoneTracks.map((t) => ({
          identity: t.participant.identity,
          isMuted: t.publication?.isMuted,
          isSubscribed: t.publication?.isSubscribed,
        })),
      });
    }
  }, [sipParticipant, sipCallStatus, sipMicrophoneTrack, sipTrackRef, microphoneTracks]);

  const handleDisconnect = React.useCallback(async () => {
    // Delete the room when disconnecting
    await onDeleteRoom?.();
  }, [onDeleteRoom]);

  return (
    <main ref={ref} inert={disabled} className="max-h-svh overflow-hidden">
      <div className="bg-background fixed right-0 bottom-0 left-0 z-50 px-3 pt-2 pb-3 md:px-12 md:pb-12">
        <motion.div
          key="control-bar"
          initial={{ opacity: 0, translateY: '100%' }}
          animate={{
            opacity: sessionStarted ? 1 : 0,
            translateY: sessionStarted ? '0%' : '100%',
          }}
          transition={{ duration: 0.3, delay: sessionStarted ? 0.5 : 0, ease: 'easeOut' }}
        >
          <div className="relative z-10 mx-auto w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: sessionStarted ? 1 : 0,
                transition: {
                  ease: 'easeIn',
                  delay: 0.3,
                  duration: 0.5,
                },
              }}
              className={cn(
                'fixed inset-0 z-20 flex flex-col items-center justify-center',
                'pointer-events-none'
              )}
            >
              {sipCallStatus === 'hangup' && (
                <p className="text-muted-foreground text-2xl font-medium">Call ended</p>
              )}
              {sipCallStatus === 'dialing' && (
                <p className="text-muted-foreground animate-pulse text-2xl font-medium">
                  Dialing...
                </p>
              )}
              {!sipParticipant && sessionStarted && hasHadSipParticipant && (
                <p className="text-muted-foreground text-2xl font-medium">
                  Participant disconnected
                </p>
              )}
              {!sipParticipant && sessionStarted && !hasHadSipParticipant && (
                <p className="text-muted-foreground animate-pulse text-2xl font-medium">
                  Dialing...
                </p>
              )}
              {sipCallStatus === 'ringing' && (
                <p className="text-muted-foreground animate-pulse text-2xl font-medium">
                  Ringing...
                </p>
              )}
              {sipCallStatus === 'active' && sipTrackRef && (
                <div className="flex flex-col items-center gap-6">
                  <BarVisualizer
                    barCount={5}
                    trackRef={sipTrackRef}
                    options={{ minHeight: 10 }}
                    className="flex h-24 items-center justify-center gap-3"
                  >
                    <span className="bg-primary data-[lk-muted]:bg-muted h-full w-3 rounded-full" />
                  </BarVisualizer>
                  <span className="text-muted-foreground text-xl font-medium">
                    {sipParticipant?.name || 'Phone'}
                  </span>
                </div>
              )}
            </motion.div>

            <SipControlBar onDisconnect={handleDisconnect} />
          </div>
          {/* skrim */}
          <div className="from-background border-background absolute top-0 left-0 h-12 w-full -translate-y-full bg-gradient-to-t to-transparent" />
        </motion.div>
      </div>
    </main>
  );
};
