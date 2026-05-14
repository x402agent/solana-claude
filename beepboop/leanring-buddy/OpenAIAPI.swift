//
//  OpenAIAPI.swift
//  OpenAI API Implementation with Responses API support
//

import Foundation

/// OpenAI API helper for vision analysis through the Clawd Gateway.
class OpenAIAPI {
    private let apiURL: URL
    var model: String
    private let session: URLSession

    init(proxyURL: String, model: String = "gpt-5.5") {
        self.apiURL = URL(string: proxyURL)!
        self.model = model

        // Use .default instead of .ephemeral so TLS session tickets are cached.
        // Ephemeral sessions do a full TLS handshake on every request, which causes
        // transient -1200 (errSSLPeerHandshakeFail) errors with large image payloads.
        // Disable URL/cookie caching to avoid storing responses or credentials on disk.
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 120
        config.timeoutIntervalForResource = 300
        config.waitsForConnectivity = true
        config.urlCache = nil
        config.httpCookieStorage = nil
        self.session = URLSession(configuration: config)

        // Fire a lightweight HEAD request in the background to pre-establish the TLS
        // connection. This caches the TLS session ticket so the first real API call
        // (which carries a large image payload) doesn't need a cold TLS handshake.
        warmUpTLSConnection()
    }

    private func makeAPIRequest() -> URLRequest {
        var request = URLRequest(url: apiURL)
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return request
    }

    /// Detects the MIME type of image data by inspecting the first bytes.
    private func detectImageMediaType(for imageData: Data) -> String {
        if imageData.count >= 4 {
            let pngSignature: [UInt8] = [0x89, 0x50, 0x4E, 0x47]
            let firstFourBytes = [UInt8](imageData.prefix(4))
            if firstFourBytes == pngSignature {
                return "image/png"
            }
        }
        return "image/jpeg"
    }

    /// Sends a no-op HEAD request to the API host to establish and cache a TLS session.
    /// Failures are silently ignored — this is purely an optimization.
    private func warmUpTLSConnection() {
        guard var warmupURLComponents = URLComponents(url: apiURL, resolvingAgainstBaseURL: false) else {
            return
        }

        warmupURLComponents.path = "/"
        warmupURLComponents.query = nil
        warmupURLComponents.fragment = nil

        guard let warmupURL = warmupURLComponents.url else {
            return
        }

        var warmupRequest = URLRequest(url: warmupURL)
        warmupRequest.httpMethod = "HEAD"
        warmupRequest.timeoutInterval = 10
        session.dataTask(with: warmupRequest) { _, _, _ in
            // Response doesn't matter — the TLS handshake is the goal
        }.resume()
    }

    /// Send a vision request to OpenAI with streaming Responses API events.
    func analyzeImageStreaming(
        images: [(data: Data, label: String)],
        systemPrompt: String,
        conversationHistory: [(userPlaceholder: String, assistantResponse: String)] = [],
        userPrompt: String,
        onTextChunk: @MainActor @Sendable (String) -> Void
    ) async throws -> (text: String, duration: TimeInterval) {
        let startTime = Date()

        var request = makeAPIRequest()
        var inputItems: [[String: Any]] = []

        for (userPlaceholder, assistantResponse) in conversationHistory {
            inputItems.append(["role": "user", "content": userPlaceholder])
            inputItems.append(["role": "assistant", "content": assistantResponse])
        }

        var contentBlocks: [[String: Any]] = []
        for image in images {
            contentBlocks.append([
                "type": "input_text",
                "text": image.label
            ])
            contentBlocks.append([
                "type": "input_image",
                "image_url": "data:\(detectImageMediaType(for: image.data));base64,\(image.data.base64EncodedString())",
                "detail": "original"
            ])
        }
        contentBlocks.append([
            "type": "input_text",
            "text": userPrompt
        ])
        inputItems.append(["role": "user", "content": contentBlocks])

        let body: [String: Any] = [
            "model": model,
            "instructions": systemPrompt,
            "input": inputItems,
            "stream": true,
            "store": false,
            "max_output_tokens": 1024,
            "reasoning": [
                "effort": "low"
            ]
        ]

        let bodyData = try JSONSerialization.data(withJSONObject: body)
        request.httpBody = bodyData
        let payloadMB = Double(bodyData.count) / 1_048_576.0
        print("OpenAI streaming request: \(String(format: "%.1f", payloadMB))MB, \(images.count) image(s)")

        let (byteStream, response) = try await session.bytes(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(
                domain: "OpenAIAPI",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid HTTP response"]
            )
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            var errorBodyChunks: [String] = []
            for try await line in byteStream.lines {
                errorBodyChunks.append(line)
            }
            let errorBody = errorBodyChunks.joined(separator: "\n")
            throw NSError(
                domain: "OpenAIAPI",
                code: httpResponse.statusCode,
                userInfo: [NSLocalizedDescriptionKey: "API Error (\(httpResponse.statusCode)): \(errorBody)"]
            )
        }

        var accumulatedResponseText = ""

        for try await line in byteStream.lines {
            guard line.hasPrefix("data: ") else { continue }
            let jsonString = String(line.dropFirst(6))
            guard jsonString != "[DONE]" else { break }

            guard let jsonData = jsonString.data(using: .utf8),
                  let eventPayload = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                  let eventType = eventPayload["type"] as? String else {
                continue
            }

            if eventType == "response.output_text.delta",
               let textChunk = eventPayload["delta"] as? String {
                accumulatedResponseText += textChunk
                let currentAccumulatedText = accumulatedResponseText
                await onTextChunk(currentAccumulatedText)
            } else if eventType == "response.output_text.done",
                      let finalizedText = eventPayload["text"] as? String,
                      accumulatedResponseText.isEmpty {
                accumulatedResponseText = finalizedText
                await onTextChunk(finalizedText)
            } else if eventType == "error" {
                let message = eventPayload["message"] as? String ?? String(describing: eventPayload)
                throw NSError(
                    domain: "OpenAIAPI",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Streaming error: \(message)"]
                )
            }
        }

        let duration = Date().timeIntervalSince(startTime)
        return (text: accumulatedResponseText, duration: duration)
    }

    /// Send a vision request to OpenAI with one or more labeled images.
    func analyzeImage(
        images: [(data: Data, label: String)],
        systemPrompt: String,
        conversationHistory: [(userPlaceholder: String, assistantResponse: String)] = [],
        userPrompt: String
    ) async throws -> (text: String, duration: TimeInterval) {
        let startTime = Date()

        var request = makeAPIRequest()
        var inputItems: [[String: Any]] = []

        for (userPlaceholder, assistantResponse) in conversationHistory {
            inputItems.append(["role": "user", "content": userPlaceholder])
            inputItems.append(["role": "assistant", "content": assistantResponse])
        }

        var contentBlocks: [[String: Any]] = []
        for image in images {
            contentBlocks.append([
                "type": "input_text",
                "text": image.label
            ])
            contentBlocks.append([
                "type": "input_image",
                "image_url": "data:\(detectImageMediaType(for: image.data));base64,\(image.data.base64EncodedString())",
                "detail": "original"
            ])
        }
        contentBlocks.append([
            "type": "input_text",
            "text": userPrompt
        ])
        inputItems.append(["role": "user", "content": contentBlocks])

        let body: [String: Any] = [
            "model": model,
            "instructions": systemPrompt,
            "input": inputItems,
            "store": false,
            "max_output_tokens": 600,
            "reasoning": [
                "effort": "low"
            ]
        ]

        let bodyData = try JSONSerialization.data(withJSONObject: body)
        request.httpBody = bodyData
        let payloadMB = Double(bodyData.count) / 1_048_576.0
        print("OpenAI request: \(String(format: "%.1f", payloadMB))MB, \(images.count) image(s)")

        // Send request
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw NSError(
                domain: "OpenAIAPI",
                code: (response as? HTTPURLResponse)?.statusCode ?? -1,
                userInfo: [NSLocalizedDescriptionKey: "API Error: \(responseString)"]
            )
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        if let outputText = json?["output_text"] as? String {
            let duration = Date().timeIntervalSince(startTime)
            return (text: outputText, duration: duration)
        }

        guard let output = json?["output"] as? [[String: Any]] else {
            throw NSError(
                domain: "OpenAIAPI",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid response format"]
            )
        }

        let text = output.compactMap { outputItem -> String? in
            guard outputItem["type"] as? String == "message",
                  let content = outputItem["content"] as? [[String: Any]] else {
                return nil
            }

            return content.compactMap { contentItem -> String? in
                guard contentItem["type"] as? String == "output_text" else {
                    return nil
                }
                return contentItem["text"] as? String
            }.joined()
        }.joined(separator: "\n")

        guard !text.isEmpty else {
            throw NSError(
                domain: "OpenAIAPI",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Response did not contain output text"]
            )
        }

        let duration = Date().timeIntervalSince(startTime)
        return (text: text, duration: duration)
    }
}
