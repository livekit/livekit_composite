import { CollapsibleSection } from "@/components/collapsible-section";
import { JsonPreview } from "@/components/json-preview";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrackReference } from "@livekit/components-react";

export const TrackViewer = ({ track }: { track: TrackReference }) => {
  const { source, publication } = track;

  const trackMetadata = {
    "Track ID": publication.trackSid,
    "Track Name": publication.trackName || undefined,
    Kind: publication.kind,
    Source: source,
    "Stream ID": publication.track?.mediaStream?.id,
    Bitrate: publication.track?.currentBitrate
      ? `${Math.round(publication.track.currentBitrate / 1000)} kbps`
      : undefined,
    Dimensions: publication.dimensions
      ? `${publication.dimensions.width}x${publication.dimensions.height}`
      : undefined,
    "Muted State": publication.isMuted,
    Encryption: publication.isEncrypted,
    Simulcast: publication.simulcasted,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2 pb-0">
        {Object.entries(trackMetadata).map(([label, value]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{label}</span>
            {typeof value === "boolean" ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  value ? "bg-green-100/20 text-green-600" : "bg-red-100/20 text-red-600"
                )}
              >
                {value ? "Yes" : "No"}
              </Badge>
            ) : (
              <span
                className={cn(
                  "text-sm font-medium truncate",
                  value === undefined && "text-muted-foreground italic"
                )}
              >
                {value === undefined ? "undefined" : value}
              </span>
            )}
          </div>
        ))}
      </div>

      <CollapsibleSection title="Technical Details" defaultExpanded={false}>
        <JsonPreview
          data={{
            sid: publication.trackSid,
            name: publication.trackName,
            kind: publication.kind,
            source: source,
            muted: publication.isMuted,
            encrypted: publication.isEncrypted,
            simulcasted: publication.simulcasted,
            bitrate: publication.track?.currentBitrate,
            dimensions: publication.dimensions,
            mediaStream: publication.track?.mediaStream?.id,
          }}
          collapsed={1}
          displayDataTypes={false}
        />
      </CollapsibleSection>
    </div>
  );
};
