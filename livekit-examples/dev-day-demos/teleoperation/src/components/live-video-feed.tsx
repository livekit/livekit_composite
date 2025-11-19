'use client';

import { useRef, useEffect, useState } from 'react';
import { Room, RemoteTrack, RemoteParticipant } from 'livekit-client';
import { CameraIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface LiveVideoFeedProps {
    onVideoElementReady?: (videoElement: HTMLVideoElement | null) => void;
    room?: Room | null;
    isConnected?: boolean;
    videoTrack?: RemoteTrack | null;
    audioTrack?: RemoteTrack | null;
    isLoading?: boolean;
    connectionError?: string | null;
    participantIdentity?: string;
    remoteParticipants?: RemoteParticipant[];
}

export function LiveVideoFeed({
    onVideoElementReady,
    room,
    isConnected = false,
    videoTrack = null,
    audioTrack = null,
    isLoading = true,
    connectionError = null,
    participantIdentity = '',
    remoteParticipants = []
}: LiveVideoFeedProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoTrack && videoRef.current) {
            videoTrack.attach(videoRef.current);
            // Notify parent component that video element is ready
            onVideoElementReady?.(videoRef.current);
        }
    }, [videoTrack, onVideoElementReady]);

    const renderLoadingState = () => (
        <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-fg2">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-3 text-xs uppercase tracking-[0.4em]">Acquiring stream</p>
        </div>
    );

    const renderOfflineState = () => (
        <div className="relative flex h-full min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
            <XCircleIcon className="h-10 w-10" />
            <p className="mt-2 text-sm font-semibold">Offline</p>
            <span className="absolute right-4 top-4 rounded-full border border-danger/40 bg-danger/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em]">
                No signal
            </span>
        </div>
    );

    const renderErrorState = (message: string) => (
        <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-danger/40 bg-danger/10 px-4 text-center text-danger">
            <XCircleIcon className="h-10 w-10" />
            <p className="mt-3 text-sm font-semibold">{message}</p>
        </div>
    );

    const renderVideoState = () => (
        <div className="relative h-full min-h-[220px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/60">
            {videoTrack ? (
                <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    autoPlay
                    playsInline
                    muted
                />
            ) : (
                <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center text-fg3">
                    <CameraIcon className="mb-2 h-10 w-10" />
                    <p className="text-sm">No video feed</p>
                </div>
            )}

            {audioTrack && (
                <audio
                    ref={(el) => {
                        if (el && audioTrack) {
                            audioTrack.attach(el);
                        }
                    }}
                    autoPlay
                />
            )}

            <div className="absolute left-4 top-4 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${videoTrack ? 'bg-success' : 'bg-danger'}`} />
                <span className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white">
                    {videoTrack ? 'Live' : 'Offline'}
                </span>
            </div>
        </div>
    );

    if (connectionError) {
        return renderErrorState(connectionError);
    }

    if (isLoading) {
        return renderLoadingState();
    }

    if (!isConnected) {
        return renderOfflineState();
    }

    return renderVideoState();
} 
