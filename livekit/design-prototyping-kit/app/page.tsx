import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  return (
    <div className="h-full w-full flex flex-col gap-4 items-center justify-center bg-bg0">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl">Livekit Prototyping Starter Kit</h1>
        <p className="text-fg-1">
          This is a starter kit to help you vibe code faster without having to
          access the monorepo.
        </p>
        <Button variant="primary" size="lg">
          View Github Repo
        </Button>
        <Label>Enter your name</Label>
        <Input placeholder="Enter your name" />
      </div>
    </div>
  );
}
