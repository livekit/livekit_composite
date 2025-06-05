import { CollapsibleSection } from "@/components/collapsible-section";
import { JsonPreview } from "@/components/json-preview";
import { MetricBadge } from "@/components/metric-badge";
import { LivekitRoomState } from "@/hooks/use-livekit/use-livekit-state";
import { ConnectionState } from "livekit-client";

const getConnectionStateColor = (state: ConnectionState) => {
  switch (state) {
    case ConnectionState.Connected:
      return "bg-green-500/15 text-green-700 dark:text-green-400";
    case ConnectionState.Connecting:
      return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
    case ConnectionState.Disconnected:
      return "bg-red-500/15 text-red-700 dark:text-red-400";
    default:
      return "bg-gray-500/15 text-gray-700 dark:text-gray-400";
  }
};

export const RoomStateViewer = ({
  connectionState,
  metadata,
  connectionDetails,
  serverInfo,
}: LivekitRoomState) => {
  const serverDetails = {
    protocol: serverInfo?.protocol,
    region: serverInfo?.region,
    nodeId: serverInfo?.nodeId,
    version: serverInfo?.version,
  };

  return (
    <div className="space-y-4">
      <MetricBadge
        label="Connection State"
        value={connectionState}
        className={getConnectionStateColor(connectionState)}
      />

      <CollapsibleSection title="Connection Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <JsonPreview title="Room Metadata" data={metadata} />
          <JsonPreview title="Connection Configuration" data={connectionDetails} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Server Infrastructure">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <MetricBadge label="Protocol" value={serverDetails.protocol} />
          <MetricBadge label="Region" value={serverDetails.region} />
          <MetricBadge label="Node ID" value={serverDetails.nodeId} />
          <MetricBadge label="Server Version" value={serverDetails.version} />
        </div>
      </CollapsibleSection>
    </div>
  );
};
