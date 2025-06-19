# Agent Flow Patterns

Examples demonstrating different approaches to modeling conversational flows with LiveKit agents, from simple linear progressions to complex state-based interactions.

## Overview

As conversational AI applications grow in complexity, the way we model agent behavior becomes increasingly important. This directory contains three examples that demonstrate different patterns for managing conversational flows, each suited to different levels of complexity.

## The Challenge: Flows vs States

When building conversational agents, you'll encounter a fundamental design choice: should you model your conversation as a **flow** (like a flowchart) or as **states** (like a state machine)?

### When Flowcharts Work Well

Flowcharts are great for conversations that:
- Follow a predictable sequence
- Have clear start and end points
- Branch based on simple conditions
- Are easy to visualize and debug

**Example**: A personality quiz that asks 3 questions and gives you a result.

### When State Machines Shine

State machines become valuable when conversations:
- Can revisit previous topics
- Depend on accumulated context or memory
- Have complex conditional transitions
- Need cycles or non-linear paths

**Example**: An NPC in a game who remembers past interactions and responds differently based on relationship status.

## The Examples

### 1. Simple Flow (`simple_flow.py`)

**Pattern**: Function-based agent transitions with direct branching

This example shows the most straightforward approach where each agent directly returns the next agent in the flow. Perfect for linear conversations with minimal branching.

**Key Features**:
- Each agent class handles one step
- Transitions happen via function returns
- State is passed through constructor parameters
- Easy to follow and debug

**Flow**:
```
GreetingAgent → AskColorAgent → SummaryAgent
```

**Use Cases**:
- Simple intake forms
- Linear tutorials
- Basic customer service scripts

### 2. Declarative Flow (`declarative_flow.py`)

**Pattern**: Dictionary-based flow definition with lambda transitions

This approach separates flow logic from agent implementation, making it easier to visualize and modify the overall conversation structure.

**Key Features**:
- Flow defined as a dictionary/config
- Transitions determined by lambda functions
- Reusable agent components
- Clear separation of concerns

**Flow Definition**:
```python
flow = {
    "collect_name": {
        "agent": CollectNameAgent,
        "next": lambda state: "collect_email"
    },
    "collect_email": {
        "agent": CollectEmailAgent,
        "next": lambda state: "summary"
    },
    "summary": {
        "agent": SummaryAgent,
        "next": None
    }
}
```

**Use Cases**:
- Multi-step forms with conditional logic
- Surveys with branching paths
- Wizards and guided workflows

### 3. Multi-Stage Flow (`multi_stage_flow.py`)

**Pattern**: Complex branching with multiple decision points

This example demonstrates a sophisticated branching survey where each choice leads to different follow-up questions, creating a tree-like conversation structure.

**Key Features**:
- Multiple stages with branching paths
- Enum-based choices for type safety
- Detailed path tracking
- Follow-up questions based on answers

**Flow Structure**:
```
Stage 1: A or B?
├── A → Why A? → Stage 2
└── B → Why B? → Stage 2

Stage 2: X or Y?
├── X → What about X? → Stage 3
└── Y → What about Y? → Stage 3

Stage 3: M or N?
├── M → Why M? → Summary
└── N → Why N? → Summary
```

**Use Cases**:
- Personality assessments
- Diagnostic questionnaires
- Complex customer support flows
- Interactive storytelling

## Choosing the Right Pattern

### Simple Use Case?
Use **simple_flow.py** style:
- Direct agent-to-agent transitions
- Minimal state management
- Quick to implement

### Medium Complexity?
Use **declarative_flow.py** style:
- Centralized flow definition
- Easier to visualize and modify
- Reusable components

### High Complexity?
Consider:
- State machines for non-linear conversations
- Behavior trees for complex decision logic
- Hybrid approaches combining flows and states

## Advanced Concepts

### Mixing Patterns

Sometimes the best approach combines multiple patterns:
- Use flow models for high-level structure
- Implement state machines within individual agents
- Add memory and context tracking as needed

## Running the Examples

Each example can be run independently:

```bash
# Simple linear flow
python simple_flow.py console

# Declarative flow with config
python declarative_flow.py console

# Complex branching survey
python multi_stage_flow.py console
```

## Prerequisites

- Python 3.10+
- `livekit-agents`>=1.0
- LiveKit account and credentials
- API keys for:
  - OpenAI (for LLM)
  - Deepgram (for STT)
  - Cartesia (for TTS)

## Customization Ideas

1. **Add Persistence**: Save conversation state to resume later
2. **Dynamic Flows**: Load flow definitions from external sources
3. **Analytics**: Track path frequencies and drop-off points
4. **A/B Testing**: Randomly assign users to different flow variants
5. **Flow Builder**: Create a visual tool to design flows

## Key Takeaways

- Start simple and add complexity only when needed
- Separate flow logic from agent implementation when possible
- Consider future requirements when choosing a pattern
- Remember that you can always refactor as complexity grows