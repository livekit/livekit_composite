import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supportsScreenSharing, ToggleSource } from "@livekit/components-core";
import {
  CameraDisabledIcon,
  CameraIcon,
  ControlBarProps,
  MicDisabledIcon,
  MicIcon,
  ScreenShareIcon,
  ScreenShareStopIcon,
  useLocalParticipantPermissions,
  useMaybeRoomContext,
  useMediaDeviceSelect,
  usePersistentUserChoices,
  useTrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import React from "react";

export const ControlBar = ({
  controls,
  saveUserChoices = true,
  ...props
}: ControlBarProps) => {
  const visibleControls = { leave: true, ...controls };
  const localPermissions = useLocalParticipantPermissions();

  if (!localPermissions) {
    visibleControls.camera = false;
    visibleControls.chat = false;
    visibleControls.microphone = false;
    visibleControls.screenShare = false;
  } else {
    visibleControls.camera ??= localPermissions.canPublish;
    visibleControls.microphone ??= localPermissions.canPublish;
    visibleControls.screenShare ??= localPermissions.canPublish;
    visibleControls.chat ??= localPermissions.canPublishData && controls?.chat;
  }

  const browserSupportsScreenSharing = supportsScreenSharing();

  const {
    saveAudioInputEnabled,
    saveVideoInputEnabled,
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
  } = usePersistentUserChoices({ preventSave: !saveUserChoices });

  return (
    <div
      {...props}
      className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg mt-3"
    >
      {visibleControls.microphone && (
        <MediaDeviceControl
          className="flex-1 min-w-[300px]"
          label="Microphone"
          source={Track.Source.Microphone}
          kind="audioinput"
          setDeviceEnabled={saveAudioInputEnabled}
          setDeviceId={saveAudioInputDeviceId}
          enabledIcon={MicIcon}
          disabledIcon={MicDisabledIcon}
        />
      )}
      {visibleControls.camera && (
        <MediaDeviceControl
          className="flex-1 min-w-[300px]"
          label="Camera"
          source={Track.Source.Camera}
          kind="videoinput"
          setDeviceEnabled={saveVideoInputEnabled}
          setDeviceId={saveVideoInputDeviceId}
          enabledIcon={CameraIcon}
          disabledIcon={CameraDisabledIcon}
        />
      )}
      {visibleControls.screenShare && browserSupportsScreenSharing && (
        <MediaDeviceControl
          className="flex-1 min-w-[300px]"
          label="Screen Share"
          source={Track.Source.ScreenShare}
          kind="videoinput"
          setDeviceEnabled={saveVideoInputEnabled}
          setDeviceId={saveVideoInputDeviceId}
          enabledIcon={ScreenShareIcon}
          disabledIcon={ScreenShareStopIcon}
        />
      )}
    </div>
  );
};

const MediaDeviceControl = <T extends ToggleSource>({
  label,
  source,
  kind,
  setDeviceEnabled,
  setDeviceId,
  enabledIcon: EnabledIcon,
  disabledIcon: DisabledIcon,
  className,
}: {
  label: string;
  source: T;
  kind: MediaDeviceKind;
  setDeviceEnabled: (enabled: boolean) => void;
  setDeviceId: (deviceId: string) => void;
  enabledIcon: React.ElementType;
  disabledIcon: React.ElementType;
  className?: string;
}) => {
  const room = useMaybeRoomContext();
  const { buttonProps, enabled } = useTrackToggle({
    source,
    onChange: setDeviceEnabled,
  });
  const { devices, activeDeviceId, setActiveMediaDevice } =
    useMediaDeviceSelect({
      kind,
      room,
      requestPermissions: true,
    });

  return (
    <div
      className={cn(
        "flex items-center gap-2 bg-background rounded-md p-2 transition-all",
        "border group",
        "flex-grow basis-[300px]",
        className
      )}
    >
      <Button
        {...buttonProps}
        variant="ghost"
        className={cn(
          "h-9 px-4 transition-all duration-200",
          enabled ? "justify-between" : "w-full"
        )}
      >
        <div className="flex items-center gap-2">
          {enabled ? (
            <EnabledIcon className="w-4 h-4 text-green-500" />
          ) : (
            <DisabledIcon className="w-4 h-4 text-red-500" />
          )}
          <span>{label}</span>
        </div>
      </Button>
      {enabled && (
        <Select
          value={activeDeviceId}
          onValueChange={(value) => {
            setActiveMediaDevice(value);
            setDeviceId(value);
          }}
        >
          <SelectTrigger className="h-9 border-l flex-1 min-w-[160px] transition-all duration-200 group-hover:bg-muted/50">
            <SelectValue placeholder="Select device" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
