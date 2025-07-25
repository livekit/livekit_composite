using UnityEngine;
using System.Collections;
using LiveKit;
using LiveKit.Proto;
using System;
using Debug = UnityEngine.Debug;
using System.Collections.Generic;

namespace AgentsExample
{
    public class AgentController : MonoBehaviour
    {
        public struct Transcription
        {
            public string Text;
            public bool ClearPrevious;
        }

        public Action<bool> OnReadyStateChange;
        public Action<Transcription> OnTranscription;

        [SerializeField]
        private TokenService _tokenService;

        /// <summary>
        /// The location of where the agent's voice will be played.
        /// </summary>
        [SerializeField]
        private Transform _agentLocation;

        /// <summary>
        /// The audio source for the microphone.
        /// </summary>
        public AudioSource MicrophoneSource =>
            _audioObjects.TryGetValue(MICROPHONE_ID, out var audioObject)
                ? audioObject.GetComponent<AudioSource>()
                : null;

        /// <summary>
        /// The audio source for the agent's voice.
        /// </summary>
        public AudioSource AgentVoiceSource =>
            _audioObjects.TryGetValue(AGENT_VOICE_ID, out var audioObject)
                ? audioObject.GetComponent<AudioSource>()
                : null;

        /// <summary>
        /// Whether the agent is ready to engage in conversation.
        /// </summary>
        public bool IsReady => CurrentState == State.Ready;

        private enum State
        {
            Initial,
            Starting,
            Ready
        }

        private Room _room;
        private State _state;
        private Dictionary<string, GameObject> _audioObjects = new();
        private List<RtcAudioSource> _rtcAudioSources = new();

        private State CurrentState
        {
            get => _state;
            set
            {
                _state = value;
                OnReadyStateChange?.Invoke(_state == State.Ready);
            }
        }

        #region Start Conversation

        /// <summary>
        /// Begins a conversation with the agent.
        /// </summary>
        /// <remarks>
        /// The operation doesn't complete until <see cref="IsReady"/> is <c>true</c> or an error occurs.
        /// </remarks>
        public IEnumerator StartConversation()
        {
            CurrentState = State.Starting;

            yield return OpenConnection();
            if (CurrentState != State.Starting) yield break;

            yield return PublishMicrophone();
            if (CurrentState != State.Starting) yield break;

            yield return WaitForAgent();
            if (CurrentState != State.Starting) yield break;
            CurrentState = State.Ready;
        }

        private IEnumerator WaitForAgent()
        {
            var timeout = Time.realtimeSinceStartup + AGENT_JOIN_TIMEOUT;
            yield return new WaitUntil(() =>
                AgentVoiceSource != null || Time.realtimeSinceStartup >= timeout
            );
            if (AgentVoiceSource != null) yield break;
            Debug.LogError($"Agent voice not published within timeout window");
            EndConversation();
        }

        private IEnumerator OpenConnection()
        {
            System.Random random = new System.Random();

            // Generate a random room name to ensure a new room is created
            // In a production app, you may want a more reliable process for ensuring agent dispatch
            var roomName = $"room-{random.Next(1000, 10000)}";

            // For this demo, we'll use a random participant name as well. you may want to use user IDs in a production app
            var participantName = $"user-{random.Next(1000, 10000)}";

            var fetchTask = _tokenService.FetchConnectionDetails(roomName, participantName);
            while (!fetchTask.IsCompleted)
                yield return null;

            if (fetchTask.IsFaulted)
            {
                Debug.LogError($"Failed to fetch connection details: {fetchTask.Exception}");
                EndConversation();
                yield break;
            }
            var details = fetchTask.Result;

            _room = new Room();
            _room.TrackSubscribed += OnTrackSubscribed;
            _room.TrackUnsubscribed += OnTrackUnsubscribed;
            _room.RegisterTextStreamHandler(TRANSCRIPTION_TOPIC, OnTranscriptionStreamOpened);

            var options = new LiveKit.RoomOptions();
            // Optionally set additional room options before connecting

            Debug.Log($"Connecting to '{details.ServerUrl}'");
            var connect = _room.Connect(details.ServerUrl, details.ParticipantToken, options);
            yield return connect;

            if (connect.IsError)
            {
                Debug.LogError($"Failed to connect to room");
                EndConversation();
                yield break;
            }
            Debug.Log($"Connected to room");
        }

        public IEnumerator PublishMicrophone()
        {
            GameObject audObject = new GameObject(MICROPHONE_ID);
            _audioObjects[MICROPHONE_ID] = audObject;

            var rtcSource = new MicrophoneSource(audObject.AddComponent<AudioSource>());
            rtcSource.Configure(Microphone.devices[0], true, 2, (int)RtcAudioSource.DefaultMirophoneSampleRate);
            var track = LocalAudioTrack.CreateAudioTrack(MICROPHONE_ID, rtcSource, _room);

            var options = new TrackPublishOptions();
            options.AudioEncoding = new AudioEncoding();
            options.AudioEncoding.MaxBitrate = 64000;
            options.Source = TrackSource.SourceMicrophone;

            var publish = _room.LocalParticipant.PublishTrack(track, options);
            yield return publish;

            if (publish.IsError)
            {
                Debug.LogError("Failed to published microphone track");
                EndConversation();
                yield break;
            }
            _rtcAudioSources.Add(rtcSource);
            yield return rtcSource.PrepareAndStart();
        }
        #endregion

        #region End Conversation

        /// <summary>
        /// Ends the conversation with the agent.
        /// </summary>
        public void EndConversation()
        {
            _room?.Disconnect();
            _room = null;

            foreach (var item in _audioObjects)
            {
                var source = item.Value.GetComponent<AudioSource>();
                source.Stop();
                Destroy(item.Value);
            }
            _audioObjects.Clear();
            foreach (var item in _rtcAudioSources)
                item.Stop();
            _rtcAudioSources.Clear();

            CurrentState = State.Initial;
        }
        #endregion

        #region Event Handlers

        private void OnTrackSubscribed(IRemoteTrack track, RemoteTrackPublication publication, RemoteParticipant participant)
        {
            if (!(track is RemoteAudioTrack audioTrack)) return;
            if (_audioObjects.ContainsKey(AGENT_VOICE_ID))
            {
                Debug.LogWarning("Agent voice already subscribed");
                return;
            }
            GameObject audObject = new GameObject(AGENT_VOICE_ID);
            var source = audObject.AddComponent<AudioSource>();
            var stream = new AudioStream(audioTrack, source);
            _audioObjects[AGENT_VOICE_ID] = audObject;
            _rtcAudioSources.Add(stream.AudioSource);
            audObject.transform.SetParent(_agentLocation);
        }

        private void OnTrackUnsubscribed(IRemoteTrack track, RemoteTrackPublication publication, RemoteParticipant participant)
        {
            if (!(track is RemoteAudioTrack)) return;
            var audObject = _audioObjects[AGENT_VOICE_ID];
            if (audObject != null)
            {
                var source = audObject.GetComponent<AudioSource>();
                source.Stop();
                Destroy(audObject);
            }
            _audioObjects.Remove(AGENT_VOICE_ID);
            EndConversation();
        }

        private void OnTranscriptionStreamOpened(TextStreamReader reader, string Identity)
        {
            Debug.Log($"Transcription stream opened: {Identity}");
            StartCoroutine(HandleTranscriptionStream(reader));
        }
        #endregion

        #region Stream Handlers
        private IEnumerator HandleTranscriptionStream(TextStreamReader reader)
        {
            var readIncremental = reader.ReadIncremental();
            var ClearPrevious = true;

            while (true)
            {
                readIncremental.Reset();
                yield return readIncremental;
                if (readIncremental.IsEos) break;

                var transcription = new Transcription
                {
                    Text = readIncremental.Text,
                    ClearPrevious = ClearPrevious
                };
                OnTranscription?.Invoke(transcription);
                ClearPrevious = false;
            }
        }
        #endregion

        #region Constants

        private const string AGENT_VOICE_ID = "AgentVoiceOutput";
        private const string MICROPHONE_ID = "MicrophoneInput";
        private const float AGENT_JOIN_TIMEOUT = 15f;
        private const string TRANSCRIPTION_TOPIC = "lk.transcription";
        #endregion
    }
}