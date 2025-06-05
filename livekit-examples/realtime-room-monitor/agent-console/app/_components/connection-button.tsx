"use client";
import { Button } from "@/components/ui/button";
import { useLivekitAction, useLivekitState } from "@/hooks/use-livekit";
import { cn } from "@/lib/utils";
import { ConnectionState } from "livekit-client";
import { CircleCheck, SignalHigh } from "lucide-react";

const reconnectingStates = [
  ConnectionState.Connecting,
  ConnectionState.Reconnecting,
  ConnectionState.SignalReconnecting,
];

export const ConnectionButton: React.FC<React.HTMLAttributes<HTMLButtonElement>> = ({
  className,
  ...props
}) => {
  const {
    room: { connectionState },
  } = useLivekitState();
  const { connect, disconnect } = useLivekitAction();

  const getButtonContent = () => {
    switch (connectionState) {
      case "connected":
        return (
          <>
            <CircleCheck className="w-4 h-4 text-green-500" />
            <span className="font-medium">Disconnect</span>
          </>
        );
      case "connecting":
      case "reconnecting":
      case "signalReconnecting":
        return (
          <>
            <SignalHigh className="w-4 h-4 animate-pulse text-yellow-500" />
            <span className="font-medium">Connecting...</span>
          </>
        );
      case "disconnected":
        return (
          <>
            <SignalHigh className="w-4 h-4 text-gray-500" />
            <span className="font-medium">Connect</span>
          </>
        );
      default:
        return (
          <>
            <SignalHigh className="w-4 h-4" />
            <span className="font-medium">Connect</span>
          </>
        );
    }
  };

  const handleConnectionButtonClick = () => {
    if (reconnectingStates.includes(connectionState)) return;

    if (connectionState === "connected") {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <Button
      className={cn(className)}
      onClick={handleConnectionButtonClick}
      disabled={reconnectingStates.includes(connectionState)}
      {...props}
    >
      {getButtonContent()}
    </Button>
  );
};
