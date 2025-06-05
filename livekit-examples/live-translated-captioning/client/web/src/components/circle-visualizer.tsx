import { Participant, Track } from "livekit-client";
import { useTrackVolume } from "@livekit/components-react";
import { useState, useEffect, useRef } from "react";

export interface CircleVisualizerProps {
  speaker: Participant;
}

export default function CircleVisualizer({ speaker }: CircleVisualizerProps) {
  // Hook to track the current volume
  const volume = useTrackVolume({
    publication: speaker.audioTrackPublications.values().next().value!,
    source: Track.Source.Microphone,
    participant: speaker,
  });

  // State to control the smoothed volume, used for rendering
  const [smoothedVolume, setSmoothedVolume] = useState(0);

  // Ref to persist the latest smoothed volume across renders
  const lastVolumeRef = useRef(0);

  // Ref to store the most recent raw volume (updated on every volume change)
  const volumeRef = useRef(0);

  // Smoothing factor to control how aggressively the volume is smoothed
  const smoothingFactor = 0.1;

  // Update the volumeRef whenever the volume changes
  useEffect(() => {
    if (volume !== undefined) {
      volumeRef.current = volume; // Update ref with the latest volume
    }
  }, [volume]);

  // Main smoothing logic using an interval
  useEffect(() => {
    const interval = setInterval(() => {
      const currentVolume = volumeRef.current; // Get the latest volume
      const newVolume =
        smoothingFactor * currentVolume +
        (1 - smoothingFactor) * lastVolumeRef.current;

      lastVolumeRef.current = newVolume; // Update the ref for the next iteration
      setSmoothedVolume(newVolume); // Update state for rendering
    }, 25); // Update every 50ms

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [smoothingFactor]); // Only depends on the smoothing factor

  return (
    <div
      style={{
        width: `${Math.round(100 + smoothedVolume * 200)}px`,
        height: `${Math.round(100 + smoothedVolume * 200)}px`,
      }}
      className="bg-black rounded-full absolute flex items-center justify-center"
    >
      <div className="font-bold text-white">{speaker.identity}</div>
    </div>
  );
}
