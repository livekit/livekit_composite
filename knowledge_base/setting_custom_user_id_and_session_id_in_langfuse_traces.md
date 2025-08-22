# Setting custom user_id and session_id in Langfuse traces

When using the Langfuse integration in version 1.2.0 and above, you may want to customize the `user_id` and `session_id` for better session tracking in the Langfuse dashboard.


## Using a Custom Span Processor

While direct customization of these fields isn't available in the `set_tracer_provider` call, you can implement a custom span processor to add this functionality. Here's how:


```
from opentelemetry.sdk.trace import SpanProcessor

class CustomSpanProcessor(SpanProcessor):
    def __init__(self, user_id, session_id):
        self.user_id = user_id
        self.session_id = session_id

    def on_start(self, span, parent_context):
        span.set_attribute("user_id", self.user_id)
        span.set_attribute("session_id", self.session_id)

    def on_end(self, span):
        pass
```

Then add this processor to your tracer provider:


```
tracer_provider.add_span_processor(CustomSpanProcessor(user_id="123", session_id="abc"))
```


> **Note:** Direct support for setting metadata on spans will be added in a future release.