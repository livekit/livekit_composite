"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Info, ExternalLink, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { voices, VoiceId } from "@/data/voices";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VoicesShowcaseProps {
  onSelectVoice?: (voiceId: VoiceId) => void;
  currentVoice?: VoiceId;
  onOpenChange?: (open: boolean) => void;
}

function VoiceCardPlayButton({
  audioUrl,
  voiceName,
}: {
  audioUrl: string;
  voiceName: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={handlePlay}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-bg3 border border-border transition-colors hover:bg-bg2 focus:outline-none focus:ring-2 focus:ring-primary/50"
      aria-label={isPlaying ? "Stop voice sample" : "Play voice sample"}
      title={`Preview ${voiceName}'s voice`}
    >
      {isPlaying ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="currentColor"
          className="text-fg0"
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
          className="text-fg0"
        >
          <path d="M3 2.5v9a.5.5 0 00.75.43l7.5-4.5a.5.5 0 000-.86l-7.5-4.5A.5.5 0 003 2.5z" />
        </svg>
      )}
    </button>
  );
}

export function VoicesShowcase({
  onSelectVoice,
  currentVoice,
  onOpenChange,
}: VoicesShowcaseProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="View all voices"
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0">
        <div className="px-6 py-5 border-b border-separator1">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-fg0">
              Available Voices
            </DialogTitle>
            <DialogDescription className="text-base text-fg1 mt-2">
              Choose from {voices.length} unique voice options for your AI
              agent.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {voices.map((voice) => {
              const isSelected = currentVoice === voice.id;
              return (
                <button
                  key={voice.id}
                  onClick={() => {
                    onSelectVoice?.(voice.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex flex-col gap-3 p-4 rounded-lg border transition-all text-left",
                    isSelected
                      ? "border-fgAccent1 bg-bg2 ring-2 ring-fgAccent1/20"
                      : "border-separator1 bg-bg0 hover:bg-bg2 hover:border-fg3"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-fg0">
                          {voice.name}
                        </h3>
                        {isSelected && (
                          <Check className="h-4 w-4 text-fgAccent1 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {voice.type}
                        </Badge>
                        <span className="text-xs text-fg2">{voice.tone}</span>
                      </div>
                    </div>
                    <VoiceCardPlayButton
                      audioUrl={voice.audioSampleUrl}
                      voiceName={voice.name}
                    />
                  </div>
                  <p className="text-sm text-fg1">{voice.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-separator1 bg-bg1">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-fg2">
              Learn more about available voices
            </p>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ExternalLink />}
              onClick={() =>
                window.open(
                  "https://docs.x.ai/docs/guides/voice",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              Voice Documentation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
