export enum VoiceId {
  ARA = "Ara",
  REX = "Rex",
  SAL = "Sal",
  EVE = "Eve",
  LEO = "Leo",
  // Voices not yet available - uncomment when supported:
  // ANI = "Ani",
  // MIKA = "Mika",
  // VALENTINE = "Valentine",
  // GORK = "Gork",
}

export interface Voice {
  id: VoiceId;
  name: string;
  type: string;
  tone: string;
  description: string;
  audioSampleUrl: string;
}

export const voicesData: Record<VoiceId, Voice> = {
  [VoiceId.ARA]: {
    id: VoiceId.ARA,
    name: "Ara",
    type: "Female",
    tone: "Warm, friendly",
    description: "Default voice, balanced and conversational",
    audioSampleUrl: "https://data.x.ai/audio-samples/voice_ara.mp3",
  },
  [VoiceId.REX]: {
    id: VoiceId.REX,
    name: "Rex",
    type: "Male",
    tone: "Confident, clear",
    description: "Professional and articulate, ideal for business applications",
    audioSampleUrl: "https://data.x.ai/audio-samples/voice_rex.mp3",
  },
  [VoiceId.SAL]: {
    id: VoiceId.SAL,
    name: "Sal",
    type: "Neutral",
    tone: "Smooth, balanced",
    description: "Versatile voice suitable for various contexts",
    audioSampleUrl: "https://data.x.ai/audio-samples/voice_sal.mp3",
  },
  [VoiceId.EVE]: {
    id: VoiceId.EVE,
    name: "Eve",
    type: "Female",
    tone: "Energetic, upbeat",
    description: "Engaging and enthusiastic, great for interactive experiences",
    audioSampleUrl: "https://data.x.ai/audio-samples/voice_eve.mp3",
  },
  [VoiceId.LEO]: {
    id: VoiceId.LEO,
    name: "Leo",
    type: "Male",
    tone: "Authoritative, strong",
    description: "Decisive and commanding, suitable for instructional content",
    audioSampleUrl: "https://data.x.ai/audio-samples/voice_leo.mp3",
  },
};

export const voices: Voice[] = Object.values(voicesData);
