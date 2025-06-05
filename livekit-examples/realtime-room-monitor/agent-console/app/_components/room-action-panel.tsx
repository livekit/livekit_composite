import { ActionCard } from "@/components/action-card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLivekitAction, useLivekitState } from "@/hooks/use-livekit";
import { useState } from "react";

export const RoomActionPanel = () => {
  const { room } = useLivekitState();
  const { updateRoomMetadata } = useLivekitAction();
  const [metadataInput, setMetadataInput] = useState(room.metadata || "");

  return (
    <ActionCard
      title="Update Room Metadata"
      description="Modify the metadata associated with this room"
      action={async () => {
        if (!room.name) throw new Error("No active room connection");
        return updateRoomMetadata({
          roomName: room.name,
          metadata: metadataInput,
        });
      }}
      className="m-4"
      disabled={!metadataInput || metadataInput === room.metadata}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="room-metadata">New Metadata</Label>
          <Textarea
            id="room-metadata"
            value={metadataInput}
            onChange={(e) => setMetadataInput(e.target.value)}
            placeholder="Enter metadata"
          />
        </div>
        {room.metadata && (
          <div className="text-sm text-muted-foreground">Current metadata: {room.metadata}</div>
        )}
      </div>
    </ActionCard>
  );
};
