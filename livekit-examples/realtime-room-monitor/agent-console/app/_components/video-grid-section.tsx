import { RecAvatar } from "@/components/rec-avatar";
import { cn } from "@/lib/utils";
import { TrackReference, VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Maximize2, Mic, MicOff, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VideoGridSectionProps {
  title: string;
  icon: React.ReactNode;
  tracks: TrackReference[];
  className?: string;
}

export const VideoGridSection = ({ title, icon, tracks, className }: VideoGridSectionProps) => {
  if (tracks.length === 0) return null;

  return (
    <div className={className}>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
          {icon} {title} ({tracks.length})
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {tracks.map((track) => (
            <VideoGridItem key={track.publication.trackSid} track={track} />
          ))}
        </div>
      </div>
    </div>
  );
};

const VideoGridItem = ({ track }: { track: TrackReference }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const info = getTrackInfo(track);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div
      ref={videoRef}
      className="relative aspect-video bg-background rounded-xl overflow-hidden border group"
    >
      <VideoTrack
        className="w-full h-full object-contain group-[.fullscreen]:object-cover"
        trackRef={track}
      />
      <TrackOverlay
        info={info}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        isScreenShare={info.isScreenShare}
      />
    </div>
  );
};

// Reuse from existing file
const getTrackInfo = (trackRef: TrackReference) => ({
  participant: trackRef.participant,
  publication: trackRef.publication,
  source: trackRef.source,
  isScreenShare: trackRef.source === Track.Source.ScreenShare,
  isMuted: trackRef.publication.isMuted,
  participantName: trackRef.participant.identity,
  trackName: trackRef.publication.trackName || "Unnamed Track",
});

const TrackOverlay = ({
  info,
  onFullscreen,
  isFullscreen,
  isScreenShare,
}: {
  info: ReturnType<typeof getTrackInfo>;
  onFullscreen: () => void;
  isFullscreen: boolean;
  isScreenShare: boolean;
}) => (
  <div
    className={cn(
      "absolute inset-0 flex flex-col justify-end",
      isScreenShare && !isFullscreen && "bg-black/30 backdrop-blur-sm"
    )}
  >
    <div
      className={cn(
        "flex items-center gap-3 p-4 backdrop-blur-sm",
        isFullscreen ? "bg-black/30" : "bg-black/10"
      )}
    >
      <RecAvatar
        name={info.participantName}
        isSpeaking={info.participant.isSpeaking}
        isSelected={false}
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-white flex items-center gap-2">
          {info.participantName}
          <span className="text-xs font-normal text-white/90">
            ({info.isScreenShare ? "Screen" : "Camera"})
          </span>
        </div>
        <div className="text-xs text-white/90 flex items-center gap-1.5">
          {info.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          {info.trackName}
        </div>
      </div>
      <button
        onClick={onFullscreen}
        className="ml-auto p-1.5 rounded-full bg-black/50 hover:bg-black/80 transition-colors"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 className="w-4 h-4 text-white" />
        ) : (
          <Maximize2 className="w-4 h-4 text-white" />
        )}
      </button>
    </div>
  </div>
);
