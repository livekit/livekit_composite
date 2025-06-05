"use client";

import { CloseIcon } from "@/components/CloseIcon";
import {
  AgentState,
  DisconnectButton,
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useMultibandTrackVolume,
  useVoiceAssistant,
} from "@livekit/components-react";
import { useKrispNoiseFilter } from "@livekit/components-react/krisp";
import { AnimatePresence, motion } from "framer-motion";
import { MediaDeviceFailure } from "livekit-client";
import { useCallback, useEffect, useState } from "react";
import type { ConnectionDetails } from "./api/connection-details/route";
import Image from "next/image";

export default function Page() {
  const [connectionDetails, updateConnectionDetails] = useState<
    ConnectionDetails | undefined
  >(undefined);
  const [agentState, setAgentState] = useState<AgentState>("disconnected");

  const onConnectButtonClicked = useCallback(async () => {
    // Generate room connection details, including:
    //   - A random Room name
    //   - A random Participant name
    //   - An Access Token to permit the participant to join the room
    //   - The URL of the LiveKit server to connect to
    //
    // In real-world application, you would likely allow the user to specify their
    // own participant name, and possibly to choose from existing rooms to join.

    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ??
        "/api/connection-details",
      window.location.origin
    );
    const response = await fetch(url.toString());
    const connectionDetailsData = await response.json();
    updateConnectionDetails(connectionDetailsData);
  }, []);

  return (
    <main data-lk-theme="default" className="h-full flex items-center">
      <div className="w-full grid grid-rows-[64px_1fr_8px] lg:border border-white/20 h-full min-h-dvh lg:max-w-5xl mx-auto lg:min-h-[640px] lg:max-h-[640px] rounded-2xl px-4">
        <header className="border-b border-white/20">
          <div className="py-4 px-2 flex items-center justify-between">
            <a href="https://groq.com" target="_blank">
              <Image
                width={122.667}
                height={64}
                src="/groq-logo.svg"
                alt="Groq logo"
                className="h-5 mt-2 w-auto"
              />
            </a>
            <div>
              Built with{" "}
              <a
                href="https://docs.livekit.io/agents"
                className="pb-[1px] border-b border-white/40 hover:border-white/80 transition-all duration-75 ease-out"
                target="_blank"
              >
                LiveKit
              </a>
            </div>
          </div>
        </header>
        <LiveKitRoom
          className="h-full flex flex-col gap-20 items-center justify-center bg-groq-accent-bg"
          token={connectionDetails?.participantToken}
          serverUrl={connectionDetails?.serverUrl}
          connect={connectionDetails !== undefined}
          audio={true}
          video={false}
          onMediaDeviceFailure={onDeviceFailure}
          onDisconnected={() => {
            updateConnectionDetails(undefined);
          }}
        >
          <SimpleVoiceAssistant onStateChange={setAgentState} />
          <ControlBar
            onConnectButtonClicked={onConnectButtonClicked}
            agentState={agentState}
          />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </main>
  );
}

function SimpleVoiceAssistant(props: {
  onStateChange: (state: AgentState) => void;
}) {
  const { state, audioTrack } = useVoiceAssistant();
  const volumes = useMultibandTrackVolume(audioTrack, { bands: 1 });

  useEffect(() => {
    props.onStateChange(state);
  }, [props, state]);
  return (
    <div
      className={`flex flex-col items-center pt-12 justify-center ${state === "disconnected" ? "opacity-10" : "opacity-100"} transition-opacity duration-300`}
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div
          className="w-48 h-48 rounded-full bg-white shadow-[inset_0px_-4px_20px_0px_rgba(0,0,0,0.5)]"
          style={{
            transform: `scale(${1 + volumes[0]})`,
          }}
        ></div>
      </motion.div>
    </div>
  );
}

function ControlBar(props: {
  onConnectButtonClicked: () => void;
  agentState: AgentState;
}) {
  /**
   * Use Krisp background noise reduction when available.
   * Note: This is only available on Scale plan, see {@link https://livekit.io/pricing | LiveKit Pricing} for more details.
   */
  const krisp = useKrispNoiseFilter();
  const [connectingDots, setConnectingDots] = useState("");

  useEffect(() => {
    krisp.setNoiseFilterEnabled(true);
  }, []);

  useEffect(() => {
    if (props.agentState === "connecting") {
      const interval = setInterval(() => {
        setConnectingDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 250);
      return () => clearInterval(interval);
    }
  }, [props.agentState]);

  return (
    <div className="relative h-12">
      <AnimatePresence>
        {(props.agentState === "disconnected" ||
          props.agentState === "connecting") && (
          <motion.button
            initial={{ opacity: 0, top: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, top: "10px" }}
            transition={{ duration: 1, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="min-w-56 uppercase px-2 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all duration-75 ease-out"
            onClick={() => props.onConnectButtonClicked()}
          >
            <span className="text-white text-xs font-semibold tracking-widest">
              {props.agentState === "disconnected" ? (
                "Start a conversation"
              ) : (
                <>
                  Connecting
                  <span className="inline-block w-4 text-left">
                    {connectingDots}
                  </span>
                </>
              )}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {props.agentState !== "disconnected" &&
          props.agentState !== "connecting" && (
            <motion.div
              initial={{ opacity: 0, top: "10px" }}
              animate={{ opacity: 1, top: 0 }}
              exit={{ opacity: 0, top: "10px" }}
              transition={{
                duration: 0.4,
                ease: [0.09, 1.04, 0.245, 1.055],
              }}
              className="flex h-8 absolute left-1/2 -translate-x-1/2  justify-center"
            >
              <VoiceAssistantControlBar controls={{ leave: false }} />
              <DisconnectButton>
                <CloseIcon />
              </DisconnectButton>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

function onDeviceFailure(error?: MediaDeviceFailure) {
  console.error(error);
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}
