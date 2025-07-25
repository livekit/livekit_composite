using UnityEngine;
using UnityEngine.UIElements;
using System;
using System.Collections;

namespace AgentsExample
{
    /// <summary>
    /// Controller for UI overlay views.
    /// </summary>
    [RequireComponent(typeof(UIDocument))]
    public class OverlayViewController : MonoBehaviour
    {
        private VisualElement _controlsRoot;
        private VisualElement _mainMenuRoot;
        private Button _muteButton;
        private Button _exitButton;
        private Button _talkButton;

        public event Action MuteRequested;
        public event Action ExitRequested;
        public event Action TalkRequested;

        public bool IsMicrophoneMuted
        {
            get => _muteButton.ClassListContains("muted");
            set
            {
                if (value)
                    _muteButton.AddToClassList("muted");
                else
                    _muteButton.RemoveFromClassList("muted");
            }
        }

        private void OnEnable()
        {
            var document = GetComponent<UIDocument>().rootVisualElement;
            _controlsRoot = document.Q<VisualElement>(className: CLASS_PREFIX + "controls");
            _mainMenuRoot = document.Q<VisualElement>(className: CLASS_PREFIX + "main-menu");

            if (_controlsRoot == null || _mainMenuRoot == null)
            {
                Debug.LogError("One or more views not found in UI document");
                return;
            }
            Configure();
        }

        private void OnDisable()
        {
            _controlsRoot = null;
            _mainMenuRoot = null;
        }

        private void Configure()
        {
            _muteButton = _controlsRoot.Q<Button>("Mute");
            _exitButton = _controlsRoot.Q<Button>("Exit");
            _muteButton.clicked += () => MuteRequested?.Invoke();
            _exitButton.clicked += () => ExitRequested?.Invoke();

            _talkButton = _mainMenuRoot.Q<Button>("Talk");
            _talkButton.clicked += () => TalkRequested?.Invoke();
        }

        public void PresentControls()
        {
            ShowView(_controlsRoot, _mainMenuRoot);
        }

        public void PresentMainMenu()
        {
            ShowView(_mainMenuRoot, _controlsRoot);
        }

        public void DismissAll()
        {
            HideView(_controlsRoot);
            HideView(_mainMenuRoot);
        }

        private void ShowView(VisualElement viewToShow, VisualElement viewToHide)
        {
            viewToShow.style.display = DisplayStyle.Flex;
            viewToShow.AddToClassList(CLASS_VISIBLE);
            HideView(viewToHide);
        }

        private void HideView(VisualElement view)
        {
            view.RemoveFromClassList(CLASS_VISIBLE);
            StartCoroutine(HideAfterTransition(view));
        }

        private IEnumerator HideAfterTransition(VisualElement view)
        {
            // TODO: Wait for transition end event instead of using a hardcoded delay.
            yield return new WaitForSeconds(1f);
            view.style.display = DisplayStyle.None;
        }

        private const string CLASS_VISIBLE = CLASS_PREFIX + "visible";
        private const string CLASS_PREFIX = "view--";
    }
}