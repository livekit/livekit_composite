# Debugging Audio/Video Sync Issues in LiveKit Publishing

## Overview

If you've experienced **audio and video drift apart** during publishing, with audio often lagging behind video by **150–300ms**, this article explains the potential causes, common pitfalls, and best practices to minimize A/V sync issues.


## Symptoms


- Client-side playback shows **noticeable desynchronization** between audio and video.
- Server-side monitoring shows `last_video_time - last_audio_time` consistently **positive (>150ms, sometimes ~300ms)**.
- Once drift begins, it does not self-correct.


## Root Causes

Several factors can contribute to A/V sync drift:


1. **Queue Size Too Large**Large `AVSynchronizer` buffer (`queue_size_ms`) can introduce significant lag. Defaulting to values like `1500ms` allows too much buildup.
2. **Blocking Behavior Between Audio and Video Pushes**If both audio and video frames are pushed from the **same task sequentially**, a delay in one stream (e. g., encoding or I/O stall) blocks the other. This leads to drift since one media type is consistently delayed in entering the sync pipeline.
3. **Capture Time & Duration Mismatch**Incorrectly assigning `capture_time_ns` or misaligned `duration` values can skew synchronization.


## Best Practices for Fixing Drift


### ✅Use a Smaller Synchronizer Queue


- Configure `AVSynchronizer(queue_size_ms=200)` or similar.
- Smaller buffers reduce lag and make sync corrections faster.


### ✅Push Audio & Video from Separate Tasks


- Avoid sequential pushes in a single task:`# ❌ Problematic: sequential pushfor audio_frame, video_frame in frames: push(audio_frame) push(video_frame) # ✅ Recommended: independent tasks asyncio. create_task(push(audio_frame)) asyncio. create_task(push(video_frame)) `
- This prevents one stream from blocking the other.


### ✅Verify Capture Timestamps


- Ensure `frame. capture_time_ns` and durations are assigned consistently.
- Mismatched or artificially skewed values will accumulate drift.


## Example: Publishing Code (Before vs After)

**Before (sequential push, large queue):**


```
self._av_sync = AVSynchronizer(queue_size_ms=1500)

for audio_frame, video_frame in frames:
    await self._av_sync.push(audio_frame, ...)
    await self._av_sync.push(video_frame, ...)

```

**After (parallel push, smaller queue):**


```
self._av_sync = AVSynchronizer(queue_size_ms=200)

for audio_frame, video_frame in frames:
    asyncio.create_task(self._av_sync.push(audio_frame, ...))
    asyncio.create_task(self._av_sync.push(video_frame, ...))

```


## Key Takeaways


- A/V drift often comes from **queue size misconfiguration** or **blocking frame pushes**.
- Keep the synchronizer buffer small (≈200ms).
- Push audio and video in **parallel tasks** to avoid blocking.
- Monitor `ΔA/V` (last_video_time – last_audio_time) logs to validate improvements.