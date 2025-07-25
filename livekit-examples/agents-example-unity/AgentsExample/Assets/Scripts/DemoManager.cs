using UnityEngine;
using System.Collections;

namespace AgentsExample
{
    /// <summary>
    /// Simple state machine for controlling the demo.
    /// </summary>
    public class DemoManager : MonoBehaviour
    {
        #region Dependencies

        [SerializeField] private AgentController _agent;
        [SerializeField] private OverlayViewController _overlay;
        [SerializeField] private ScreenController _screen;
        [SerializeField] private CameraController _camera;

        #endregion

        #region State Management

        private GameState _currentState;
        public enum GameState { Initial, MainMenu, Talk }

        public void Start()
        {
            StartCoroutine(TransitionToState(GameState.MainMenu));
        }

        private IEnumerator TransitionToState(GameState newState)
        {
            Debug.Log($"Transitioning to {newState}");
            if (_currentState == newState)
            {
                Debug.Log($"Already in state {newState}; skipping transition.");
                yield break;
            }

            if (_currentState != GameState.Initial)
                yield return StartCoroutine(ExitState(_currentState));

            _currentState = newState;
            yield return StartCoroutine(EnterState(_currentState));
        }

        private IEnumerator EnterState(GameState state)
        {
            switch (state)
            {
                case GameState.MainMenu: yield return EnterMainMenu(); break;
                case GameState.Talk: yield return EnterTalk(); break;
            }
        }

        private IEnumerator ExitState(GameState state)
        {
            switch (state)
            {
                case GameState.MainMenu: yield return ExitMainMenu(); break;
                case GameState.Talk: yield return ExitTalk(); break;
            }
        }
        #endregion

        #region Main Menu State

        private IEnumerator EnterMainMenu()
        {
            // Obtain microphone permission in advance to avoid interrupting the user later.
            // In a real app, you would want to provide some feedback to the user if permission is denied.
            yield return ObtainMicrophonePermission();

            _overlay.TalkRequested += OnTalkRequested;
            _overlay.PresentMainMenu();
            yield break;
        }

        private IEnumerator ExitMainMenu()
        {
            _overlay.TalkRequested -= OnTalkRequested;
            _overlay.DismissAll();
            yield break;
        }

        private void OnTalkRequested()
        {
            StartCoroutine(TransitionToState(GameState.Talk));
        }
        #endregion

        #region Talk State

        private IEnumerator EnterTalk()
        {
            _agent.OnTranscription += OnAgentTranscriptionReceived;

            yield return _camera.ZoomIn();
            yield return _agent.StartConversation();

            if (!_agent.IsReady)
            {
                yield return StartCoroutine(TransitionToState(GameState.MainMenu));
                yield break;
            }
            _agent.OnReadyStateChange += OnAgentReadyStateChanged;
            _screen.AgentVoiceSource = _agent.AgentVoiceSource;
            yield return _screen.OpenWindow();

            _overlay.ExitRequested += OnExitRequested;
            _overlay.MuteRequested += OnMuteRequested;
            _overlay.IsMicrophoneMuted = _agent.MicrophoneSource.mute;
            _overlay.PresentControls();
        }

        private IEnumerator ExitTalk()
        {
            _overlay.DismissAll();

            _agent.OnReadyStateChange -= OnAgentReadyStateChanged;
            _agent.OnTranscription -= OnAgentTranscriptionReceived;
            _agent.EndConversation();

            yield return _screen.CloseWindow();
            _screen.AgentVoiceSource = null;
            _screen.ClearTranscription();

            _overlay.ExitRequested -= OnExitRequested;
            _overlay.MuteRequested -= OnMuteRequested;

            yield return _camera.ZoomOut();
        }

        private void OnExitRequested()
        {
            StartCoroutine(TransitionToState(GameState.MainMenu));
        }

        private void OnMuteRequested()
        {
            _agent.MicrophoneSource.mute = !_agent.MicrophoneSource.mute;
            _overlay.IsMicrophoneMuted = _agent.MicrophoneSource.mute;
        }

        private void OnAgentReadyStateChanged(bool isReady)
        {
            if (!isReady)
                StartCoroutine(TransitionToState(GameState.MainMenu));
        }

        private void OnAgentTranscriptionReceived(AgentController.Transcription transcription)
        {
            if (transcription.ClearPrevious)
                _screen.ClearTranscription();
            _screen.AppendTranscription(transcription.Text);
        }

        static private IEnumerator ObtainMicrophonePermission()
        {
            var level = UserAuthorization.Microphone;
            yield return Application.RequestUserAuthorization(level);
            if (!Application.HasUserAuthorization(level))
            {
                Debug.LogError("Unable to obtain microphone permission");
                yield break;
            }
        }
        #endregion
    }
}