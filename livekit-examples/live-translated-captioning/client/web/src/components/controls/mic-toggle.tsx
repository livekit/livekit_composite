import { useRoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "react-feather";

export default function MicToggle() {
  const room = useRoomContext();

  return (
    <Button
      variant="outline"
      onClick={(e) => {
        room.localParticipant.setMicrophoneEnabled(
          !room.localParticipant.isMicrophoneEnabled
        );
      }}
    >
      {room.localParticipant.isMicrophoneEnabled ? (
        <Mic style={{ width: "16px", height: "16px" }} />
      ) : (
        <MicOff style={{ width: "16px", height: "16px" }} />
      )}
    </Button>
  );
}
