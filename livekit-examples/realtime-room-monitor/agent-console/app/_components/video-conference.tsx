import { useLivekitState } from "@/hooks/use-livekit/use-livekit-state";
import { ScreenShare, Video } from "lucide-react";
import { VideoGridSection } from "./video-grid-section";

export const VideoConference = () => {
  const {
    tracks: { cameraTracks, screenShareTracks },
  } = useLivekitState();

  return (
    <div className="h-full grid grid-cols-1 gap-4 p-4 bg-muted/10">
      <VideoGridSection
        title="Screen Shares"
        icon={<ScreenShare className="w-4 h-4" />}
        tracks={screenShareTracks}
        className="[&_video]:bg-black"
      />
      <VideoGridSection
        title="Camera Feeds"
        icon={<Video className="w-4 h-4" />}
        tracks={cameraTracks}
      />
      {cameraTracks.length === 0 && screenShareTracks.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <Video className="w-8 h-8" />
          <p className="text-sm">No active video feeds</p>
        </div>
      )}
    </div>
  );
};
