import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCredentials } from "@/hooks/use-credentials";
import { Info, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export const CredentialSettings = () => {
  const { credentials, setCredentials } = useCredentials();
  const [localCredentials, setLocalCredentials] = useState(credentials);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLocalCredentials(credentials);
  }, [credentials]);

  const handleSave = () => {
    setCredentials(localCredentials);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>LiveKit Credentials</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-blue-500/30 px-4 py-3 bg-blue-50/20">
          <p className="text-sm text-blue-600">
            <Info className="me-2 -mt-0.5 inline-block h-4 w-4" />
            Credentials are stored in your browser&apos;s local storage and never been stored on
            server.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>LiveKit URL</Label>
            <Input
              value={localCredentials.LIVEKIT_URL || ""}
              onChange={(e) => setLocalCredentials((c) => ({ ...c, LIVEKIT_URL: e.target.value }))}
              placeholder="wss://your-domain.livekit.cloud"
            />
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              value={localCredentials.LIVEKIT_API_KEY || ""}
              onChange={(e) =>
                setLocalCredentials((c) => ({ ...c, LIVEKIT_API_KEY: e.target.value }))
              }
              placeholder="API_KEY"
            />
          </div>

          <div className="space-y-2">
            <Label>API Secret</Label>
            <Input
              type="password"
              value={localCredentials.LIVEKIT_API_SECRET || ""}
              onChange={(e) =>
                setLocalCredentials((c) => ({ ...c, LIVEKIT_API_SECRET: e.target.value }))
              }
              placeholder="API_SECRET"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
