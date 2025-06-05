
<div style='text-align: center; margin-bottom: 1rem; display: flex; justify-content: center; align-items: center;'>
    <h1 style='color: white; margin: 0;'>LiveKit Agents Examples</h1>
    <img src='livekit-logo-dark.png'
         alt="LiveKit Logo"
         style="margin-left: 10px; height: 60px;">
</div>

<div style="display: flex; flex-direction: row; justify-content: center">
<a href="https://github.com/livekit/agents" target="_blank"><img alt="Static Badge" src="https://img.shields.io/badge/github-white?logo=github&logoColor=black"></a>
<a href="https://docs.livekit.io/agents/" target="_blank"><img alt="Static Badge" src="https://img.shields.io/badge/docs-blue?logo=readthedocs&logoColor=white"></a>
</div>

<h3 style='text-align: center'>
Example applications and code snippets for LiveKit Agents
</h3>

This repository contains example code and demo applications for LiveKit Agents, a suite of tools for building, deploying, and scaling real-time voice and video AI agents.

## LiveKit Agents

LiveKit Agents is a Python library that enables you to build intelligent conversational agents with speech, text, and media capabilities. This repository contains examples that demonstrate how to use various features of the library.

## Set Up & Installation

To use these examples, first clone the repository and then install the required dependencies:

```bash
git clone https://github.com/livekit-examples/python-agents-examples.git
cd python-agents-examples

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Key Features of LiveKit Agents

- 🗣️ **Speech and Voice Processing** - Built-in STT, TTS, and VAD capabilities for natural conversations.
- 💬 **Comprehensive LLM Support** - Integrate with OpenAI, Anthropic, Google, and more.
- 📞 **Telephony Integration** - Make and receive SIP calls with your agents.
- 📊 **Metrics and Monitoring** - Track and analyze agent performance.
- 🔄 **Real-time Processing** - Stream audio, text, and video in real-time.
- 📱 **Multi-modal Capabilities** - Handle text, audio, and video simultaneously.
- 🌐 **Multilingual Support** - Transcribe and respond in multiple languages.
- 🧩 **Extensible Plugin System** - Add custom capabilities to your agents.

## Official Documentation

For full documentation of LiveKit Agents, visit [https://docs.livekit.io/agents/](https://docs.livekit.io/agents/)

## Example Demos

<table>
<tr>
<td width="50%">
<h3>🎙️ Listen and Respond</h3>
<p>Basic agent that listens for user input and provides a response.</p>
<p>
<a href="basics/listen_and_respond.py">Code</a>
</p>
</td>
<td width="50%">
<h3>🔄 Uninterruptable</h3>
<p>An agent that continues speaking without being interrupted.</p>
<p>
<a href="basics/uninterruptable.py">Code</a>
</p>
</td>
</tr>

<tr>
<td width="50%">
<h3>🏥 Medical Office Triage</h3>
<p>Agent that triages patients based on symptoms and medical history.</p>
<p>
<a href="complex-agents/medical_office_triage/">Code</a>
</p>
</td>
<td width="50%">
<h3>🛍️ Personal Shopper</h3>
<p>AI shopping assistant that helps find products based on user preferences.</p>
<p>
<a href="complex-agents/personal_shopper/">Code</a>
</p>
</td>
</tr>

<tr>
<td width="50%">
<h3>☎️ Phone Caller</h3>
<p>Agent that can make outbound phone calls and handle conversations.</p>
<p>
<a href="telephony/make_call/">Code</a>
</p>
</td>
<td width="50%">
<h3>🌐 Change Language</h3>
<p>Agent that can switch between different languages during conversation.</p>
<p>
<a href="pipeline-tts/elevenlabs_change_language.py">Code</a>
</p>
</td>
</tr>

<tr>
<td width="50%">
<h3>🔄 TTS Comparison</h3>
<p>Compare different text-to-speech providers side by side.</p>
<p>
<a href="pipeline-tts/tts_comparison.py">Code</a>
</p>
</td>
<td width="50%">
<h3>📞 SIP Warm Handoff</h3>
<p>Transfer calls from an AI agent to a human operator seamlessly.</p>
<p>
<a href="telephony/warm_handoff.py">Code</a>
</p>
</td>
</tr>

<tr>
<td width="50%">
<h3>📝 Transcriber</h3>
<p>Real-time speech transcription with high accuracy.</p>
<p>
<a href="pipeline-stt/transcriber.py">Code</a>
</p>
</td>
<td width="50%">
<h3>🗣️ Realtime OpenAI</h3>
<p>Integrate with OpenAI's streaming API for natural conversations.</p>
<p>
<a href="realtime/openai.py">Code</a>
</p>
</td>
</tr>

<td width="50%">
<h3>🔤 Keyword Detection</h3>
<p>Detect specific keywords in speech in real-time.</p>
<p>
<a href="pipeline-stt/keyword_detection.py">Code</a>
</p>
</td>
<td width="50%">
<h3>🎮 Function Calling</h3>
<p>Implement function calling capabilities in your agents.</p>
<p>
<a href="basics/function_calling.py">Code</a>
</p>
</td>
</tr>

<tr>
<td width="50%">
<h3>📞 SIP Lifecycle</h3>
<p>Complete lifecycle management for SIP calls.</p>
<p>
<a href="telephony/sip_lifecycle.py">Code</a>
</p>
</td>
<td width="50%">
<h3>🔄 Context Variables</h3>
<p>Maintain conversation context across interactions.</p>
<p>
<a href="basics/context_variables.py">Code</a>
</p>
</td>
</tr>

<tr>
<td width="50%">
<h3>🔊 Playing Audio</h3>
<p>Play audio files during agent interactions.</p>
<p>
<a href="basics/playing_audio.py">Code</a>
</p>
</td>
<td width="50%">
<h3>🎙️ Sound Repeater</h3>
<p>Simple sound repeating demo for testing audio pipelines.</p>
<p>
<a href="basics/repeater.py">Code</a>
</p>
</td>
</tr>

<tr>
<td width="50%">
<h3>📱 Raspberry Pi Transcriber</h3>
<p>Run transcription on Raspberry Pi hardware.</p>
<p>
<a href="hardware/pi_zero_transcriber.py">Code</a>
</p>
</td>
<td width="50%">
<h3>📞 Answer Incoming Calls</h3>
<p>Set up an agent to answer incoming SIP calls.</p>
<p>
<a href="telephony/answer_call.py">Code</a>
</p>
</td>
</tr>

<tr>
<td width="50%">
<h3>🤖 Vision Agent 👀</h3>
<p>An AI-powered assistant that can answer questions about what it sees.</p>
<p>
<a href="vision/agent.py">Code</a>
</p>
</td>
</tr>

<tr>
<td width="50%">
<h3>🔍 RAG-Enriched Agent</h3>
<p>An agent that can answer questions about the LiveKit docs site.</p>
<p>
<a href="rag">Code</a>
</p>
</td>
</tr>
</table>

## Code Examples by Category

### Basic Features

- [Listen and Respond](basics/listen_and_respond.py)
- [Uninterruptable Agent](basics/uninterruptable.py)
- [Playing Audio](basics/playing_audio.py)
- [Function Calling](basics/function_calling.py)
- [Context Variables](basics/context_variables.py)
- [Sound Repeater](basics/repeater.py)

### LLM Integrations

- [Anthropic Claude](pipeline-llm/anthropic_llm.py)
- [Cerebras](pipeline-llm/cerebras_llm.py)
- [Google Gemini](pipeline-llm/google_llm.py)
- [Ollama](pipeline-llm/ollama_llm.py)
- [OpenAI](pipeline-llm/openai_llm.py)

### TTS Integrations

- [Cartesia](pipeline-tts/cartesia_tts.py)
- [ElevenLabs](pipeline-tts/elevenlabs_tts.py)
- [OpenAI](pipeline-tts/openai_tts.py)
- [PlayAI](pipeline-tts/playai_tts.py)
- [Rime](pipeline-tts/rime_tts.py)

### STT and Voice Processing

- [Transcription](pipeline-stt/transcriber.py)
- [Keyword Detection](pipeline-stt/keyword_detection.py)

### Realtime Processing

- [OpenAI Streaming](realtime/openai.py)

### Advanced LLM Features

- [Interrupt User](pipeline-llm/interrupt_user.py)
- [LLM Content Filter](pipeline-llm/llm_powered_content_filter.py)
- [Simple Content Filter](pipeline-llm/simple_content_filter.py)
- [Replacing LLM Output](pipeline-llm/replacing_llm_output.py)

### Translation Features

- [Pipeline Translator](translators/pipeline_translator.py)
- [TTS Translator](translators/tts_translator.py)

### Telephony

- [Answer Call](telephony/answer_call.py)
- [SIP Lifecycle](telephony/sip_lifecycle.py)
- [Warm Handoff](telephony/warm_handoff.py)
- [Survey Caller](telephony/survey_caller/)

### Metrics and Monitoring

- [LLM Metrics](metrics/metrics_llm.py)
- [STT Metrics](metrics/metrics_stt.py)
- [TTS Metrics](metrics/metrics_tts.py)
- [VAD Metrics](metrics/metrics_vad.py)

### Hardware Integration

- [Raspberry Pi Transcriber](hardware/pi_zero_transcriber.py)

### Vision Agents

- [Vision Agent](/vision/agent.py)

## Complex Demo Agents

- [Medical Office Triage](complex-agents/medical_office_triage/)
- [Personal Shopper](complex-agents/personal_shopper/)
- [RAG-Enriched Agent](rag/)
