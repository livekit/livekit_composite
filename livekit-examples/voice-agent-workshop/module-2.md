# Adding turn detection

In this exercise, we'll add a semantic turn detector model to the agent.

Step 1: Intall the package

    ```shell
    uv add "livekit-agents[turn-detector]"
    ```

Step 2: Import the package

    ```python
    from livekit.plugins.turn_detector.multilingual import MultilingualModel
    ```

Step 3: Add the model to the agent (inside the `AgentSession` constructor)

    ```python
    turn_detection=MultilingualModel(),
    ```

Step 4: Run the agent

    ```shell
    uv run agent.py console
    ```

Now you should be able to see the turn detection in action.
