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

import AVKit
import LiveKit
import SwiftUI

struct PiPView: UIViewControllerRepresentable {
    let track: VideoTrack
    let pip: Bool

    @State private var previewController = PreviewViewController()
    @State private var videoCallController = VideoCallViewController()

    func makeUIViewController(context _: Context) -> UIViewController {
        track.add(videoRenderer: previewController)
        track.add(videoRenderer: videoCallController)

        return previewController
    }

    func updateUIViewController(_: UIViewController, context: Context) {
        context.coordinator.toggle()
    }

    func makeCoordinator() -> Coordinator {
        let contentSource = AVPictureInPictureController.ContentSource(activeVideoCallSourceView: previewController.view, contentViewController: videoCallController)
        let controller = AVPictureInPictureController(contentSource: contentSource)
        controller.canStartPictureInPictureAutomaticallyFromInline = true
        controller.setValue(1, forKey: "controlsStyle") // optional, display close/fullscreen buttons

        let coordinator = Coordinator(controller: controller)
        controller.delegate = coordinator
        return coordinator
    }

    final class Coordinator: NSObject, AVPictureInPictureControllerDelegate {
        private let controller: AVPictureInPictureController

        init(controller: AVPictureInPictureController) {
            self.controller = controller
            super.init()
        }

        func toggle() {
            if controller.isPictureInPictureActive {
                controller.stopPictureInPicture()
            } else {
                controller.startPictureInPicture()
            }
        }

        // Implement delegate methods if needed...
    }
}

final class PreviewViewController: UIViewController, VideoRenderer {
    private lazy var renderingView = SampleRenderingView()

    override func loadView() {
        renderingView.sampleBufferDisplayLayer.videoGravity = .resizeAspectFill
        view = renderingView
    }

    var isAdaptiveStreamEnabled: Bool { true }
    var adaptiveStreamSize: CGSize { view.bounds.size }

    func render(frame: LiveKit.VideoFrame) {
        if let sampleBuffer = frame.toCMSampleBuffer() {
            Task { @MainActor in
                renderingView.sampleBufferDisplayLayer.sampleBufferRenderer.enqueue(sampleBuffer)
                renderingView.sampleBufferDisplayLayer.setAffineTransform(CGAffineTransform(rotationAngle: frame.rotation.rotationAngle))
            }
        }
    }
}

final class VideoCallViewController: AVPictureInPictureVideoCallViewController, VideoRenderer {
    private lazy var renderingView = SampleRenderingView()

    override func loadView() {
        renderingView.sampleBufferDisplayLayer.videoGravity = .resizeAspectFill
        view = renderingView
        // or add more subviews...
    }

    var isAdaptiveStreamEnabled: Bool { true }
    var adaptiveStreamSize: CGSize { view.bounds.size }

    func render(frame: LiveKit.VideoFrame) {
        if let sampleBuffer = frame.toCMSampleBuffer() {
            Task { @MainActor in
                renderingView.sampleBufferDisplayLayer.sampleBufferRenderer.enqueue(sampleBuffer)
                renderingView.sampleBufferDisplayLayer.setAffineTransform(CGAffineTransform(rotationAngle: frame.rotation.rotationAngle))
                preferredContentSize = frame.rotatedSize
            }
        }
    }
}

final class SampleRenderingView: UIView {
    override class var layerClass: AnyClass {
        AVSampleBufferDisplayLayer.self
    }

    var sampleBufferDisplayLayer: AVSampleBufferDisplayLayer {
        layer as! AVSampleBufferDisplayLayer
    }
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

extension LiveKit.VideoFrame {
    var rotatedSize: CGSize {
        switch rotation {
        case ._90, ._270: CGSize(width: Int(dimensions.height), height: Int(dimensions.width))
        default: CGSize(width: Int(dimensions.width), height: Int(dimensions.height))
        }
    }
}
