"use client";

import { VoiceSelector } from "@/components/voice-selector";
import { TemperatureSelector } from "./temperature-selector";
import { MaxOutputTokensSelector } from "./max-output-tokens-selector";
import { GrokImageToggle } from "./grok-image-toggle";
import { ConfigurationFormFieldProps } from "./configuration-form";
import { ModelSelector } from "./model-selector";

export function SessionConfig({ form }: ConfigurationFormFieldProps) {
  return (
    <div className="space-y-5">
      <ModelSelector form={form} />
      <VoiceSelector form={form} />
      <TemperatureSelector form={form} />
      <MaxOutputTokensSelector form={form} />
      <GrokImageToggle form={form} />
    </div>
  );
}
