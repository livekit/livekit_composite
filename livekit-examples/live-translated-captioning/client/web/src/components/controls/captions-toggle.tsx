import { Button } from "@/components/ui/button";
import { usePartyState } from "@/hooks/usePartyState";
import { BiSolidCaptions, BiCaptions } from "react-icons/bi";

export default function CaptionsToggle() {
  const { state, dispatch } = usePartyState();

  return (
    <Button
      variant="outline"
      className=" flex items-center justify-center"
      onClick={(e) => {
        dispatch({
          type: "SET_CAPTIONS_ENABLED",
          payload: !state.captionsEnabled,
        });
      }}
    >
      {state.captionsEnabled ? (
        <BiSolidCaptions style={{ width: "24px", height: "24px" }} />
      ) : (
        <BiCaptions style={{ width: "24px", height: "24px" }} />
      )}
    </Button>
  );
}
