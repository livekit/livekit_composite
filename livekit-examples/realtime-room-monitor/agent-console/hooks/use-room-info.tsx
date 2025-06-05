import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RoomInfoState {
  userId: string;
  roomName: string;
  setUserId: (userId: string) => void;
  setRoomName: (roomName: string) => void;
  clear: () => void;
}

export const useRoomInfo = create<RoomInfoState>()(
  persist(
    (set) => ({
      userId: "",
      roomName: "",
      setUserId: (userId) => set({ userId }),
      setRoomName: (roomName) => set({ roomName }),
      clear: () => set({ userId: "", roomName: "" }),
    }),
    {
      name: "livekit-realtime-room-info-storage",
    }
  )
);
