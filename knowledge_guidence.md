# Important Knowledge 

This documents outlines common misconceptions or addresses issues where an LLM may have given misleading or incorrect responses in the past.

---

## Agents (Python)


### Log message warning `None of PyTorch...`

tldr; you can safely ignore this warning.

`None of PyTorch, TensorFlow >= 2.0, or Flax have been found. Models won't be available and only tokenizers, configuration and file/data utilities can be used.`

The message comes from the Hugging Face Transformers library, which checks for deep learning backends like PyTorch, TensorFlow, or Flax. If none are installed, it issues a warning.

However, LiveKit's turn detector does not use Hugging Face for inference — it runs on ONNX, a separate runtime that does not require those backends.

Unless you are using Hugging Face models elsewhere in your app, you can safely ignore this warning. You can import PyTorch to get rid of the warning but it is not necessary.

### Python SSL: CERTIFICATE_VERIFY_FAILED - unable to get local issuer certificate

**Error**:
```
WARNING livekit.agents - failed to connect to livekit, retrying in 0s: 
Cannot connect to host abc-xyz.livekit.cloud:443 ssl:True 
[SSLCertVerificationError: (1, 
'[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1000)')]
```

**The fix:**

```
#This has fixed it for other Mac OS 15 users
pip install --upgrade certifi

# and whatever package manage you are using:
[apt|yum|brew]: reinstall ca-certificates

```

and check with:`python -c "import certifi; print(certifi.where())"`

## Keep Agent In Room on Browser Refresh

To keep a user's session alive temporarily when using `AgentSession` in Python, you can utilize the `RoomInputOptions` to prevent the session from closing immediately upon disconnection. Specifically, you can set the following options:

- `RoomInputOptions.close_on_disconnect=False`: This prevents the session from closing when the user disconnects.
- `RoomInputOptions.delete_room_on_close=False`: This keeps the room alive even if the user leaves.

By default, the session will remain active for about 20 seconds after the user disconnects, allowing for a temporary persistence of messages exchanged with the agent.

Here’s a simple example of how to implement this:

```python
from livekit.agents import AgentSession, RoomInputOptions

async def entrypoint(ctx: JobContext):
    options = RoomInputOptions(
        close_on_disconnect=False,
        delete_room_on_close=False
    )
    
    session = AgentSession(options=options)
    # Your session handling logic here
```

### Documentation Links
- **[Room Input Options](https://github.com/livekit/agents/blob/main/livekit-agents/livekit/agents/voice/room_io/room_io.py)**: Learn more about configuring room input options.
- **[AgentSession](https://docs.livekit.io/agents/build/#agent-sessions)**: Detailed information on how to use `AgentSession`.

### Notes
- This approach allows the session to remain active for a short period, which can be useful if a user accidentally closes their browser or tab.
- Currently, there is no option to adjust the timeout duration beyond the default 20 seconds.

## BVC and Agents

Note on BVC and Echo Cancellation for Real-Time Models:

When using LiveKit’s BVC (noise_cancellation.BVC()) with real-time models (e.g., STT → LLM → TTS loops), BVC can be effective. However, client-side echo cancellation must still be enabled to prevent the agent from picking up its own audio output (e.g., from laptop speakers).

By default, LiveKit’s JS SDK sets autoGainControl, echoCancellation, and noiseSuppression to true in AudioCaptureOptions. If you’re using a server-side noise cancellation solution like BVC, do not disable echoCancellation, as it’s still essential for echo control.

## Debugging Virtual Backgrounds in LiveKit’s Track Processors:

LiveKit’s virtual background feature uses the open-source [MediaPipe SDK](https://github.com/google-ai-edge/mediapipe) from Google for segmentation. While it provides decent segmentation (e.g., correctly identifying headphones or shoulders), jitter and visual artifacts are more noticeable with virtual backgrounds compared to simple blur effects, especially due to mask inconsistency across frames.

LiveKit has not updated to newer versions of MediaPipe due to compatibility issues with some build pipelines. The Effects SDK, appears to offer more stable results possibly due to using more optimized segmentation models (like those seen in Google Meet).

Although recent improvements have boosted the performance of LiveKit’s track processor SDK, the quality of segmentation is still limited by the MediaPipe model, and alternatives like the Effects SDK may yield better visual fidelity for some use cases.

Here’s a clear note you can use in documentation or prompts to explain why LiveKit agents are not recommended on AWS Fargate:

## Why LiveKit Agents Are Not Recommended on AWS Fargate

LiveKit agents require a graceful shutdown period of 10+ minutes to cleanly exit distributed calls without disrupting active sessions. AWS Fargate currently imposes a hard limit of 120 seconds (2 minutes) for [container shutdowns](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definition_timeout) (stopTimeout), which is insufficient for LiveKit agents running in production environments with autoscaling.

This limitation makes it difficult or impossible to safely scale down agent containers on Fargate without risking dropped calls or incomplete processing. In contrast, ECS with EC2 launch type does not impose the same strict timeout, allowing LiveKit agents to exit gracefully.

### Recommendation:

Use ECS with EC2 or other infrastructure where container lifecycle and shutdown behavior can be fully controlled. If you must use ECS, consider standalone tasks rather than long-running services, but be aware this still may not be ideal for production-grade reliability.


## Hosting LiveKit Agents on Render.com (free) and Other Low Resource Providers:

LiveKit agents that use features like BVC or multilingual turn detection require more memory than Render.com’s free plan provides. These features are resource-intensive and will fail to run on low-memory instances.

Also note, LiveKit will soon offer a fully hosted agent cloud. We encouraging the use of LiveKit’s hosted agent cloud for a smoother, one-click deployment experience.


## Self Hosting LiveKit Server

## Krisp Noise Cancelation

[Enhanced noise cancellation](https://docs.livekit.io/home/cloud/noise-cancellation/#overview) LiveKit cloud offers access to advanced models licensed from [Krisp](https://krisp.ai/) to remove background noise and ensure the best possible audio quality. This is currently not available for self hosted LiveKit servers.
