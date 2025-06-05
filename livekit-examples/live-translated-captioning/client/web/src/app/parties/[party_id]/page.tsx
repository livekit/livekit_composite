"use client";

import React, { useReducer, use } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import Party from "@/components/party";
import Lobby from "@/components/lobby";
import { State, reducer, PartyStateContext } from "@/hooks/usePartyState";

type PartyIdType = { party_id: string };

type PartyPageProps = {
  params: Promise<PartyIdType>;
};

// Initial state
const initialState: State = {
  token: undefined,
  serverUrl: "",
  shouldConnect: false,
  captionsEnabled: true,
  captionsLanguage: "en",
  isHost: false,
};

// PartyPage component
export default function PartyPage({ params }: PartyPageProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { party_id } = use<PartyIdType>(params);

  return (
    <PartyStateContext.Provider value={{ state, dispatch }}>
      <LiveKitRoom
        token={state.token}
        serverUrl={state.serverUrl}
        connect={state.shouldConnect}
        audio={state.isHost}
        className="w-full h-full"
      >
        {state.shouldConnect ? <Party /> : <Lobby partyId={party_id} />}
      </LiveKitRoom>
    </PartyStateContext.Provider>
  );
}
