# How can I reduce latency in voice agents using STT, TTS and LLM?

# Context

When implementing voice agents that utilize Speech-to-Text (STT), Text-to-Speech (TTS), and Large Language Models (LLM), latency can impact the performance and user experience. Understanding how to optimize these components is crucial for maintaining efficient operations.


# Answer

The primary way to reduce latency for voice agents is to optimize the network proximity between your agent and the various services it uses. Here's what you should consider:


1. Ensure your agent is close (in terms of network latency) to your: LLM serviceSpeech-to-Text serviceText-to-Speech service
2. Check the provider's documentation for specific optimization recommendations: LLM. STT, and TTS providers often have guidelines on their sites for how to optimize for their service.
3. Use the Agents [metrics API](https://docs. livekit. io/agents/build/metrics/)to understand how much latency the agent is experiencing.


> **Note:** The most important latency metrics to focus on initially are Time To First Token (TTFT), and Time To First Byte (TTFB).