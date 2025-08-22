# Building Multi-Agent Architectures with LiveKit Agents

## Overview

When designing a multi-agent architecture with LiveKit, developers often ask:


- **Is**`function_tool`**the best way to transfer control or tasks between agents?**
- **Is using a**`UserData`**class the best way to make agents stateless?**

Based on internal development and customer implementations, the answer to both is **yes**.


## Transferring Between Agents withfunction_tool


- `function_tool` is the recommended way for **agents to invoke each other’s capabilities** or pass control.
- It provides a structured, reliable mechanism for chaining agents without requiring complex manual orchestration.
- This ensures clear **responsibility boundaries** and makes agents more composable.

📌 Example use case: An intake agent can forward structured data to a specialist agent (e. g., medical triage, billing, or scheduling) via `function_tool`, rather than embedding all logic into a single monolithic agent.


## Stateless Agents withUserData


- By default, agents should remain **stateless** to maximize scalability and reusability.
- The `UserData`**class** provides a consistent way to attach contextual information across interactions without binding state to the agent itself.
- This makes it easier to: Run agents across distributed systems. Maintain clean separation between logic and session-specific data. Support fault tolerance and recovery.


## Reference Example

A working example of these concepts is available in the [LiveKit Python agents examples repo](https://github. com/livekit-examples/python-agents-examples/blob/main/complex-agents/medical_office_triage/triage. py#L85).

This example demonstrates:


- Multiple agents collaborating to handle a medical office triage flow.
- Use of `function_tool` for inter-agent communication.
- Application of `UserData` for maintaining context without binding state to an agent.


## 4. Key Takeaways


- ✅ Use `function_tool` to delegate tasks between agents.
- ✅ Use `UserData` for context management, keeping agents stateless.
- ✅ Stateless, modular agents are easier to scale, maintain, and extend.
- ✅ Example implementations are available in the [LiveKit Python agents repo](https://github. com/livekit-examples/python-agents-examples).