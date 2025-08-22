# How to Handle Speech Interruptions More Naturally

When interrupting the agent's speech using the interrupt() function, by default the speech stops immediately. However, you can create more natural-sounding interruptions by customizing the AudioOutput to implement volume fade-out.


## Implementing Volume Fade-out

To achieve a gradual fade-out effect when interrupting speech:


1. Create a custom AudioOutput class that extends the default implementation
2. Override the interrupt handling to gradually decrease the volume before stopping
3. Implement volume ramping based on audio energy levels


> **Note:** This requires custom code implementation and is not available as a built-in feature. Consider your use case carefully to determine if the development effort is worthwhile for your application.


## Alternative Approaches

If implementing custom fade-out is not feasible, consider these alternatives:


- Add brief pauses between sentences in your agent's responses
- Use shorter, more concise responses to reduce the need for interruptions
- Structure dialogue to have natural breaking points