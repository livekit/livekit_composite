import React, { useState, useEffect } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoomContext, useVoiceAssistant } from "@livekit/components-react";
import { usePartyState } from "@/hooks/usePartyState";
import { ConnectionState } from "livekit-client";

interface Language {
  code: string;
  name: string;
  flag: string;
}

const LanguageSelect = () => {
  const room = useRoomContext();
  const { agent } = useVoiceAssistant();
  const { state, dispatch } = usePartyState();
  const [languages, setLanguages] = useState<Language[]>([]);

  const handleChange = async (value: string) => {
    dispatch({
      type: "SET_CAPTIONS_LANGUAGE",
      payload: value,
    });
    await room.localParticipant.setAttributes({
      captions_language: value,
    });
  };

  useEffect(() => {
    async function getLanguages() {
      try {
        const response = await room.localParticipant.performRpc({
          destinationIdentity: "agent",
          method: "get/languages",
          payload: "",
        });
        const languages = JSON.parse(response);
        setLanguages(languages);
      } catch (error) {
        console.error("RPC call failed: ", error);
      }
    }

    if (agent) {
      getLanguages();
    }
  }, [room, agent]);

  return (
    <div className="flex items-center">
      <Select
        value={state.captionsLanguage}
        onValueChange={handleChange}
        disabled={!state.captionsEnabled}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Captions language" />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelect;
