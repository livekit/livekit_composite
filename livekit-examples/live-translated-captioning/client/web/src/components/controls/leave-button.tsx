import { useRoomContext } from "@livekit/components-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X } from "react-feather";

export default function LeaveButton() {
  const room = useRoomContext();
  const router = useRouter();

  const onClose = async () => {
    await room.disconnect();
    router.push("/");
  };

  return (
    <Button
      variant="outline"
      className="bg-red-600 flex items-center justify-center hover:bg-red-400"
      onClick={onClose}
    >
      <X size={16} className="text-white" />
    </Button>
  );
}
