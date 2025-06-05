import Foundation
import KrispNoiseFilter
import LiveKit
import Combine

enum LiveKitKrispNoiseFilterError: Error {
    case globalInitializationFailed
}

public class LiveKitKrispNoiseFilter {
    public var isEnabled: Bool {
        get { _state.isEnabled }
        set { _state.mutate { $0.isEnabled = newValue } }
    }

    private let krisp = KrispNoiseFilter()

    private struct State {
        var isEnabled: Bool = true
        var isInitializedWithRate: Int?
    }

    private let _state = StateSync(State())

    private let errorSubject = PassthroughSubject<String, Never>()
    private var cancellables = Set<AnyCancellable>()

    public init() {
        // This should never fail
        if !KrispNoiseFilter.krispGlobalInit() {
            print("LiveKitKrispNoiseFilter GlobalInit Failed")
        }

        // Throttle high-frequency errors to avoid spamming the console
        errorSubject
            .throttle(for: .seconds(60), scheduler: DispatchQueue.main, latest: true)
            .sink { message in
                print(message)
            }
            .store(in: &cancellables)
    }
}

extension LiveKitKrispNoiseFilter: AudioCustomProcessingDelegate {
    public var audioProcessingName: String { kLiveKitKrispAudioProcessorName }

    // This will be invoked anytime sample rate changes, for example switching Speaker <-> AirPods.
    public func audioProcessingInitialize(sampleRate sampleRateHz: Int, channels: Int) {
        let isFirstInitialize = _state.mutate {
            let result = $0.isInitializedWithRate == nil
            $0.isInitializedWithRate = sampleRateHz
            return result
        }

        if isFirstInitialize {
            krisp.initialize(Int32(sampleRateHz), numChannels: Int32(channels))
        } else {
            // Krisp already initialized, reset with new sample rate.
            krisp.reset(Int32(sampleRateHz))
        }
    }

    public func audioProcessingProcess(audioBuffer: LiveKit.LKAudioBuffer) {
        guard _state.isEnabled else { return }

        guard krisp.isAuthorized else {
            errorSubject.send("LiveKitKrispNoiseFilter disabled - This feature is supported only on LiveKit Cloud.")
            return
        }

        for channel in 0 ..< audioBuffer.channels {
            let result = krisp.process(withBands: Int32(audioBuffer.bands),
                                       frames: Int32(audioBuffer.frames),
                                       bufferSize: Int32(audioBuffer.framesPerBand),
                                       buffer: audioBuffer.rawBuffer(forChannel: channel))
            if !result {
                errorSubject.send("LiveKitKrispNoiseFilter Process failed, channel: \(channel)")
            }
        }
    }

    public func audioProcessingRelease() {
        print("LiveKitKrispNoiseFilter Release")
    }
}

extension LiveKitKrispNoiseFilter: RoomDelegate {
    public func room(_ room: Room, didUpdateConnectionState connectionState: ConnectionState, from oldConnectionState: ConnectionState) {
        krisp.update(room.toContext(connectionState))
    }
}

extension Room {
    func toContext(_ connectionState: ConnectionState) -> LiveKitRoomContext {
        LiveKitRoomContext(sid: sid?.stringValue,
                           name: name,
                           serverVersion: serverVersion,
                           serverRegion: serverRegion,
                           serverNodeId: serverNodeId,
                           connectionState: LiveKitConnectionState(rawValue: connectionState.rawValue) ?? .Disconnected,
                           url: url,
                           token: token)
    }
}
