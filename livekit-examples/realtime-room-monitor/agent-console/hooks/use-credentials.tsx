import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Credentials = {
  LIVEKIT_URL?: string;
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
};

export type CredentialsState = {
  credentials: Credentials;
  setCredentials: (credentials: Partial<Credentials>) => void;
  isConfigured: () => boolean;
};

export interface CredentialsDialogState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useCredentialsDialog = create<CredentialsDialogState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export const useCredentials = create<CredentialsState>()(
  persist(
    (set, get) => ({
      credentials: {
        LIVEKIT_URL: undefined,
        LIVEKIT_API_KEY: undefined,
        LIVEKIT_API_SECRET: undefined,
      },
      setCredentials: (newCredentials) => {
        set((state) => ({
          credentials: { ...state.credentials, ...newCredentials },
        }));
      },
      isConfigured: () => {
        const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = get().credentials;
        return (
          isValidKey(LIVEKIT_URL) && isValidKey(LIVEKIT_API_KEY) && isValidKey(LIVEKIT_API_SECRET)
        );
      },
    }),
    {
      name: "livekit-credentials",
      partialize: (state) => ({ credentials: state.credentials }),
    }
  )
);

const isValidKey = (key: string | undefined) => {
  return key !== undefined && key !== null && key !== "";
};
