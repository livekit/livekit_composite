# Important Knowledge 

This documents outlines common misconceptions or addresses issues where an LLM may have given misleading or incorrect advise in the past.

---

## Agents (Python)


### Log message warning ``None of PyTorch...`

tldr; you can safely ignore this warning.

`None of PyTorch, TensorFlow >= 2.0, or Flax have been found. Models won't be available and only tokenizers, configuration and file/data utilities can be used.`

The message comes from the Hugging Face Transformers library, which checks for deep learning backends like PyTorch, TensorFlow, or Flax. If none are installed, it issues a warning.

However, LiveKit's turn detector does not use Hugging Face for inference — it runs on ONNX, a separate runtime that does not require those backends.

Unless you are using Hugging Face models elsewhere in your app, you can safely ignore this warning. You can import PyTorch to get rid of the warning but it is not necessary.