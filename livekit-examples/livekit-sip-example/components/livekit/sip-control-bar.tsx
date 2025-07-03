'use client';

import * as React from 'react';
import { Track } from 'livekit-client';
import { BarVisualizer } from '@livekit/components-react';
import { NumberSquareNineIcon, PhoneDisconnectIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { useSipControlBar } from '@/hooks/useSipControlBar';
import { cn } from '@/lib/utils';
import { DeviceSelect } from './device-select';
import { DtmfKeypad } from './dtmf-keypad';
import { TrackToggle } from './track-toggle';

export interface SipControlBarProps extends React.HTMLAttributes<HTMLDivElement> {
  onDisconnect?: () => void;
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
}

/**
 * A control bar specifically designed for SIP phone calls
 */
export function SipControlBar({
  className,
  onDisconnect,
  onDeviceError,
  ...props
}: SipControlBarProps) {
  const { micTrackRef, microphoneToggle, handleAudioDeviceChange, handleDisconnect } =
    useSipControlBar();
  const [isKeypadOpen, setIsKeypadOpen] = React.useState(false);

  const onLeave = () => {
    handleDisconnect();
    onDisconnect?.();
  };

  return (
    <div className="relative">
      <DtmfKeypad isOpen={isKeypadOpen} onClose={() => setIsKeypadOpen(false)} />
      <div
        aria-label="Phone call controls"
        className={cn(
          'bg-background border-bg2 dark:border-separator1 flex flex-col rounded-[31px] border p-3 drop-shadow-md/3',
          className
        )}
        {...props}
      >
        <div className="flex flex-row justify-between gap-1">
          <div className="flex gap-1">
            <div className="flex items-center gap-0">
              <TrackToggle
                variant="primary"
                source={Track.Source.Microphone}
                pressed={microphoneToggle.enabled}
                disabled={microphoneToggle.pending}
                onPressedChange={microphoneToggle.toggle}
                className="peer/track group/track relative w-auto pr-3 pl-3 md:rounded-r-none md:border-r-0 md:pr-2"
              >
                <BarVisualizer
                  barCount={3}
                  trackRef={micTrackRef}
                  options={{ minHeight: 5 }}
                  className="flex h-full w-auto items-center justify-center gap-0.5"
                >
                  <span
                    className={cn([
                      'h-full w-0.5 origin-center rounded-2xl',
                      'group-data-[state=on]/track:bg-fg1 group-data-[state=off]/track:bg-destructive-foreground',
                      'data-lk-muted:bg-muted',
                    ])}
                  ></span>
                </BarVisualizer>
              </TrackToggle>
              <hr className="bg-separator1 peer-data-[state=off]/track:bg-separatorSerious relative z-10 -mr-px hidden h-4 w-px md:block" />
              <DeviceSelect
                size="sm"
                kind="audioinput"
                onError={(error) =>
                  onDeviceError?.({ source: Track.Source.Microphone, error: error as Error })
                }
                onActiveDeviceChange={handleAudioDeviceChange}
                className={cn([
                  'pl-2',
                  'peer-data-[state=off]/track:text-destructive-foreground',
                  'hover:text-fg1 focus:text-fg1',
                  'hover:peer-data-[state=off]/track:text-destructive-foreground focus:peer-data-[state=off]/track:text-destructive-foreground',
                  'hidden rounded-l-none md:block',
                ])}
              />
            </div>
            <Button
              variant="secondary"
              size="default"
              onClick={() => setIsKeypadOpen(!isKeypadOpen)}
              className="font-mono"
              aria-label="Toggle DTMF keypad"
            >
              <NumberSquareNineIcon weight="bold" />
              <span className="hidden md:inline">KEYPAD</span>
            </Button>
          </div>
          <Button variant="destructive" onClick={onLeave} className="font-mono">
            <PhoneDisconnectIcon weight="bold" />
            <span className="hidden md:inline">END CALL</span>
            <span className="inline md:hidden">END</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
