/*
 * Copyright 2025 LiveKit
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import LiveKit

import AVFoundation
import Combine
import Logging

import CallKit
import PushKit

import LiveKitWebRTC
import SwiftUI

enum CallState {
    case idle
    case errored(Error)
    case activeIncoming
    case activeOutgoing
    case connected
}

class CallManager: NSObject, ObservableObject {
    let logger = Logger(label: "CallManager")

    // Shared global instance
    static let shared = CallManager()

    // State
    @Published var callState: CallState = .idle
    @Published var voipToken: String?
    @Published var activeCallUUID: UUID?

    @AppStorage("url") var url: String = ""
    @AppStorage("token") var token: String = ""

    // CallKit
    private let callController = CXCallController()

    private let provider: CXProvider

    // PushKit
    private let pushRegistry = PKPushRegistry(queue: nil)

    let room = Room()

    var hasActiveCall: Bool {
        switch callState {
        case .activeIncoming, .activeOutgoing, .connected:
            true
        default:
            false
        }
    }

    override private init() {
        // Setup CallKit
        let configuration = CXProviderConfiguration()
        configuration.supportedHandleTypes = [.generic]
        configuration.maximumCallsPerCallGroup = 1
        configuration.maximumCallGroups = 1
        configuration.supportsVideo = false
        provider = CXProvider(configuration: configuration)

        // Setup PushKit
        pushRegistry.desiredPushTypes = [.voIP]
        super.init()
        provider.setDelegate(self, queue: .global(qos: .default))
        pushRegistry.delegate = self

        // Set audio session auto-config off
        AudioManager.shared.audioSession.isAutomaticConfigurationEnabled = false

        // Set audio engine off
        do {
            try AudioManager.shared.setEngineAvailability(.none)
        } catch {
            logger.critical("Failed to set audio engine availablility")
        }
    }

    func startCall(handle: String) async {
        let callUUID = UUID()

        let handle = CXHandle(type: .generic, value: handle)
        let startCallAction = CXStartCallAction(call: callUUID, handle: handle)
        let transaction = CXTransaction(action: startCallAction)

        do {
            try await callController.request(transaction)
            logger.debug("Started call")

            Task { @MainActor in
                activeCallUUID = callUUID
            }
        } catch {
            logger.critical("Failed to start call: \(error)")
        }
    }

    func endCall() async {
        Task { @MainActor in
            // Read `activeCallUUID` on main thread
            guard let callUUID = activeCallUUID else { return }

            Task {
                let endCallAction = CXEndCallAction(call: callUUID)
                let transaction = CXTransaction(action: endCallAction)

                do {
                    try await callController.request(transaction)
                    logger.debug("Ended call")
                } catch {
                    logger.critical("Failed to end call: \(error)")
                }
            }
        }
    }

    func reportIncomingCallAsync(from callerId: String, callerName: String) async throws {
        // There is already an async ver from Apple but we just wrap `reportIncomingCallSync` here for now
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            reportIncomingCallSync(from: callerId, callerName: callerName) { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    // NOTE: Using sync version for background mode compatibility
    func reportIncomingCallSync(from callerId: String, callerName: String, completion: @escaping @Sendable ((any Error)?) -> Void) {
        logger.debug("Incoming call")

        let callUUID = UUID()
        let callUpdate = CXCallUpdate()
        callUpdate.remoteHandle = CXHandle(type: .generic, value: callerId)
        callUpdate.hasVideo = false
        callUpdate.localizedCallerName = callerName

        provider.reportNewIncomingCall(with: callUUID, update: callUpdate, completion: completion)

        Task { @MainActor in
            self.callState = .activeIncoming
            self.activeCallUUID = callUUID
        }
    }
}

// MARK: - Room control

extension CallManager {
    func connectToRoom() async throws {
        // Connect to Room
        try await room.connect(url: url, token: token)
        // Publish mic
        try await room.localParticipant.setMicrophone(enabled: true)
    }

    func disconnectFromRoom() async {
        await room.disconnect()
    }
}

// MARK: - CXProviderDelegate

extension CallManager: CXProviderDelegate {
    func providerDidReset(_: CXProvider) {
        logger.debug("Did reset")

        Task { @MainActor in
            self.activeCallUUID = nil
            self.callState = .idle
        }
    }

    func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
        logger.debug("Call starting...")

        Task { @MainActor in
            self.callState = .activeOutgoing
        }

        Task {
            do {
                provider.reportOutgoingCall(with: action.callUUID, connectedAt: Date())
                try await connectToRoom()

                Task { @MainActor in
                    self.callState = .connected
                }

                logger.debug("Connected to room")
                action.fulfill()
            } catch {
                logger.critical("Failed to connect to room with error: \(error)")
                action.fail()

                Task { @MainActor in
                    self.callState = .errored(error)
                    self.activeCallUUID = nil
                }
            }
        }
    }

    func provider(_: CXProvider, perform action: CXAnswerCallAction) {
        logger.debug("Answer call")

        Task {
            do {
                try await connectToRoom()
                logger.debug("Connected to room")

                Task { @MainActor in
                    self.callState = .connected
                }

                action.fulfill()
            } catch {
                logger.critical("Failed to connect to room with error: \(error)")

                Task { @MainActor in
                    self.callState = .errored(error)
                }

                action.fail()
            }
        }
    }

    func provider(_: CXProvider, perform action: CXEndCallAction) {
        logger.debug("End call")

        Task {
            await disconnectFromRoom()
            action.fulfill()

            Task { @MainActor in
                self.activeCallUUID = nil

                if case .errored = self.callState {
                    // Keep the errored state, for failed incoming cases.
                } else {
                    self.callState = .idle
                }
            }
        }
    }

    func provider(_: CXProvider, perform action: CXSetMutedCallAction) {
        Task {
            do {
                try await room.localParticipant.setMicrophone(enabled: !action.isMuted)
                logger.debug("Muted call: \(action.isMuted)")
                action.fulfill()
            } catch {
                logger.critical("Failed to set microphone enabled: \(!action.isMuted) with error: \(error.localizedDescription)")
                action.fail()
            }
        }
    }

    func provider(_: CXProvider, didActivate session: AVAudioSession) {
        // Audio session can now be activated.
        logger.debug("Did activate session")

        do {
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.mixWithOthers])
            try AudioManager.shared.setEngineAvailability(.default)
        } catch {
            logger.critical("Failed to set engine availability: \(error.localizedDescription)")
        }
    }

    func provider(_: CXProvider, didDeactivate _: AVAudioSession) {
        // Audio session will need to be deactivated.
        logger.debug("Did deactivate session")

        do {
            try AudioManager.shared.setEngineAvailability(.none)
        } catch {
            logger.critical("Failed to set engine availability: \(error.localizedDescription)")
        }
    }
}

// MARK: - PKPushRegistryDelegate

extension CallManager: PKPushRegistryDelegate {
    func pushRegistry(_: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        guard type == .voIP else { return }
        let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()

        logger.info("Push token updated: \(token)")

        Task { @MainActor in
            self.voipToken = token
        }
    }

    func pushRegistry(_: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
        guard type == .voIP else { return }
        logger.info("Push Token invalidated")

        Task { @MainActor in
            voipToken = nil
        }
    }

    func pushRegistry(_: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        guard type == .voIP else {
            completion()
            return
        }

        logger.info("Received push with payload: \(payload.dictionaryPayload)")

        /// NOTE: I've observed that the mic cannot initialized if we don't set .playAndRecord here,
        /// which appears like a bug in my opinion, since ``CallManager/provider(_:didActivate:)``
        /// should be invoked at the right time instead of having to set the session category here.
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.mixWithOthers])
        } catch {
            logger.critical("Failed to configure AVAudioSession: \(error.localizedDescription)")
        }

        // Extract caller information from payload
        let callerId = payload.dictionaryPayload["callerId"] as? String ?? UUID().uuidString
        let callerName = payload.dictionaryPayload["callerName"] as? String ?? "Unknown Caller"

        reportIncomingCallSync(from: callerId, callerName: callerName) { error in
            if let error {
                self.logger.critical("Failed to report incoming call: \(error)")
            } else {
                self.logger.info("Reported incoming call")
            }
            completion()
        }
    }
}
