import { ActionCard } from "@/components/action-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLivekitAction, useLivekitParticipantState, useLivekitState } from "@/hooks/use-livekit";
import { useLocalParticipant } from "@livekit/components-react";
import { isLocalParticipant, Participant } from "livekit-client";
import { ParticipantPermission } from "livekit-server-sdk";
import { useEffect, useMemo, useState } from "react";

const getPermission = (permissions: ParticipantPermission | undefined) => {
  return {
    canSubscribe: permissions?.canSubscribe ?? true,
    canPublish: permissions?.canPublish ?? true,
    canPublishData: permissions?.canPublishData ?? true,
    canUpdateMetadata: permissions?.canUpdateMetadata ?? false,
    hidden: permissions?.hidden ?? false,
  };
};

export const ParticipantActionPanel = () => {
  const { localParticipant } = useLocalParticipant();

  return <ParticipantActionPanelInner participant={localParticipant} />;
};

export const ParticipantActionPanelInner = ({ participant }: { participant: Participant }) => {
  const {
    permissions: initialPermissions,
    identity,
    name,
    metadata,
    attributes: initialAttributes,
  } = useLivekitParticipantState(participant);

  const isRemoteParticipant = useMemo(() => !isLocalParticipant(participant), [participant]);

  const { room } = useLivekitState();
  const { updateParticipant, removeParticipant } = useLivekitAction();

  // Name Update
  const [nameInput, setNameInput] = useState(name || "");
  const nameChanged = useMemo(() => nameInput !== name, [nameInput, name]);

  // Attributes Update
  const [attributes, setAttributes] = useState<Record<string, string>>(initialAttributes || {});
  const [newAttribute, setNewAttribute] = useState({ key: "", value: "" });
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Metadata Update
  const [metadataInput, setMetadataInput] = useState(metadata || "");
  const metadataChanged = useMemo(() => metadataInput !== metadata, [metadataInput, metadata]);

  // Permissions Update
  const [permissions, setPermissions] = useState(getPermission(initialPermissions));

  useEffect(() => {
    setAttributes(initialAttributes || {});
  }, [initialAttributes]);

  useEffect(() => {
    setMetadataInput(metadata || "");
  }, [metadata]);

  useEffect(() => {
    setNameInput(name || "");
  }, [name]);

  useEffect(() => {
    setPermissions(getPermission(initialPermissions));
  }, [initialPermissions]);

  const handleAddAttribute = () => {
    if (!newAttribute.key || !newAttribute.value) return;

    if (attributes?.hasOwnProperty(newAttribute.key)) {
      setDuplicateError(`Key "${newAttribute.key}" already exists`);
      return;
    }

    setAttributes((prev) => ({ ...prev, [newAttribute.key]: newAttribute.value }));
    setNewAttribute({ key: "", value: "" });
    setDuplicateError(null);
  };

  const handleUpdateAttribute = (oldKey: string, newKey: string, newValue: string) => {
    const updated = { ...attributes };
    delete updated[oldKey];

    if (newKey !== oldKey && attributes?.hasOwnProperty(newKey)) {
      setDuplicateError(`Key "${newKey}" already exists`);
      return;
    }

    updated[newKey] = newValue;
    setAttributes(updated);
    setDuplicateError(null);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Name Update Card */}
      <ActionCard
        title="Display Name"
        description="Change how your name appears in the room"
        action={async () => {
          if (!identity) throw new Error("Participant not found");
          return updateParticipant({
            roomName: room.name,
            identity: identity as string,
            options: { name: nameInput },
          });
        }}
        disabled={!nameChanged}
      >
        <div className="space-y-2">
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter new display name"
          />
          {name && <div className="text-xs text-muted-foreground">Current: {name}</div>}
        </div>
      </ActionCard>

      {/* Attributes Update Card */}
      <ActionCard
        title="Custom Attributes"
        description="Manage key-value pairs (values must be strings)"
        action={async () => {
          if (!identity) throw new Error("Participant not found");

          return updateParticipant({
            roomName: room.name,
            identity: identity as string,
            options: { attributes },
          });
        }}
        disabled={!attributes}
      >
        {Object.entries(attributes || {}).map(([key, value]) => (
          <div key={key} className="flex gap-2 items-center">
            <Input
              value={key}
              onChange={(e) => handleUpdateAttribute(key, e.target.value, value)}
              placeholder="Key"
              className="flex-1"
            />
            <Input
              value={value}
              onChange={(e) => handleUpdateAttribute(key, key, e.target.value)}
              placeholder="Value"
              className="flex-1"
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            value={newAttribute.key}
            onChange={(e) => setNewAttribute((p) => ({ ...p, key: e.target.value }))}
            placeholder="New key"
            className="flex-1"
          />
          <Input
            value={newAttribute.value}
            onChange={(e) => setNewAttribute((p) => ({ ...p, value: e.target.value }))}
            placeholder="New value"
            className="flex-1"
          />
          <Button onClick={handleAddAttribute} disabled={!newAttribute.key || !newAttribute.value}>
            Add Attribute
          </Button>
        </div>

        {duplicateError && <div className="text-sm text-red-500">{duplicateError}</div>}

        {attributes && Object.keys(attributes).length > 0 && (
          <div className="text-xs text-muted-foreground">
            Current attributes: {JSON.stringify(attributes)}
          </div>
        )}
      </ActionCard>

      {/* Metadata Update Card */}
      <ActionCard
        title="Metadata"
        description="Structured participant data"
        action={async () => {
          if (!identity) throw new Error("Participant not found");
          return updateParticipant({
            roomName: room.name,
            identity: identity as string,
            options: { metadata: metadataInput },
          });
        }}
        disabled={!metadataChanged}
      >
        <div className="space-y-2">
          <Textarea
            value={metadataInput}
            onChange={(e) => setMetadataInput(e.target.value)}
            placeholder="Enter metadata"
            rows={4}
            className="font-mono text-sm"
          />
          {metadata && <div className="text-xs text-muted-foreground">Current: {metadata}</div>}
        </div>
      </ActionCard>

      {/* Permissions Update Card */}
      <ActionCard
        title="Permissions"
        description="Manage participant capabilities"
        action={async () => {
          if (!identity) throw new Error("Participant not found");
          return updateParticipant({
            roomName: room.name,
            identity: identity as string,
            options: { permission: permissions },
          });
        }}
        disabled={!permissions}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Media Control</Label>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="canPublish"
                  checked={permissions.canPublish}
                  onCheckedChange={(c) => setPermissions((p) => ({ ...p, canPublish: !!c }))}
                />
                <Label htmlFor="canPublish" className="text-sm">
                  Publish Media
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="canSubscribe"
                  checked={permissions.canSubscribe}
                  onCheckedChange={(c) => setPermissions((p) => ({ ...p, canSubscribe: !!c }))}
                />
                <Label htmlFor="canSubscribe" className="text-sm">
                  Subscribe to Media
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Data Control</Label>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="canPublishData"
                  checked={permissions.canPublishData}
                  onCheckedChange={(c) => setPermissions((p) => ({ ...p, canPublishData: !!c }))}
                />
                <Label htmlFor="canPublishData" className="text-sm">
                  Send Data
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="canUpdateMetadata"
                  checked={permissions.canUpdateMetadata}
                  onCheckedChange={(c) => setPermissions((p) => ({ ...p, canUpdateMetadata: !!c }))}
                />
                <Label htmlFor="canUpdateMetadata" className="text-sm">
                  Update Metadata
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Visibility</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="hidden"
                checked={permissions.hidden}
                onCheckedChange={(c) => setPermissions((p) => ({ ...p, hidden: !!c }))}
              />
              <Label htmlFor="hidden" className="text-sm">
                Hide Participant
              </Label>
            </div>
          </div>
        </div>
      </ActionCard>

      {isRemoteParticipant && (
        <ActionCard
          title="Remove Participant"
          description="Remove participant from the room"
          action={async () => {
            if (!identity) throw new Error("Participant not found");

            return removeParticipant({
              roomName: room.name,
              identity: identity as string,
            });
          }}
        >
          <p className="text-sm text-muted-foreground">
            You are about to remove participant <span className="font-medium">{identity}</span> from
            the room.
          </p>
        </ActionCard>
      )}
    </div>
  );
};
