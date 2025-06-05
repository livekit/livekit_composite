import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLivekitAction, useLivekitState } from "@/hooks/use-livekit";
import { Track } from "livekit-client";
import { Monitor, MonitorOff, Video, VideoOff } from "lucide-react";
import { useMemo } from "react";

export const VideoTrackActionPanel = () => {
  const {
    room,
    tracks: { cameraTracks, screenShareTracks },
  } = useLivekitState();
  const { muteTrack } = useLivekitAction();

  const videoTracks = useMemo(() => {
    return [...cameraTracks, ...screenShareTracks];
  }, [cameraTracks, screenShareTracks]);

  const handleToggleMute = async (participantIdentity: string, trackId: string, muted: boolean) => {
    await muteTrack({
      roomName: room.name,
      identity: participantIdentity,
      trackSid: trackId,
      muted,
    });
  };

  return (
    <div className="grid gap-4 p-4">
      <Card className="bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Tracks
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {videoTracks.length === 0 && (
            <div className="text-center text-muted-foreground py-4">No active video tracks</div>
          )}

          {videoTracks.map((track) => (
            <div
              key={track.publication.trackSid}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="space-y-1">
                <div className="font-medium">{track.participant.identity}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {track.source === Track.Source.Camera ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                  {track.source === Track.Source.Camera ? "Camera" : "Screen Share"}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleToggleMute(
                    track.participant.identity,
                    track.publication.trackSid,
                    !track.publication.isMuted
                  )
                }
              >
                {track.publication.isMuted ? (
                  <>
                    {track.source === Track.Source.Camera ? (
                      <VideoOff className="h-4 w-4 mr-2" />
                    ) : (
                      <MonitorOff className="h-4 w-4 mr-2" />
                    )}
                    Unmute
                  </>
                ) : (
                  <>
                    {track.source === Track.Source.Camera ? (
                      <Video className="h-4 w-4 mr-2" />
                    ) : (
                      <Monitor className="h-4 w-4 mr-2" />
                    )}
                    Mute
                  </>
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
