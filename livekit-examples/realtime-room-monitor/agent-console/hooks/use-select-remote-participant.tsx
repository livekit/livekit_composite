import { useLivekitState } from "@/hooks/use-livekit/use-livekit-state";
import { RemoteParticipant } from "livekit-client";
import { useEffect } from "react";
import { create } from "zustand";

interface SelectRemoteParticipantState {
  selectedParticipant: RemoteParticipant | undefined;
  setSelectedParticipant: (participant: RemoteParticipant | undefined) => void;
}

const useSelectedRemoteParticipantState = create<SelectRemoteParticipantState>((set) => ({
  selectedParticipant: undefined,
  setSelectedParticipant: (participant) => set({ selectedParticipant: participant }),
}));

export const useSelectRemoteParticipant = () => {
  const {
    remoteParticipants: { remoteParticipants },
  } = useLivekitState();

  const { selectedParticipant, setSelectedParticipant } = useSelectedRemoteParticipantState();

  useEffect(() => {
    if (remoteParticipants.length > 0 && !selectedParticipant) {
      setSelectedParticipant(remoteParticipants[0]);
      return;
    }

    if (remoteParticipants.length === 0 && selectedParticipant) {
      setSelectedParticipant(undefined);
      return;
    }

    if (selectedParticipant !== undefined && !remoteParticipants.includes(selectedParticipant)) {
      setSelectedParticipant(undefined);
      return;
    }
  }, [remoteParticipants, selectedParticipant, setSelectedParticipant]);

  return {
    selectedParticipant,
    setSelectedParticipant,
  };
};
