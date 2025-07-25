using System.Collections;
using UnityEngine;
using UnityEngine.UIElements;

namespace AgentsExample
{
    /// <summary>
    /// Controls the on-screen UI.
    /// </summary>
    [RequireComponent(typeof(UIDocument), typeof(Animator))]
    public class ScreenController : MonoBehaviour
    {
        private AudioSource _agentVoiceSource;
        private AudioSpectrumProcessor _spectrumProcessor;

        private Label _transcriptionField;
        private ScrollView _transcriptionScroll;
        private float _scrollVelocity = 0;

        private AudioVisualizer _audioVisualizer;

        private Animator _animator;
        private bool _windowOpen = false;

        [SerializeField] private AudioClip _openSound;
        [SerializeField] private AudioClip _closeSound;

        /// <summary>
        /// Opens the on-screen window, revealing the agent UI.
        /// </summary>
        public IEnumerator OpenWindow()
        {
            if (_windowOpen) yield break;
            yield return AnimateToState("WindowOpen");
            AudioSource.PlayClipAtPoint(_openSound, transform.position);
            _windowOpen = true;
        }

        /// <summary>
        /// Closes the on-screen window.
        /// </summary>
        public IEnumerator CloseWindow()
        {
            if (!_windowOpen) yield break;
            AudioSource.PlayClipAtPoint(_closeSound, transform.position);
            yield return AnimateToState("WindowClose");
            _windowOpen = false;
        }

        /// <summary>
        /// The audio source to be visualized (the agent's voice).
        /// </summary>
        public AudioSource AgentVoiceSource {
            get => _agentVoiceSource;
            set => _agentVoiceSource = value;
        }

        /// <summary>
        /// Appends a new transcription text to the transcription field.
        /// </summary>
        public void AppendTranscription(string transcription)
        {
            _transcriptionField.text += transcription;
        }

        /// <summary>
        /// Clears the transcription field.
        /// </summary>
        public void ClearTranscription()
        {
            _transcriptionField.text = "";
        }

        /// <summary>
        /// Updates the audio visualizer using the spectrum processor.
        /// </summary>
        private IEnumerator UpdateVisualizer()
        {
            while (true)
            {
                if (_agentVoiceSource == null) {
                    yield return null;
                    continue;
                }
                _spectrumProcessor.UpdateFrom(_agentVoiceSource);
                _audioVisualizer.Update(_spectrumProcessor.Output);
                yield return null;
            }
        }

        /// <summary>
        /// Maintains scroll position at the bottom as transcriptions are appended.
        /// </summary>
        private IEnumerator ScrollToBottom()
        {
            while (true)
            {
                float currentY = _transcriptionScroll.scrollOffset.y;
                float targetY = _transcriptionScroll.contentContainer.layout.height - _transcriptionScroll.layout.height;

                float newY = Mathf.SmoothDamp(currentY, targetY, ref _scrollVelocity, SCROLL_SMOOTH_TIME);
                _transcriptionScroll.scrollOffset = new Vector2(0, newY);
                yield return null;
            }
        }

        private void OnEnable()
        {
            _animator = GetComponent<Animator>();
            _spectrumProcessor = new AudioSpectrumProcessor(64);

            var root = GetComponent<UIDocument>().rootVisualElement;
            _transcriptionField = root.Q<Label>("TranscriptionField");
            _transcriptionScroll = root.Q<ScrollView>("TranscriptionScroll");
            _audioVisualizer = root.Q<AudioVisualizer>();

            StartCoroutine(ScrollToBottom());
            StartCoroutine(UpdateVisualizer());
        }

        private IEnumerator AnimateToState(string stateName)
        {
            int stateHash = Animator.StringToHash(stateName);
            _animator.CrossFade(stateHash, 0.0f);

            while (_animator.GetCurrentAnimatorStateInfo(0).shortNameHash != stateHash)
                yield return null;
            while (_animator.GetCurrentAnimatorStateInfo(0).normalizedTime < 1f)
                yield return null;
        }

        private const float SCROLL_SMOOTH_TIME = 0.25f;
    }
}