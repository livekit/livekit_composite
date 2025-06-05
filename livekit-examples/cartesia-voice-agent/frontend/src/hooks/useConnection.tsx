"use client";

import React, { createContext, useCallback, useState } from "react";

type TokenGeneratorData = {
  shouldConnect: boolean;
  wsUrl?: string;
  token?: string;
  disconnect: () => Promise<void>;
  connect: () => Promise<void>;
};

const ConnectionContext = createContext<TokenGeneratorData | undefined>(
  undefined
);

export const ConnectionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [connectionDetails, setConnectionDetails] = useState<{
    wsUrl?: string;
    token?: string;
    shouldConnect: boolean;
  }>({ shouldConnect: false });

  const connect = useCallback(async () => {
    let token = "";
    let url = "";
    if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
      throw new Error("NEXT_PUBLIC_LIVEKIT_URL is not set");
    }
    url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const { accessToken } = await fetch("/api/token").then((res) => res.json());
    token = accessToken;
    setConnectionDetails({ wsUrl: url, token, shouldConnect: true });
  }, []);

  const disconnect = useCallback(async () => {
    setConnectionDetails((prev) => ({ ...prev, shouldConnect: false }));
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        shouldConnect: connectionDetails.shouldConnect,
        wsUrl: connectionDetails.wsUrl,
        token: connectionDetails.token,
        connect,
        disconnect,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = React.useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
};
