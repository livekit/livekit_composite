import { create } from "zustand";
import { persist } from "zustand/middleware";

type DisplayJsonStore = {
  displayJson: boolean;
  setDisplayJson: (displayJson: boolean) => void;
};

export const useDisplayJson = create<DisplayJsonStore>()(
  persist(
    (set) => ({ displayJson: false, setDisplayJson: (displayJson) => set({ displayJson }) }),
    { name: "livekit-display-json" }
  )
);
