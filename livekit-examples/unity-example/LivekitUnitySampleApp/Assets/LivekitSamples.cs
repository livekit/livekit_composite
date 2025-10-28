using System.Collections;
using UnityEngine;
using LiveKit;
using LiveKit.Proto;
using UnityEngine.UI;
using RoomOptions = LiveKit.RoomOptions;
using System.Collections.Generic;
using Application = UnityEngine.Application;
using TMPro;
using UnityEngine.Android; // Required for Android-specific permission handling

public class LivekitSamples : MonoBehaviour
{
    public string url = "ws://localhost:7880";
    public string token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MTkyODQ5NzgsImlzcyI6IkFQSXJramtRYVZRSjVERSIsIm5hbWUiOiJ1bml0eSIsIm5iZiI6MTcxNzQ4NDk3OCwic3ViIjoidW5pdHkiLCJ2aWRlbyI6eyJjYW5VcGRhdGVPd25NZXRhZGF0YSI6dHJ1ZSwicm9vbSI6ImxpdmUiLCJyb29tSm9pbiI6dHJ1ZX19.WHt9VItlQj0qaKEB_EIxyFf2UwlqdEdWIiuA_tM0QmI";

    private Room room = null;

    private WebCamTexture webCamTexture = null;

    private int frameRate = 30;

    Dictionary<string, GameObject> _videoObjects = new();
    Dictionary<string, GameObject> _audioObjects = new();
    List<RtcVideoSource> _rtcVideoSources = new();
    List<RtcAudioSource> _rtcAudioSources = new();
    List<VideoStream> _videoStreams = new();

    public GridLayoutGroup layoutGroup; //Component

    public TMP_Text statusText;

    // Start is called before the first frame update
    void Start()
    {

    }

    // Update is called once per frame
    void Update()
    {
    }

    public void UpdateStatusText(string newText)
    {
        if (statusText != null)
        {
            statusText.text = newText;
        }
    }

    public void OnClickPublishAudio()
    {
        StartCoroutine(publishMicrophone());
        Debug.Log("OnClickPublishAudio clicked!");
    }

    public void OnClickPublishVideo()
    {
        StartCoroutine(publishVideo());
        Debug.Log("OnClickPublishVideo clicked!");
    }

    public void onClickPublishData()
    {
        publishData();
        Debug.Log("onClickPublishData clicked!");
    }

    public void onClickMakeCall()
    {
        Debug.Log("onClickMakeCall clicked!");
        if (webCamTexture == null)
        {
                           // Check if the platform is Android
#if PLATFORM_ANDROID
            // Check if camera permission is already granted
            if (!Permission.HasUserAuthorizedPermission(Permission.Camera))
            {
                // Request camera permission from the user
                Permission.RequestUserPermission(Permission.Camera);
            }
#endif
            StartCoroutine(OpenCamera());
        }

        StartCoroutine(MakeCall());
    }

    public void onClickHangup()
    {
        Debug.Log("onClickHangup clicked!");
        room.Disconnect();
        CleanUp();
        room = null;
        UpdateStatusText("Disconnected");
    }

    IEnumerator MakeCall()
    {
        if (room == null)
        {
            room = new Room();
            room.TrackSubscribed += TrackSubscribed;
            room.TrackUnsubscribed += UnTrackSubscribed;
            room.DataReceived += DataReceived;
            var options = new RoomOptions();
            var connect = room.Connect(url, token, options);
            yield return connect;
            if (!connect.IsError)
            {
                Debug.Log("Connected to " + room.Name);
                UpdateStatusText("Connected");
            }
        }

    }

    void CleanUp()
    {
        foreach (var item in _audioObjects)
        {
            var source = item.Value.GetComponent<AudioSource>();
            source.Stop();
            Destroy(item.Value);
        }

        _audioObjects.Clear();

        foreach (var item in _rtcAudioSources)
        {
            item.Stop();
        }


        foreach (var item in _videoObjects)
        {
            RawImage img = item.Value.GetComponent<RawImage>();
            if (img != null)
            {
                img.texture = null;
                Destroy(img);
            }

            Destroy(item.Value);
        }

        foreach (var item in _videoStreams)
        {
            item.Stop();
            item.Dispose();
        }

        foreach (var item in _rtcVideoSources)
        {
            item.Stop();
            item.Dispose();
        }

        _videoObjects.Clear();

        _videoStreams.Clear();
    }


    void AddVideoTrack(RemoteVideoTrack videoTrack)
    {
        Debug.Log("AddVideoTrack " + videoTrack.Sid);

        GameObject imgObject = new GameObject(videoTrack.Sid);

        RectTransform trans = imgObject.AddComponent<RectTransform>();
        trans.localScale = Vector3.one;
        trans.sizeDelta = new Vector2(180, 120);
        trans.rotation = Quaternion.AngleAxis(Mathf.Lerp(0f, 180f, 50), Vector3.forward);

        RawImage image = imgObject.AddComponent<RawImage>();

        var stream = new VideoStream(videoTrack);
        stream.TextureReceived += (tex) =>
        {
            if (image != null)
            {
                image.texture = tex;
            }
        };

        _videoObjects[videoTrack.Sid] = imgObject;

        imgObject.transform.SetParent(layoutGroup.gameObject.transform, false);
        stream.Start();
        StartCoroutine(stream.Update());
        _videoStreams.Add(stream);
    }

    void TrackSubscribed(IRemoteTrack track, RemoteTrackPublication publication, RemoteParticipant participant)
    {
        if (track is RemoteVideoTrack videoTrack)
        {
            AddVideoTrack(videoTrack);
        }
        else if (track is RemoteAudioTrack audioTrack)
        {
            GameObject audObject = new GameObject(audioTrack.Sid);
            var source = audObject.AddComponent<AudioSource>();
            var stream = new AudioStream(audioTrack, source);
            _audioObjects[audioTrack.Sid] = audObject;
        }
    }

    void UnTrackSubscribed(IRemoteTrack track, RemoteTrackPublication publication, RemoteParticipant participant)
    {
        if (track is RemoteVideoTrack videoTrack)
        {
            var imgObject = _videoObjects[videoTrack.Sid];
            if (imgObject != null)
            {
                Destroy(imgObject);
            }
            _videoObjects.Remove(videoTrack.Sid);
        }
        else if (track is RemoteAudioTrack audioTrack)
        {
            var audObject = _audioObjects[audioTrack.Sid];
            if (audObject != null)
            {
                var source = audObject.GetComponent<AudioSource>();
                source.Stop();
                Destroy(audObject);
            }
            _audioObjects.Remove(audioTrack.Sid);
        }
    }

    void DataReceived(byte[] data, Participant participant, DataPacketKind kind, string topic)
    {
        var str = System.Text.Encoding.Default.GetString(data);
        Debug.Log("DataReceived: from " + participant.Identity + ", data " + str);
        UpdateStatusText("DataReceived: from " + participant.Identity + ", data " + str);
    }

    public IEnumerator publishMicrophone()
    {
        Debug.Log("publicMicrophone!");
        // Publish Microphone
        var localSid = "my-audio-source";
        GameObject audObject = new GameObject(localSid);
        _audioObjects[localSid] = audObject;

        _audioObjects[localSid] = audObject;
        var source = audObject.AddComponent<AudioSource>();
        source.clip = Microphone.Start(Microphone.devices[0], true, 2, (int)RtcAudioSource.DefaultSampleRate);
        source.loop = true;

        var rtcSource = new BasicAudioSource(source);

        Debug.Log($"CreateAudioTrack");
        var track = LocalAudioTrack.CreateAudioTrack("my-audio-track", rtcSource, room);

        var options = new TrackPublishOptions();
        options.AudioEncoding = new AudioEncoding();
        options.AudioEncoding.MaxBitrate = 64000;
        options.Source = TrackSource.SourceMicrophone;

        Debug.Log("PublishTrack!");
        var publish = room.LocalParticipant.PublishTrack(track, options);
        yield return publish;

        if (!publish.IsError)
        {
            Debug.Log("Track published!");
        }

        _rtcAudioSources.Add(rtcSource);
        rtcSource.Start();
    }

    public IEnumerator publishVideo()
    {
        //var rt = new RenderTexture(1280, 720, 24, RenderTextureFormat.ARGB32);
        //rt.Create();
        //var source = new TextureVideoSource(rt);

        var source = new WebCameraSource(webCamTexture);

        //var source = new ScreenVideoSource();

        //Camera.main.enabled = true;
        //var source = new CameraVideoSource(Camera.main);

        GameObject imgObject = new GameObject("camera");
        RectTransform trans = imgObject.AddComponent<RectTransform>();
        trans.localScale = Vector3.one;
        trans.sizeDelta = new Vector2(180, 120);
        RawImage image = imgObject.AddComponent<RawImage>();
        source.TextureReceived += (txt) =>
        {
            image.texture = txt;
        };
        imgObject.transform.SetParent(layoutGroup.gameObject.transform, false);
        //var source = new TextureVideoSource(webCamTexture);
        var track = LocalVideoTrack.CreateVideoTrack("my-video-track", source, room);

        var options = new TrackPublishOptions();
        options.VideoCodec = VideoCodec.H265;
        var videoCoding = new VideoEncoding();
        videoCoding.MaxBitrate = 512000;
        videoCoding.MaxFramerate = frameRate;
        options.VideoEncoding = videoCoding;
        options.Simulcast = false;
        options.Source = TrackSource.SourceCamera;

        var publish = room.LocalParticipant.PublishTrack(track, options);
        yield return publish;

        if (!publish.IsError)
        {
            Debug.Log("Track published!");
        }

        source.Start();
        StartCoroutine(source.Update());
        _rtcVideoSources.Add(source);
    }

    public void publishData()
    {
        var str = "hello from unity!";
        room.LocalParticipant.PublishData(System.Text.Encoding.Default.GetBytes(str));
    }

    public IEnumerator OpenCamera()
    {
        int maxl = Screen.width;
        if (Screen.height > Screen.width)
        {
            maxl = Screen.height;
        }

        yield return Application.RequestUserAuthorization(UserAuthorization.WebCam);
        if (Application.HasUserAuthorization(UserAuthorization.WebCam))
        {
            if (webCamTexture != null)
            {
                webCamTexture.Stop();
            }

            int i = 0;
            while (WebCamTexture.devices.Length <= 0 && 1 < 300)
            {
                yield return new WaitForEndOfFrame();
                i++;
            }
            WebCamDevice[] devices = WebCamTexture.devices;
            if (WebCamTexture.devices.Length <= 0)
            {
                Debug.LogError("No camera device available, please check");
            }
            else
            {
                string devicename = devices[0].name;
                webCamTexture = new WebCamTexture(devicename, maxl, maxl == Screen.height ? Screen.width : Screen.height, frameRate)
                {
                    wrapMode = TextureWrapMode.Repeat
                };
                /*
                GameObject imgObject = new GameObject("camera");
                RectTransform trans = imgObject.AddComponent<RectTransform>();
                trans.localScale = Vector3.one;
                trans.sizeDelta = new Vector2(180, 120);
                RawImage image = imgObject.AddComponent<RawImage>();
                image.texture = webCamTexture;
                imgObject.transform.SetParent(layoutGroup.gameObject.transform, false);
                */

                webCamTexture.Play();
            }

        }
        else
        {
            Debug.LogError("Camera permission not obtained");
        }
    }

    private void OnApplicationPause(bool pause)
    {
        if (webCamTexture != null)
        {
            if (pause)
            {
                webCamTexture.Pause();
            }
            else
            {
                webCamTexture.Play();
            }
        }

    }


    private void OnDestroy()
    {
        if (webCamTexture != null)
        {
            webCamTexture.Stop();
        }
    }
}
