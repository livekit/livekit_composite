# How to test your agent using another agent

# Overview

One of the fastest and most efficient ways to test your agent is to use another agent to play the role of your user(s). This agent can also evaluate the interaction and provide feedback once the session has finished.

In this article, we'll discuss how to do this using LiveKit agents.


# Building the Evaluation Agent


## The Evaluation Agent

The evaluation agent can be as simple or as complex as you like. For this article, we're going to use an instruction to the LLM to help guide the testing agent.

The above example is using a tool call to "grade" the answer:

You will probably want to make this function a bit more sophisticated and maybe even using a separate LLM to help evaluate.


## Initializing the Agent

By [default](https://github. com/livekit/agents/blob/7ac734dc1cb2bdb18a01eeeb478c0aa540a14117/livekit-agents/livekit/agents/voice/room_io/room_io. py#L35-L38), agents will only listen to standard participants or SIP callers. To workaround this, you'll need to initialize your agent to interact with agents as well. You can do that by updating the `RoomInputOptions` on agent start:


## Complete Example

See `evals_agent. py` in [this repo](https://github. com/livekit-examples/python-agents-examples/tree/main/evaluating-agents) for the complete example.