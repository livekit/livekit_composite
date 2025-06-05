import { createContext, useContext } from "react";

// State type
export type State = {
  token?: string;
  serverUrl: string;
  shouldConnect: boolean;
  captionsEnabled: boolean;
  captionsLanguage: string;
  isHost: boolean;
};

// Action type
export type Action =
  | { type: "SET_TOKEN"; payload: string }
  | { type: "SET_SERVER_URL"; payload: string }
  | { type: "SET_SHOULD_CONNECT"; payload: boolean }
  | { type: "SET_CAPTIONS_ENABLED"; payload: boolean }
  | { type: "SET_CAPTIONS_LANGUAGE"; payload: string }
  | { type: "SET_IS_HOST"; payload: boolean };

// Reducer function
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_TOKEN":
      return { ...state, token: action.payload };
    case "SET_SERVER_URL":
      return { ...state, serverUrl: action.payload };
    case "SET_SHOULD_CONNECT":
      return { ...state, shouldConnect: action.payload };
    case "SET_CAPTIONS_ENABLED":
      return { ...state, captionsEnabled: action.payload };
    case "SET_CAPTIONS_LANGUAGE":
      return { ...state, captionsLanguage: action.payload };
    case "SET_IS_HOST":
      return { ...state, isHost: action.payload };
    default:
      // Ensure exhaustive check
      const _: never = action;
      throw new Error(`Unknown action: ${JSON.stringify(action)}`);
  }
};

// Context
export const PartyStateContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

// Custom hook for using the context
export const usePartyState = () => {
  const context = useContext(PartyStateContext);
  if (!context) {
    throw new Error("usePartyState must be used within a PartyProvider");
  }
  return context;
};
