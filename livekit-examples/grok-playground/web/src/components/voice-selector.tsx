"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  FormField,
  FormControl,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  ConfigurationFormFieldProps,
  ConfigurationFormSchema,
} from "@/components/configuration-form";
import { voices, voicesData, VoiceId } from "@/data/voices";
import { VoicesShowcase } from "@/components/voices-showcase";

function VoicePlayButton({ voiceId }: { voiceId: VoiceId }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const voice = voicesData[voiceId];

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!audioRef.current) {
      audioRef.current = new Audio(voice.audioSampleUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      // Update src in case voice changed
      audioRef.current.src = voice.audioSampleUrl;
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  // Cleanup on unmount or voice change
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Stop playing when voice changes
  React.useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [voiceId]);

  return (
    <button
      type="button"
      onClick={handlePlay}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-bg2 border border-border transition-colors hover:bg-bg3 focus:outline-none focus:ring-2 focus:ring-primary/50"
      aria-label={isPlaying ? "Stop voice sample" : "Play voice sample"}
      title={`Preview ${voice.name}'s voice`}
    >
      {isPlaying ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="currentColor"
          className="text-fg1"
        >
          <rect x="3" y="2" width="3" height="10" rx="0.5" />
          <rect x="8" y="2" width="3" height="10" rx="0.5" />
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="currentColor"
          className="text-fg1"
        >
          <path d="M3 2.5v9a.5.5 0 00.75.43l7.5-4.5a.5.5 0 000-.86l-7.5-4.5A.5.5 0 003 2.5z" />
        </svg>
      )}
    </button>
  );
}

export function VoiceSelector({ form, ...props }: ConfigurationFormFieldProps) {
  return (
    <FormField
      control={form.control}
      name="voice"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center space-y-0 justify-between px-1">
          <div className="flex items-center gap-2">
            <FormLabel className="text-sm font-medium text-fg1">
              Voice
            </FormLabel>
            <VoicesShowcase
              onSelectVoice={(voiceId) => {
                if (
                  ConfigurationFormSchema.shape.voice.safeParse(voiceId).success
                ) {
                  field.onChange(voiceId);
                }
              }}
              currentVoice={field.value}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              onValueChange={(v) => {
                if (ConfigurationFormSchema.shape.voice.safeParse(v).success) {
                  field.onChange(v);
                }
              }}
              defaultValue={form.formState.defaultValues!.voice!}
              value={field.value}
              aria-label="Voice"
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Choose voice" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem
                    key={`select-item-voice-${voice.id}`}
                    value={voice.id}
                  >
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <VoicePlayButton voiceId={field.value as VoiceId} />
          </div>
        </FormItem>
      )}
    />
  );
}
