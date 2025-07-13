# Creating and Publishing Custom Metrics

While LiveKit provides standard metrics out of the box, you can also create and publish your own custom metrics to track additional data points specific to your needs.


## Setting Up Custom Metrics

Follow these steps to implement custom metrics:


### 1. Define Custom Metric Classes

First, create the base classes for your custom metrics:


```
class CustomMetrics(BaseModel):  
    type: Literal["custom_metrics"] = "custom_metrics"  
    label: str  
    timestamp: float  
    custom_value: float


class CustomMetricsCollectedEvent(BaseModel):
    type: Literal["custom_metrics_collected"] = "custom_metrics_collected"
    metrics: CustomMetrics
    created_at: float = Field(default_factory=time.time)
```


### 2. Add Event Listener

Set up a listener to handle the custom metric events:


```
@session.on("custom_metrics_collected")
def _on_custom_metrics_collected(ev: MetricsCollectedEvent):
    logger.info(f"Custom metrics: {ev}")
```


### 3. Create and Emit Metrics

To publish a custom metric:


```
# Create the custom metric
custom_metric = CustomMetrics(  
    label="my_custom_metric",  
    timestamp=time.time(),  
    custom_value=42.0  
)  

# Emit the metric
session.emit("custom_metrics_collected", CustomMetricsCollectedEvent(metrics=custom_metric))
```

When the metric is emitted, you'll see it appear in your logs through the listener you configured.


> **Note:** You can use this approach to track any custom numerical values, such as API response times, processing durations, or other application-specific metrics.