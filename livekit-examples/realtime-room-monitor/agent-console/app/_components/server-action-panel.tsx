import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TabValue, useTabs } from "@/hooks/use-tabs";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { ParticipantActionPanel } from "./participant-action-panel";
import { RemoteParticipantsActionPanel } from "./remote-participants-action-panel";
import { RoomActionPanel } from "./room-action-panel";
import { VideoTrackActionPanel } from "./video-track-action-panel";

const tabValueToPanelMap: Record<TabValue, React.FC> = {
  room: RoomActionPanel,
  "local-participant": ParticipantActionPanel,
  "remote-participants": RemoteParticipantsActionPanel,
  videos: VideoTrackActionPanel,
};

export const ServerActionPanel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...rest
}) => {
  const { selectedTab } = useTabs();
  const Panel = useMemo(() => tabValueToPanelMap[selectedTab], [selectedTab]);

  return (
    <div className={cn("h-full flex flex-col bg-background", className)} {...rest}>
      <div className="p-4 pt-5 border-b">
        <h3 className="text-lg font-semibold leading-none tracking-tight">
          {selectedTabLabels[selectedTab]}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{selectedTabDescriptions[selectedTab]}</p>
      </div>
      <ScrollArea>
        <Panel />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};

const selectedTabLabels: Record<TabValue, string> = {
  room: "Room Configuration",
  "local-participant": "Local Participant Management",
  "remote-participants": "Remote Participant Controls",
  videos: "Video Track Operations",
};

const selectedTabDescriptions: Record<TabValue, string> = {
  room: "Update room metadata and global settings",
  "local-participant": "Manage local participant permissions and tracks",
  "remote-participants": "Control remote participants and their streams",
  videos: "Inspect and modify video track configurations",
};
