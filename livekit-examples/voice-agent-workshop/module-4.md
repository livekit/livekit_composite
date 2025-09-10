# Adding metrics collection

In this exercise, we'll add metrics collection to the agent. This includes stats on each components, as well as a custom stat measuring the total time for the agent to respond in audio.

Step 1: Add the import to the `agent.py` file:

    ```python
    from livekit.agents import metrics, MetricsCollectedEvent, AgentStateChangedEvent
    ```

Step 2: Add the metrics collection to the `entrypoint` function, before the `session.start` call:

    ```python
    usage_collector = metrics.UsageCollector()
    last_eou_metrics: metrics.EOUMetrics | None = None

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        nonlocal last_eou_metrics
        if ev.metrics.type == "eou_metrics":
            last_eou_metrics = ev.metrics
        
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: {summary}")

    ctx.add_shutdown_callback(log_usage)

    @session.on("agent_state_changed")
    def _on_agent_state_changed(ev: AgentStateChangedEvent):
        if (
            ev.new_state == "speaking"
            and last_eou_metrics
            and last_eou_metrics.speech_id == session.current_speech.id
        ):
            logger.info(
                f"Agent response - Time to first audio frame: {ev.created_at - last_eou_metrics.last_speaking_time}"
            )
    ```

Now you should see real merics appear in the console when you run the agent.

# Pre-emptive generation

Now we'll turn on a feature to speed up handling of long messages.

Add the pre-emptive generation to the `AgentSession` constructor:

    ```python
    preemptive_generation=True,
    ```

Compare the complete response latency before and after the change.


# Optional: Langfuse tracing

To add Langfuse to the agent, create an account at [Langfuse](https://langfuse.com/) and get an API key (you'll need to create an organization and a project first). 

Step 1: Add your keys to the `.env.local` file:

```
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=
```

Step 2: Import the telemetry modules:

```python
from livekit.agents.telemetry import set_tracer_provider
import os
import base64
```

Step 3: Define the `setup_langfuse` function in the `agent.py` file:

```python
def setup_langfuse(
    host: str | None = None, public_key: str | None = None, secret_key: str | None = None
):
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    public_key = public_key or os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = secret_key or os.getenv("LANGFUSE_SECRET_KEY")
    host = host or os.getenv("LANGFUSE_HOST")

    if not public_key or not secret_key or not host:
        raise ValueError("LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, and LANGFUSE_HOST must be set")

    langfuse_auth = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = f"{host.rstrip('/')}/api/public/otel"
    os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Basic {langfuse_auth}"

    trace_provider = TracerProvider()
    trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    set_tracer_provider(trace_provider)
```

Step 4: Add the `setup_langfuse` function call to the `entrypoint` function:

```python
async def entrypoint(ctx: JobContext):
    setup_langfuse()
```