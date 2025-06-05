# Overview

This example shows how to test or evaluate an agent using another agent.

# How to Run

1. Run both agents

``` console
python agent_to_test.py start
python agent_evals.py start
```

2. Dispatch agents to the same room

``` console
lk dispatch create \
  --agent-name agent_to_test \  
  --room my-room \
  --metadata 'my_job_metadata'

lk dispatch create \
--agent-name agent_evaluator \
  --room my-room \
  --metadata 'my_job_metadata'
```
