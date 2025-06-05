"use client";

import {
  useRoomContext,
  useParticipants,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Participant } from "livekit-client";
import { Headphones } from "react-feather";
import HostControls from "@/components/host-controls";
import ListenerControls from "@/components/listener-controls";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import CircleVisualizer from "./circle-visualizer";
import { usePartyState } from "@/hooks/usePartyState";
import Captions from "@/components/captions";

export default function Party() {
  const [host, setHost] = useState<Participant | undefined>();

  const room = useRoomContext();
  const participants = useParticipants();
  const { state } = usePartyState();

  useEffect(() => {
    const host = participants.find((p) => {
      return p.permissions?.canPublish;
    });
    if (host) {
      setHost(host);
    }
  }, [participants]);

  return (
    <div className="w-full h-full p-8 flex flex-col relative">
      <div className="flex flex-col justify-between h-full w-full">
        <div className="flex justify-between">
          <div className="flex flex-col">
            <p>Listening Party</p>
            <h1 className="font-bold">Billie Eilish</h1>
          </div>
          <div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="uppercase bg-[#E71A32] font-bold text-white"
              >
                Live
              </Button>
              <Button variant="outline">
                <Headphones />
                <p>{participants.length}</p>
              </Button>
            </div>
          </div>
        </div>
        {host === room.localParticipant ? (
          <HostControls />
        ) : (
          <ListenerControls />
        )}
      </div>
      <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
        {host && (
          <div className="flex flex-col items-center relative gap-24">
            {/* Visualizer Container */}
            <div className="relative flex items-center justify-center w-[125px] h-[125px]">
              <CircleVisualizer speaker={host} />
            </div>

            {/* Transcript */}
            <Captions />
          </div>
        )}
      </div>
      {/* <RoomAudioRenderer /> */}
    </div>
  );
}
