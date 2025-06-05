import { useMediaDeviceSelect } from "@livekit/components-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DeviceSelector() {
  const deviceSelect = useMediaDeviceSelect({ kind: "audioinput" });
  const [selectedDeviceName, setSelectedDeviceName] = useState("");

  const handleChange = async (value: string) => {
    deviceSelect.setActiveMediaDevice(value);
  };

  useEffect(() => {
    deviceSelect.devices.forEach((device) => {
      if (device.deviceId === deviceSelect.activeDeviceId) {
        setSelectedDeviceName(device.label);
      }
    });
  }, [deviceSelect.activeDeviceId, deviceSelect.devices, selectedDeviceName]);

  return (
    <Select value={deviceSelect.activeDeviceId} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Active microphone" />
      </SelectTrigger>
      <SelectContent>
        {deviceSelect.devices.map((device) => (
          <SelectItem key={device.deviceId} value={device.deviceId}>
            {device.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
