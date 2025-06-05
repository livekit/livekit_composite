/*
 * Copyright 2024 LiveKit
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
import SwiftUI

class API {
    let encoder = JSONEncoder()
    let decoder = JSONDecoder()

    let apiBaseURL: URL
    var authToken: String?

    init(apiBaseURLString: String) {
        guard let url = URL(string: apiBaseURLString) else {
            fatalError("API Endpoint URL format is incorrect")
        }
        apiBaseURL = url
    }

    public func reset() {
        authToken = nil
    }

    private func prepareRequest(apiPath: String, data: Encodable? = nil) async throws -> URLRequest {
        guard var components = URLComponents(url: apiBaseURL, resolvingAgainstBaseURL: false) else {
            throw LivestreamError.urlFormat
        }

        components.path = apiPath

        guard let url = components.url else {
            throw LivestreamError.urlFormat
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        if let data {
            let jsonData = try encoder.encode(data)
            request.httpBody = jsonData
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        if let authToken {
            request.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    private func post<U: Decodable>(apiPath: String, data: some Encodable) async throws -> U {
        let request = try await prepareRequest(apiPath: apiPath, data: data)
        let (data, _) = try await URLSession.shared.data(for: request)
        do {
            return try decoder.decode(U.self, from: data)
        } catch {
            let dataString = String(data: data, encoding: .utf8)
            logger.error("Failed to decode response: \(String(describing: dataString)), error: \(error)")
            throw error
        }
    }

    private func post(apiPath: String, data: some Encodable) async throws {
        let request = try await prepareRequest(apiPath: apiPath, data: data)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpUrlResponse = response as? HTTPURLResponse, httpUrlResponse.statusCode == 200 else {
            throw LivestreamError.apiError
        }
    }

    private func post(apiPath: String) async throws {
        let request = try await prepareRequest(apiPath: apiPath)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpUrlResponse = response as? HTTPURLResponse, httpUrlResponse.statusCode == 200 else {
            throw LivestreamError.apiError
        }
    }

    public func createStream(_ r: CreateStreamRequest) async throws -> CreateStreamResponse {
        let res: CreateStreamResponse = try await post(apiPath: "/api/create_stream", data: r)
        authToken = res.authToken
        return res
    }

    public func joinStream(_ r: JoinStreamRequest) async throws -> JoinStreamResponse {
        let res: JoinStreamResponse = try await post(apiPath: "/api/join_stream", data: r)
        authToken = res.authToken
        return res
    }

    public func stopStream() async throws {
        assert(authToken != nil)
        try await post(apiPath: "/api/stop_stream")
    }

    public func inviteToStage(identity: Participant.Identity) async throws {
        assert(authToken != nil)
        let p = InviteToStageRequest(identity: identity.stringValue)
        try await post(apiPath: "/api/invite_to_stage", data: p)
    }

    public func removeFromStage(identity: Participant.Identity? = nil) async throws {
        assert(authToken != nil)
        let p = InviteToStageRequest(identity: identity?.stringValue)
        try await post(apiPath: "/api/remove_from_stage", data: p)
    }

    public func raiseHand() async throws {
        assert(authToken != nil)
        try await post(apiPath: "/api/raise_hand")
    }
}
