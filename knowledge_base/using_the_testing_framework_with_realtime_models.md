# Using the Testing Framework with Realtime Models

The LiveKit testing framework allows you to test your agents with both standard LLM models and realtime models. Here's how to properly set up and use the testing framework with realtime models.


## Setting Up Realtime Model Tests

To test an agent with a realtime model, use the following pattern:


```
async with (
    openai.realtime.RealtimeModel(modalities=["text"]) as rt_llm,
    AgentSession(llm=rt_llm, userdata=userdata) as sess,
):
    await sess.start(YourAgent(userdata=userdata))
    result = await sess.run(user_input="...")
```


## Important Notes


- When using realtime models, make sure to specify `modalities=["text"]` as the testing helpers are designed to work with text input and output
- The realtime model must be used within an agent session context manager
- If you're seeing deprecation or resource warnings in Python 3.12, you can suppress them with: `warnings. filterwarnings("ignore", category=DeprecationWarning) warnings. filterwarnings("ignore", category=ResourceWarning)`


## Example Test Cases

For reference implementations of agent tests, you can check out these examples:


- [Drive-thru Agent Test Example](https://github. com/livekit/agents/blob/main/examples/drive-thru/test_agent. py)
- [Front-desk Agent Test Example](https://github. com/livekit/agents/blob/main/examples/frontdesk/test_agent. py)