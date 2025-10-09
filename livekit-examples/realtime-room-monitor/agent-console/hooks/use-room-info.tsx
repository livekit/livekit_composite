import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RoomInfoState {
  userId: string;
  roomName: string;
  hidden: boolean;
  setUserId: (userId: string) => void;
  setRoomName: (roomName: string) => void;
  setHidden: (hidden: boolean) => void;
  clear: () => void;
}

export const useRoomInfo = create<RoomInfoState>()(
  persist(
    (set) => ({
      userId: "",
      roomName: "",
      hidden: false,
      setUserId: (userId) => set({ userId }),
      setRoomName: (roomName) => set({ roomName }),
      setHidden: (hidden) => set({ hidden }),
      clear: () => set({ userId: "", roomName: "", hidden: false }),
    }),
    {
      name: "livekit-realtime-room-info-storage",
    }
  )
);
