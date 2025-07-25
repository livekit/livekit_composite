using UnityEngine;
using Unity.Mathematics;
using UnityEngine.UIElements;

[UxmlElement("AudioVisualizer")]
public partial class AudioVisualizer : VisualElement
{
    static CustomStyleProperty<Color> BarColorProperty = new CustomStyleProperty<Color>("--bar-color");
    static CustomStyleProperty<float> BarGapProperty = new CustomStyleProperty<float>("--bar-gap");

    public AudioVisualizer()
    {
        RegisterCallback<AttachToPanelEvent>(OnAttachToPanel);
        RegisterCallback<DetachFromPanelEvent>(OnDetachFromPanel);
        RegisterCallback<CustomStyleResolvedEvent>(evt => CustomStylesResolved(evt));
        generateVisualContent += GenerateVisualContent;
    }

    private float[] _levels;
    private Color _barColor = Color.black;
    private float _barGap = 0.4f;

    /// <summary>
    /// Update the audio visualizer with new levels to display.
    /// </summary>
    /// <param name="levels">The levels to display. Should be normalized to the range [0, 1].</param>
    public void Update(float[] levels)
    {
        _levels = levels;
        MarkDirtyRepaint();
    }

    public void Reset()
    {
        System.Array.Clear(_levels, 0, _levels.Length);
        MarkDirtyRepaint();
    }

    static void GenerateVisualContent(MeshGenerationContext context)
    {
        AudioVisualizer element = (AudioVisualizer)context.visualElement;
        element.DrawBars(context);
    }

    private void DrawBars(MeshGenerationContext context)
    {
        if (_levels == null) return;
        var p = context.painter2D;
        var width = contentRect.width;
        var height = contentRect.height;

        var segmentWidth = width / _levels.Length;
        p.lineWidth = segmentWidth * (1 - _barGap);
        p.strokeColor = _barColor;

        for (int i = 0; i < _levels.Length; i++)
        {
            float x = (float)(i * segmentWidth + (segmentWidth / 2));
            float y = (1 - _levels[i]) * height;

            p.BeginPath();
            p.MoveTo(new Vector2(x, height));
            p.LineTo(new Vector2(x, y));
            p.Stroke();
        }
    }

    static void CustomStylesResolved(CustomStyleResolvedEvent evt)
    {
        AudioVisualizer element = (AudioVisualizer)evt.currentTarget;
        element.UpdateCustomStyles();
    }

    private void UpdateCustomStyles()
    {
        if (customStyle.TryGetValue(BarColorProperty, out _barColor))
        {
            MarkDirtyRepaint();
        }
        if (customStyle.TryGetValue(BarGapProperty, out _barGap))
        {
            _barGap = math.clamp(_barGap, 0, 0.9f);
            MarkDirtyRepaint();
        }
    }

    private void OnAttachToPanel(AttachToPanelEvent e)
    {
        Debug.Log("OnAttachToPanel");
    }

    private void OnDetachFromPanel(DetachFromPanelEvent e)
    {
        Debug.Log("OnDetachFromPanel");
    }
}
