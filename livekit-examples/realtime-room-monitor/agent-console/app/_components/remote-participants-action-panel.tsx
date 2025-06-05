import { Badge } from "@/components/ui/badge";
import { useSelectRemoteParticipant } from "@/hooks/use-select-remote-participant";
import { Info } from "lucide-react";
import { ParticipantActionPanelInner } from "./participant-action-panel";

export const RemoteParticipantsActionPanel = () => {
  const { selectedParticipant } = useSelectRemoteParticipant();

  return (
    <div>
      {selectedParticipant ? (
        <>
          <div className="space-y-2 px-4 pt-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold leading-none tracking-tight">
                {selectedParticipant.identity}
              </h2>
              <Badge variant="outline">
                {selectedParticipant.isAgent ? "Agent" : "Participant"}
              </Badge>
            </div>
          </div>
          <ParticipantActionPanelInner participant={selectedParticipant} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="text-muted-foreground text-sm max-w-[300px] space-y-2">
            <Info className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="font-medium">No participant selected</p>
            <p className="text-sm opacity-75">
              Select a remote participant from the list to view details and manage permissions
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
