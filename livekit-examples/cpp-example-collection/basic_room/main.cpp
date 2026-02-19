/*
 * Copyright 2025 LiveKit, Inc.
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

#include <atomic>
#include <csignal>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <string>
#include <thread>
#include <vector>

#include "capture_utils.h"
#include "livekit/livekit.h"

using namespace livekit;

namespace {

std::atomic<bool> g_running{true};

void handleSignal(int) { g_running.store(false); }

void printUsage(const char *prog) {
  std::cerr << "Usage:\n"
            << "  " << prog << " --url <ws-url> --token <token>\n"
            << "Env fallbacks:\n"
            << "  LIVEKIT_URL, LIVEKIT_TOKEN\n";
}

bool parseArgs(int argc, char *argv[], std::string &url, std::string &token, bool &self_test) {
  for (int i = 1; i < argc; ++i) {
    const std::string a = argv[i];
    if (a == "-h" || a == "--help")
      return false;

    if (a == "--self-test") {
      self_test = true;
      return true;
    }

    auto take = [&](std::string &out) -> bool {
      if (i + 1 >= argc)
        return false;
      out = argv[++i];
      return true;
    };

    if (a == "--url") {
      if (!take(url))
        return false;
    } else if (a.rfind("--url=", 0) == 0) {
      url = a.substr(std::string("--url=").size());
    } else if (a == "--token") {
      if (!take(token))
        return false;
    } else if (a.rfind("--token=", 0) == 0) {
      token = a.substr(std::string("--token=").size());
    }
  }

  if (url.empty()) {
    if (const char *e = std::getenv("LIVEKIT_URL"))
      url = e;
  }
  if (token.empty()) {
    if (const char *e = std::getenv("LIVEKIT_TOKEN"))
      token = e;
  }

  return !(url.empty() || token.empty());
}

void print_livekit_version() {
  std::cout
    << "LiveKit version: "
    << LIVEKIT_BUILD_VERSION_FULL
    << " (" << LIVEKIT_BUILD_FLAVOR
    << ", commit " << LIVEKIT_BUILD_COMMIT
    << ", built " << LIVEKIT_BUILD_DATE
    << ")"
    << std::endl;
}

} // namespace

int main(int argc, char *argv[]) {
  print_livekit_version();
  std::string url, token;
  bool self_test = false;
  if (!parseArgs(argc, argv, url, token, self_test)) {
    printUsage(argv[0]);
    return 1;
  }
  if (self_test) {
    livekit::initialize(livekit::LogSink::kConsole);
    livekit::shutdown();
    std::cout << "self-test ok" << std::endl;
    return 0;
  }

  std::signal(SIGINT, handleSignal);

  // Init LiveKit
  livekit::initialize(livekit::LogSink::kConsole);

  auto room = std::make_unique<Room>();

  RoomOptions options;
  options.auto_subscribe = true;
  options.dynacast = false;

  std::cout << "Connecting to: " << url << "\n";
  if (!room->Connect(url, token, options)) {
    std::cerr << "Failed to connect\n";
    livekit::shutdown();
    return 1;
  }

  std::cout << "Connected.\n";

  // ---- Create & publish AUDIO (noise) ----
  // Match your runNoiseCaptureLoop pacing: it assumes frame_ms=10.
  auto audioSource = std::make_shared<AudioSource>(48000, 1, 10);
  auto audioTrack =
      LocalAudioTrack::createLocalAudioTrack("noise", audioSource);

  TrackPublishOptions audioOpts;
  audioOpts.source = TrackSource::SOURCE_MICROPHONE;
  audioOpts.dtx = false;
  audioOpts.simulcast = false;

  std::shared_ptr<LocalTrackPublication> audioPub;
  try {
    audioPub = room->localParticipant()->publishTrack(audioTrack, audioOpts);
    std::cout << "Published audio: sid=" << audioPub->sid() << "\n";
  } catch (const std::exception &e) {
    std::cerr << "Failed to publish audio: " << e.what() << "\n";
  }

  // ---- Create & publish VIDEO (fake RGB) ----
  // Your helper uses VideoFrame::create(1280, 720, BGRA), so match that.
  auto videoSource = std::make_shared<VideoSource>(1280, 720);
  auto videoTrack = LocalVideoTrack::createLocalVideoTrack("rgb", videoSource);

  TrackPublishOptions videoOpts;
  videoOpts.source = TrackSource::SOURCE_CAMERA;
  videoOpts.dtx = false;
  videoOpts.simulcast = false;

  std::shared_ptr<LocalTrackPublication> videoPub;
  try {
    videoPub = room->localParticipant()->publishTrack(videoTrack, videoOpts);
    std::cout << "Published video: sid=" << videoPub->sid() << "\n";
  } catch (const std::exception &e) {
    std::cerr << "Failed to publish video: " << e.what() << "\n";
  }

  // ---- Start synthetic capture loops ----
  std::atomic<bool> audio_running{true};
  std::atomic<bool> video_running{true};

  std::thread audioThread(
      [&] { runNoiseCaptureLoop(audioSource, audio_running); });
  std::thread videoThread(
      [&] { runFakeVideoCaptureLoop(videoSource, video_running); });

  // Keep alive until Ctrl-C
  while (g_running.load()) {
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
  }

  // Stop loops and join threads
  audio_running.store(false);
  video_running.store(false);

  if (audioThread.joinable())
    audioThread.join();
  if (videoThread.joinable())
    videoThread.join();

  // Best-effort unpublish
  try {
    if (audioPub)
      room->localParticipant()->unpublishTrack(audioPub->sid());
    if (videoPub)
      room->localParticipant()->unpublishTrack(videoPub->sid());
  } catch (...) {
  }

  room.reset();
  livekit::shutdown();
  std::cout << "Exiting.\n";
  return 0;
}
