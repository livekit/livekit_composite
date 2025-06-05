import { ObservableWrapper } from "@/components/observable-wrapper";
import { RecAvatar } from "@/components/rec-avatar";
import { useLivekitParticipantState, useLivekitState } from "@/hooks/use-livekit/use-livekit-state";
import { useSelectRemoteParticipant } from "@/hooks/use-select-remote-participant";
import { cn, formatDate, withExcludedKeys, withIncludedKeys } from "@/lib/utils";
import { RemoteParticipant } from "livekit-client";
import { ParticipantTrackViewer } from "./participant-track-viewer";
import { ParticipantViewer } from "./participant-viewer";

export const RemoteParticipantsViewer = () => {
  const {
    remoteParticipants: { remoteParticipants, activeSpeakerIdentities },
  } = useLivekitState();

  const { selectedParticipant, setSelectedParticipant } = useSelectRemoteParticipant();

  const remoteParticipantIdentities = remoteParticipants.map((p) => p.identity);

  return (
    <div className="flex flex-row">
      {/* Participant List */}
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r">
        <div className="p-2 pb-2 mr-4">
          <h3 className="text-sm font-semibold text-foreground/80 mb-4">
            Participants ({remoteParticipantIdentities.length})
          </h3>
          <div className="space-y-2">
            {remoteParticipantIdentities.map((identity) => (
              <button
                key={identity}
                onClick={() =>
                  setSelectedParticipant(remoteParticipants.find((p) => p.identity === identity))
                }
                className={cn(
                  "w-full flex items-center gap-3 p-3 px-4 rounded-lg transition-colors min-w-48",
                  "hover:bg-muted/50",
                  selectedParticipant?.identity === identity && "bg-muted"
                )}
              >
                <RecAvatar
                  name={identity}
                  isSpeaking={activeSpeakerIdentities.includes(identity)}
                  isSelected={selectedParticipant?.identity === identity}
                />
                <span className="text-sm font-medium truncate ml-1">{identity}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Participant Details */}
      {selectedParticipant ? (
        <div className="p-4 space-y-8 overflow-y-auto ml-2 flex-1">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <RecAvatar
                name={selectedParticipant.identity}
                isSpeaking={activeSpeakerIdentities.includes(selectedParticipant.identity)}
                isSelected={false}
              />
              <div>
                <h2 className="text-xl font-semibold">{selectedParticipant.identity}</h2>
                <p className="text-sm text-muted-foreground">
                  Joined {formatDate(selectedParticipant.joinedAt || new Date())}
                </p>
              </div>
            </div>
            <RemoteParticipantTile participant={selectedParticipant} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a participant to view details
        </div>
      )}
    </div>
  );
};

const RemoteParticipantTile = ({ participant }: { participant: RemoteParticipant }) => {
  const participantState = useLivekitParticipantState(participant);
  return (
    <div className="flex flex-col gap-4">
      <ObservableWrapper
        title="Participant State"
        subtitle={participant.identity}
        state={withExcludedKeys(participantState, ["tracks"])}
      >
        {(state) => <ParticipantViewer {...state} />}
      </ObservableWrapper>
      <ObservableWrapper
        title="Participant Tracks"
        subtitle={participant.identity}
        state={withIncludedKeys(participantState, ["tracks"])}
      >
        {(state) => <ParticipantTrackViewer {...state} />}
      </ObservableWrapper>
    </div>
  );
};
