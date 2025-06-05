import { Badge } from "@/components/ui/badge";
import { useRemoteParticipants } from "@livekit/components-react";
import { House, UserRound, UsersRound, Video } from "lucide-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const RemoteParticipantsIndicator = () => {
  const pc = useRemoteParticipants();
  return (
    <Badge className="ms-1.5 min-w-5 bg-primary/15" variant="secondary">
      {pc.length}
    </Badge>
  );
};

const iconProps = {
  className: "-ms-0.5 me-1.5 opacity-60",
  size: 16,
  strokeWidth: 2,
};

export type TabValue = "room" | "local-participant" | "remote-participants" | "videos";

export type TabItem = {
  label: string;
  value: TabValue;
  icon: React.ReactNode;
  indicator?: React.ReactNode;
};

export const tabItems: TabItem[] = [
  {
    label: "Room",
    value: "room",
    icon: <House {...iconProps} />,
  },
  {
    label: "Local Participant",
    value: "local-participant",
    icon: <UserRound {...iconProps} />,
  },
  {
    label: "Remote Participants",
    value: "remote-participants",
    icon: <UsersRound {...iconProps} />,
    indicator: <RemoteParticipantsIndicator />,
  },
  {
    label: "Videos",
    value: "videos",
    icon: <Video {...iconProps} />,
  },
];

export interface TabsState {
  selectedTab: TabValue;
  setSelectedTab: (tab: TabValue) => void;
}

export const useTabs = create<TabsState>()(
  persist(
    (set) => ({
      selectedTab: "room",
      setSelectedTab: (tab) => set({ selectedTab: tab }),
    }),
    {
      name: "livekit-console-tabs",
    }
  )
);
