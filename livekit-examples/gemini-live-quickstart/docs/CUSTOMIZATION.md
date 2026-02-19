# Customization Guide

## Change the agent's persona

The `VisionAgent` class automatically includes video awareness safeguards, so you don't need to include instructions about checking for video availability. Focus your persona instructions on the role-specific behavior and personality.

### Available personas

Choose from these pre-configured personas based on your use case.

#### Standard personas

These personas work with the base configuration without additional changes.

**Yoga Instructor:**
```python
PERSONA_INSTRUCTIONS = """You are a calm, encouraging yoga instructor.
Watch the student's poses and provide gentle corrections.
Focus on alignment, breathing cues, and safety.
Offer modifications for different skill levels."""
```

**Esports Caster:**
```python
PERSONA_INSTRUCTIONS = """You are a high-energy esports commentator.
Call out plays, highlight mechanical skill, and build hype.
Reference common esports terminology and team strategies.
Keep the energy up during slower moments."""
```

**Fitness Trainer:**
```python
PERSONA_INSTRUCTIONS = """You are a motivating fitness trainer.
Watch the user's form and provide real-time feedback.
Encourage proper technique and suggest adjustments.
Keep the energy high and supportive."""
```

#### Advanced personas

These personas require additional configuration changes beyond the base setup.

**Sports Commentator (Strategic Analysis):**
```python
PERSONA_INSTRUCTIONS = """You are an enthusiastic sports commentator providing strategic game analysis and commentary.

Your commentary approach:
- Provide HIGH-LEVEL strategic analysis rather than play-by-play
- Focus on: team names, current score, overall game situation, key players, and game momentum
- Give periodic updates (every 10-15 seconds) with overview commentary
- Identify and name the teams playing when you first see the game
- Track and mention the score when visible
- Discuss the overall flow and strategy of the game
- Comment on significant moments or turning points, not every single play
- Be energetic and insightful, but measured in your pace
- Continue commentary naturally without waiting for user responses, unless interrupted

Remember: You're analyzing the game at a strategic level, not calling every play. Give viewers context and understanding of what's happening overall."""
```

**Required configuration changes:**
- Add `voice` module to imports
- Enable proactive responses in `RealtimeModel` (`proactivity=True`, `enable_affective_dialog=True`, `temperature=0.8`)
- Configure constant video sampling (`video_sampler=voice.VoiceActivityVideoSampler(speaking_fps=1.0, silent_fps=1.0)`)
- Simplify greeting logic

See the [Sports Commentator Configuration Guide](#sports-commentator-configuration-guide) below for step-by-step instructions.

### How to implement a persona

#### For standard personas

Modify the `PERSONA_INSTRUCTIONS` variable at the top of `agent/agent.py`:

```python
# Customize the agent's persona by modifying this variable
PERSONA_INSTRUCTIONS = """Your custom persona instructions here."""
```

Copy the persona instructions from the examples above and paste them into this variable. No other changes needed.

#### For advanced personas

Advanced personas like the Sports Commentator require configuration changes in the `entrypoint` function. Follow the detailed configuration guide for your chosen persona.

#### Passing persona instructions programmatically

If you need to pass different persona instructions at runtime (based on user preferences), pass `persona_instructions` directly to `VisionAgent`:

```python
agent = VisionAgent(
    persona_instructions="""Your custom persona instructions here."""
)
```

#### Overriding instructions completely

If you need full control over the instructions (not recommended for most use cases), override the `__init__` method:

```python
class CustomAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""Your complete instructions here."""
        )
```

### Sports Commentator Configuration Guide

The Sports Commentator persona requires specific configuration changes from the base setup. Follow these steps to implement it.

#### Step 1: Update imports

Add the `voice` module to your imports:

```python
from livekit.agents import AgentServer, AgentSession, Agent, room_io, voice
```

#### Step 2: Set persona instructions

Copy the Sports Commentator persona instructions from the [Advanced personas](#advanced-personas) section above and paste them into the `PERSONA_INSTRUCTIONS` variable at the top of `agent/agent.py`.

#### Step 3: Configure RealtimeModel for proactive responses

Add these three parameters to your `RealtimeModel` configuration:

```python
session = AgentSession(
    llm=google.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        voice="Aoede",
        proactivity=True,              # Allows responses without explicit user prompts
        enable_affective_dialog=True,  # More natural, expressive delivery
        temperature=0.8,               # Response variation (0.6-1.2 valid range)
    ),
)
```

**What these parameters do:**
- `proactivity=True`: Allows the model to respond without waiting for explicit user prompts or questions. This affects user input behavior, not video-based commentary.
- `enable_affective_dialog=True`: Makes the commentary more expressive and natural, improving the commentator's delivery.
- `temperature=0.8`: Controls response variation. Higher values (0.8-1.0) create more varied and interesting commentary.

#### Step 4: Configure constant video sampling

Add a `video_sampler` parameter to your `AgentSession`:

```python
session = AgentSession(
    llm=google.realtime.RealtimeModel(...),
    video_sampler=voice.VoiceActivityVideoSampler(speaking_fps=1.0, silent_fps=1.0),
)
```

Setting both `speaking_fps` and `silent_fps` to `1.0` provides the model with video frames at a constant rate (1 FPS) regardless of voice activity. This gives consistent visual context for strategic analysis and enables the periodic commentary updates.

#### Step 5: Simplify greeting logic

Use a simple greeting without conditional video track checking:

```python
await ctx.connect()

await session.generate_reply(
    instructions="Greet the user briefly and let them know you're ready to provide sports commentary once they share their screen."
)
```

The agent automatically handles video input when available.

#### Complete example

Here's the complete `entrypoint` function with all changes:

```python
@server.rtc_session()
async def entrypoint(ctx: agents.JobContext):
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Aoede",
            proactivity=True,
            enable_affective_dialog=True,
            temperature=0.8
        ),
        video_sampler=voice.VoiceActivityVideoSampler(speaking_fps=1.0, silent_fps=1.0),
    )

    await session.start(
        room=ctx.room,
        agent=VisionAgent(persona_instructions=PERSONA_INSTRUCTIONS),
        room_options=room_io.RoomOptions(
            video_input=True,
        ),
    )
    
    await ctx.connect()
    
    await session.generate_reply(
        instructions="Greet the user briefly and let them know you're ready to provide sports commentary once they share their screen."
    )
```

## Add function calling

Function calling lets the agent interact with external systems or perform actions. Add tools using the `@function_tool` decorator:

```python
from livekit.agents import function_tool

@function_tool
async def save_highlight(
    description: str,
    timestamp: str,
) -> str:
    """Save a highlight moment from the stream.
    
    Args:
        description: What happened in this highlight
        timestamp: When it occurred (e.g., "2:34")
    """
    # In production: save to database, trigger clip creation
    print(f"Highlight saved: {description} at {timestamp}")
    return f"Saved highlight: {description}"

@function_tool
async def lookup_player_stats(
    player_name: str,
    stat_type: str,
) -> str:
    """Look up statistics for a player.
    
    Args:
        player_name: Name of the player
        stat_type: Type of stat (points, rebounds, assists, etc.)
    """
    # In production: call sports API
    return f"{player_name}'s {stat_type}: [mock data]"
```

Then pass the tools to your agent. Note that `VisionAgent` doesn't currently support passing tools directly. For function calling, you'll need to create a custom agent class:

```python
class CustomAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=VisionAgent.BASE_VIDEO_AWARENESS + "\n\n" + "Your persona instructions",
            tools=[save_highlight, lookup_player_stats],
        )
```

## Adjust video settings

Video input is enabled by default in `room_options`. To customize frame rate:

```python
from livekit.agents import room_io, voice

session = AgentSession(
    llm=google.realtime.RealtimeModel(...),
    # Customize video sampling
    video_sampler=voice.VoiceActivityVideoSampler(
        speaking_fps=1.0,  # FPS when user is speaking
        silent_fps=0.3,    # FPS when user is silent
    ),
)

await session.start(
    room=ctx.room,
    agent=VisionAgent(),
    room_options=room_io.RoomOptions(
        video_input=True,
    ),
)
```

**For continuous commentary** (like sports commentators), use constant frame rate regardless of voice activity:

```python
session = AgentSession(
    llm=google.realtime.RealtimeModel(...),
    video_sampler=voice.VoiceActivityVideoSampler(speaking_fps=1.0, silent_fps=1.0),
)
```

This ensures the model receives video frames at Gemini's maximum supported rate (1 FPS at 768x768 resolution) even when the user is silent, providing consistent visual context for continuous commentary.

To disable video entirely, set `video_input=False` in `RoomOptions` or remove the `video_input` parameter.

## Swap voice/model

### Change voice

Modify the `voice` parameter in the `RealtimeModel`:

```python
session = AgentSession(
    llm=google.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        voice="Aoede",  # Options: Aoede, Charon, Fenrir, Kore, Puck
    ),
)
```

### Enable proactive responses

For personas that need to respond without explicit user prompts (like the strategic sports commentator), configure the model with these parameters:

```python
session = AgentSession(
    llm=google.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        voice="Aoede",
        proactivity=True,  # Allows responses without explicit user prompts
        enable_affective_dialog=True,  # More natural, expressive responses
        temperature=0.8,  # Response variation (0.6-1.2 valid range)
    ),
)
```

**Key parameters**:
- `proactivity: bool` - Allows the model to respond without waiting for explicit user prompts or questions. This affects user input behavior, not video-based commentary.
- `enable_affective_dialog: bool` - Makes responses more expressive and natural, improving the commentator's delivery style.
- `temperature: float` - Controls response variation. Valid range is 0.6-1.2. Higher values (0.8-1.0) create more varied and interesting commentary.

**Note**: For video-based continuous commentary (like the strategic sports commentator), the periodic update behavior comes from the persona instructions combined with constant video sampling (`speaking_fps=1.0, silent_fps=1.0`). The `proactivity` parameter affects how the model handles user input, not video feed analysis.

Available models are listed in the [Gemini API documentation](https://ai.google.dev/gemini-api/docs/live).
