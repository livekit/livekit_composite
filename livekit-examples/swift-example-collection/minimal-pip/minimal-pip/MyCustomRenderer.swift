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

import AVFoundation
import AVKit
import LiveKit
import SwiftUI

class MyCustomRendererView: NativeView {
    public let sampleBufferDisplayLayer: AVSampleBufferDisplayLayer
    public lazy var pipController: AVPictureInPictureController = {
        let contentSource = AVPictureInPictureController.ContentSource(sampleBufferDisplayLayer: sampleBufferDisplayLayer,
                                                                       playbackDelegate: self)
        let result = AVPictureInPictureController(contentSource: contentSource)
        result.delegate = self
        return result
    }()

    private var pipPossibleObservation: NSKeyValueObservation?
    private var rotation: LiveKit.VideoRotation?

    override init(frame: CGRect) {
        sampleBufferDisplayLayer = AVSampleBufferDisplayLayer()
        super.init(frame: frame)
        sampleBufferDisplayLayer.videoGravity = .resizeAspectFill
        #if os(macOS)
        // this is required for macOS
        wantsLayer = true
        layer?.insertSublayer(sampleBufferDisplayLayer, at: 0)
        #elseif os(iOS)
        layer.insertSublayer(sampleBufferDisplayLayer, at: 0)
        #else
        fatalError("Unimplemented")
        #endif

        #if os(iOS)
        if #available(iOS 14.2, *) {
            pipController.canStartPictureInPictureAutomaticallyFromInline = true
        }
        #endif

        // Watch isPictureInPicturePossible changes
        pipPossibleObservation = pipController.observe(\AVPictureInPictureController.isPictureInPicturePossible,
                                                       options: [.initial, .new])
        { _, change in
            guard let newValue = change.newValue else { return }
            print("isPictureInPicturePossible: \(newValue)")
        }
    }

    deinit {
        pipPossibleObservation?.invalidate()
    }

    override func performLayout() {
        super.performLayout()

        if let rotation {
            sampleBufferDisplayLayer.setAffineTransform(CGAffineTransform(rotationAngle: rotation.rotationAngle))
        }

        sampleBufferDisplayLayer.frame = bounds
        sampleBufferDisplayLayer.removeAllAnimations()
    }
}

// Conform to VideoRenderer
extension MyCustomRendererView: VideoRenderer {
    var isAdaptiveStreamEnabled: Bool { true }
    var adaptiveStreamSize: CGSize { bounds.size }
    func set(size _: CGSize) {}

    func render(frame: LiveKit.VideoFrame) {

        if rotation != frame.rotation {
            rotation = frame.rotation
            Task { @MainActor in
                setNeedsLayout()
            }
        }

        if let sampleBuffer = frame.toCMSampleBuffer() {
            sampleBufferDisplayLayer.sampleBufferRenderer.enqueue(sampleBuffer)
        }
    }
}

// Conform to AVPictureInPictureSampleBufferPlaybackDelegate
extension MyCustomRendererView: AVPictureInPictureSampleBufferPlaybackDelegate {
    func pictureInPictureController(_: AVPictureInPictureController, setPlaying _: Bool) {}

    func pictureInPictureControllerTimeRangeForPlayback(_: AVPictureInPictureController) -> CMTimeRange {
        CMTimeRange(start: .negativeInfinity, duration: .positiveInfinity)
    }

    func pictureInPictureControllerIsPlaybackPaused(_: AVPictureInPictureController) -> Bool {
        false
    }

    func pictureInPictureController(_: AVPictureInPictureController, didTransitionToRenderSize _: CMVideoDimensions) {}

    func pictureInPictureController(_: AVPictureInPictureController, skipByInterval _: CMTime, completion completionHandler: @escaping () -> Void) {
        completionHandler()
    }
}

extension MyCustomRendererView: AVPictureInPictureControllerDelegate {
    // ...
}

extension LiveKit.VideoRotation {
    var rotationAngle: CGFloat {
        switch self {
        case ._0: return 0
        case ._90: return .pi / 2
        case ._180: return .pi
        case ._270: return 3 * .pi / 2
        @unknown default: return 0
        }
    }
}
