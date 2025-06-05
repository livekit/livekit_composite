'use client';
import {
  LiveKitRoom,
  PreJoin,
  LocalUserChoices,
  useToken,
  //VideoConference,
  formatChatMessageLinks,
} from '@livekit/components-react';
import {
  ExternalE2EEKeyProvider,
  LogLevel,
  Room,
  RoomConnectOptions,
  RoomOptions,
  VideoPresets,
  DataPacket_Kind,
} from 'livekit-client';

import {VideoConference} from './myvideoconference';

import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMemo, useState, useEffect } from 'react';
import { DebugMode } from '../../lib/Debug';
import {
  decodePassphrase,
  encodePassphrase,
  randomString,
  useServerUrl,
} from '../../lib/client-utils';
import dynamic from 'next/dynamic';

const PreJoinNoSSR = dynamic(
  async () => {
    return (await import('@livekit/components-react')).PreJoin;
  },
  { ssr: false },
);

const Home: NextPage = () => {
  const router = useRouter();
  const { name: roomName } = router.query;
  const e2eePassphrase =
    typeof window !== 'undefined' && decodePassphrase(location.hash.substring(1));

  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | undefined>(undefined);

  function handlePreJoinSubmit(values: LocalUserChoices) {
    if (values.e2ee) {
      location.hash = encodePassphrase(values.sharedPassphrase);
    }
    setPreJoinChoices(values);
  }
  return (
    <>
      <Head>
        <title>LiveKit Meet</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main data-lk-theme="default">
        {roomName && !Array.isArray(roomName) && preJoinChoices ? (
          <ActiveRoom
            roomName={roomName}
            userChoices={preJoinChoices}
            onLeave={() => {
              router.push('/');
            }}
          ></ActiveRoom>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <PreJoinNoSSR
              onError={(err) => console.log('error while setting up prejoin', err)}
              defaults={{
                username: '',
                videoEnabled: true,
                audioEnabled: true,
                e2ee: !!e2eePassphrase,
                sharedPassphrase: e2eePassphrase || randomString(64),
              }}
              onSubmit={handlePreJoinSubmit}
              showE2EEOptions={true}
            ></PreJoinNoSSR>
          </div>
        )}
      </main>
    </>
  );
};

export default Home;

type ActiveRoomProps = {
  userChoices: LocalUserChoices;
  roomName: string;
  region?: string;
  onLeave?: () => void;
};
const ActiveRoom = ({ roomName, userChoices, onLeave }: ActiveRoomProps) => {
  const token = useToken(process.env.NEXT_PUBLIC_LK_TOKEN_ENDPOINT, roomName, {
    userInfo: {
      identity: userChoices.username,
      name: userChoices.username,
    },
  });

  const router = useRouter();
  const { region, hq } = router.query;

  const liveKitUrl = useServerUrl(region as string | undefined);

  const worker =
    typeof window !== 'undefined' &&
    userChoices.e2ee &&
    new Worker(new URL('livekit-client/e2ee-worker', import.meta.url));

  const e2eeEnabled = !!(userChoices.e2ee && worker);
  const keyProvider = new ExternalE2EEKeyProvider();

  const roomOptions = useMemo((): RoomOptions => {
    return {
      videoCaptureDefaults: {
        deviceId: userChoices.videoDeviceId ?? undefined,
        resolution: hq === 'true' ? VideoPresets.h2160 : VideoPresets.h720,
      },
      publishDefaults: {
        dtx: false,
        videoSimulcastLayers:
          hq === 'true'
            ? [VideoPresets.h1080, VideoPresets.h720]
            : [VideoPresets.h540, VideoPresets.h216],
        red: !e2eeEnabled,
      },
      audioCaptureDefaults: {
        deviceId: userChoices.audioDeviceId ?? undefined,
      },
      adaptiveStream: { pixelDensity: 'screen' },
      dynacast: true,
      e2ee: e2eeEnabled
        ? {
            keyProvider,
            worker,
          }
        : undefined,
    };
  }, [userChoices, hq]);

  const room = useMemo(() => new Room(roomOptions), []);

  useEffect(() => {
    window.addEventListener('contextmenu', function(event) {
      event.preventDefault();      
  });

    let gamepads = navigator.getGamepads();

    const encoder = new TextEncoder();

    const handleKeyUp = (event: KeyboardEvent) => {
      event.preventDefault();
      if (room && room.localParticipant) {
        console.log(event.key)
        // don't send shift or control by itself, wait for the next key
        if (event.key === 'Shift' || event.key === 'Control') {
          return;
        }
        const eventData = {
          type: 'keyup',
          key: event.key,
          shift: event.shiftKey,
          ctrl: event.ctrlKey,
        };
        const strData = JSON.stringify(eventData);
        const data = encoder.encode(strData);
        try {
            room.localParticipant.publishData(data, DataPacket_Kind.LOSSY);
	} catch (error) {
	    console.error('Error publishing data:', error);
	}
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      if (room && room.localParticipant) {
        console.log(event.key)
        // don't send shift or control by itself, wait for the next key
        if (event.key === 'Shift' || event.key === 'Control') {
          return;
        }
        const eventData = {
          type: 'keydown',
          key: event.key,
          shift: event.shiftKey,
          ctrl: event.ctrlKey,
        };
        const strData = JSON.stringify(eventData);
        const data = encoder.encode(strData);
        try {
            room.localParticipant.publishData(data, DataPacket_Kind.LOSSY);
	} catch (error) {
	    console.error('Error publishing data:', error);
	}
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      if (room && room.localParticipant) {
        const eventData = {
          type: 'mousemove',
          position: {
            x: event.movementX, // clientX
            y: event.movementY, // clientY
          },
        };
        const strData = JSON.stringify(eventData);
        const data = encoder.encode(strData);
        try {
            room.localParticipant.publishData(data, DataPacket_Kind.LOSSY);
	} catch (error) {
	    console.error('Error publishing data:', error);
	}
      }
    };

    const handleMouseClick = (event: MouseEvent) => {
      event.preventDefault();
      if (room && room.localParticipant) {
        let button;
        switch (event.button) {
          case 0:
            button = "left";
            break;
          case 1:
            button = "middle";
            break;
          case 2:
            button = "right";
            break;
          default:
            return; // ignore other buttons for now
        }
      
        const eventData = {
          type: 'mousedown',
          button: button,
        };
      
        const strData = JSON.stringify(eventData);
        const encodedData = encoder.encode(strData);
        try {
            room.localParticipant.publishData(encodedData, DataPacket_Kind.LOSSY);
	} catch (error) {
	    console.error('Error publishing data:', error);
	}
      }
    }

    const handleMouseWheel = (event: WheelEvent) => {
        event.preventDefault();
        
        const eventData = {
          type: 'mousewheel',
          deltaX: Math.round(event.deltaX),
          deltaY: Math.round(event.deltaY),
        };

        const strData = JSON.stringify(eventData);
        const encodedData = encoder.encode(strData);
        try {
            room.localParticipant.publishData(encodedData, DataPacket_Kind.LOSSY);
	} catch (error) {
	    console.error('Error publishing data:', error);
	}
    }

    window.addEventListener('mousedown', handleMouseClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleMouseWheel);

    window.addEventListener("gamepadconnected", (event) => {
      console.log("A gamepad was connected:", event.gamepad);
      checkGamepad(); // Start the gamepad polling loop
  });
  
  window.addEventListener("gamepaddisconnected", (event) => {
      console.log("A gamepad was disconnected:", event.gamepad);
  });
    

// Track the state of the buttons from the previous frame
let previousButtonStates: boolean[] = [];

// Gamepad handling code
const checkGamepad = () => {
  const gamepads = navigator.getGamepads();
  if (!gamepads[0]) return;

  const gamepad = gamepads[0];

  if (previousButtonStates.length === 0) {
    previousButtonStates = gamepad.buttons.map(button => button.pressed);
  }

  for (let i = 0; i < gamepad.buttons.length; i++) {
    const isPressed = gamepad.buttons[i].pressed;
    const wasPressed = previousButtonStates[i];

    if (isPressed && !wasPressed) {
      handleGamepadButtonEvent('keydown', i);
    } else if (!isPressed && wasPressed) {
      handleGamepadButtonEvent('keyup', i);
    }

    previousButtonStates[i] = isPressed;
  }

  // Send joystick axes values if they are being moved
  if (
    Math.abs(gamepad.axes[0]) > 0.012 || Math.abs(gamepad.axes[1]) > 0.012 ||
    Math.abs(gamepad.axes[2]) > 0.012 || Math.abs(gamepad.axes[3]) > 0.012
  ) {
    if (room && room.localParticipant) {
      const eventData = {
        type: 'gamepadAxes',
        leftAxes: [gamepad.axes[0], gamepad.axes[1]],  // Left joystick
        rightAxes: [gamepad.axes[2], gamepad.axes[3]], // Right joystick
      };

      const strData = JSON.stringify(eventData);
      const data = encoder.encode(strData);
      try {
          room.localParticipant.publishData(data, DataPacket_Kind.LOSSY);
      } catch (error) {
          console.error('Error publishing data:', error);
      }
    }
  }

  requestAnimationFrame(checkGamepad);
};

const handleGamepadButtonEvent = (eventType: string, buttonIndex: number) => {
  if (room && room.localParticipant) {
    const eventData = {
      type: eventType === 'keydown' ? 'gamepadButtonDown' : 'gamepadButtonUp',
      buttonIndex: buttonIndex,
    };
    console.log(eventData);
    const strData = JSON.stringify(eventData);
    const data = encoder.encode(strData);
    try {    
        room.localParticipant.publishData(data, DataPacket_Kind.LOSSY);
    } catch (error) {
        console.error('Error publishing data:', error);
    }
  }
};

// Start the gamepad loop
requestAnimationFrame(checkGamepad);


    return () => {
      window.removeEventListener('mousedown', handleMouseClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [room]);

  if (e2eeEnabled) {
    keyProvider.setKey(decodePassphrase(userChoices.sharedPassphrase));
    room.setE2EEEnabled(true);
  }
  const connectOptions = useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);
  const handleUserInteraction = () => {
    document.body.style.cursor = "none";
    
    if (document.body.requestPointerLock) {
      document.body.requestPointerLock();
    }
  };

  return (
    <>
      {liveKitUrl && (
        <LiveKitRoom
          room={room}
          token={token}
          serverUrl={liveKitUrl}
          connectOptions={connectOptions}
          video={userChoices.videoEnabled}
          audio={userChoices.audioEnabled}
          onDisconnected={onLeave}
          onClick={handleUserInteraction}
        >
          <VideoConference chatMessageFormatter={formatChatMessageLinks} />
          <DebugMode logLevel={LogLevel.info} />
        </LiveKitRoom>
      )}
    </>
  );
};
