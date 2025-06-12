# How do I configure BarVisualizer in React?

# Context

When implementing the BarVisualizer component in a React application, users may encounter an issue with changing the color.


# Answer

To properly configure and style the BarVisualizer component in your React application, follow these steps:


1. First, import the required styles by adding the following import statement to your component file: `import '@livekit/components-styles'`
2. To customize the appearance of the bars, you can use either CSS classes or CSS variables: Using CSS classes:`. lk-audio-bar { /* styles for idle bars */ }. lk-audio-bar. lk-highlighted { /* styles for active bars */ }`Or using CSS variables:`: root { --lk-fg: /* color for active bars */; --lk-va-bg: /* color for idle bars */; }`
3. For custom bar templates, you can provide a child element to the BarVisualizer component: `<BarVisualizer> <div class="your-custom-classes" /> </BarVisualizer>`Note: The highlighted bars will receive a `data-lk-highlighted` attribute that you can use for styling active vs. idle states.