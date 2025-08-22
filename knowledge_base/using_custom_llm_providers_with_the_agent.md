# Using Custom LLM Providers with the Agent

While our agent comes pre-configured to work with OpenAI and Anthropic, you can integrate custom LLM providers in two ways:


## Method 1: Using OpenAI-Compatible Endpoints

If your custom LLM framework can produce OpenAI-compatible responses (following the `/chat/completions` format), you can use it by:


1. Setting up your framework to expose an HTTP endpoint that matches OpenAI's format
2. Configuring the agent to use your custom endpoint by changing the base_url in the OpenAI LLM settings
3. Optionally adding any required custom headers or parameters


## Method 2: Customizing the LLM Node

For more advanced integrations, you can customize the `llm_node` directly to call your LLM provider. This gives you complete control over how the agent interacts with your LLM.


> **Note:** This method requires development work to implement the custom integration.

You can find an example of customizing the LLM node in our [GitHub repository](https://github. com/livekit/agents/blob/livekit-agents%401.2.0/examples/voice_agents/llamaindex-rag/chat_engine. py#L56).