#include "esp_log.h"
#include "media_lib_os.h"
#include "esp_codec_dev.h"

#include "protocol.h"
#include "engine.h"
#include "signaling.h"
#include "peer.h"

static const char *TAG = "livekit_engine";

#define VIDEO_TRACK_CID "video0"
#define AUDIO_TRACK_CID "audio0"

#define VIDEO_TRACK_NAME "Video"
#define AUDIO_TRACK_NAME "Audio"
#define FRAME_INTERVAL_MS 20

#define SAFE_FREE(ptr) if (ptr != NULL) {   \
    free(ptr);                      \
    ptr = NULL;                     \
}

typedef struct {
    engine_options_t options;
    signal_handle_t  sig;

    peer_handle_t pub_peer;
    peer_handle_t sub_peer;

    esp_peer_ice_server_cfg_t *ice_servers;
    int ice_server_count;

    esp_capture_path_handle_t capturer_path;
    bool is_media_streaming;

    esp_codec_dev_handle_t        renderer_handle;
    esp_peer_audio_stream_info_t  sub_audio_info;

    connection_state_t state;     /// Engine state, derived from signaling and peer states
    connection_state_t sig_state; /// Signaling state
    connection_state_t pub_state; /// Publisher peer state
    connection_state_t sub_state; /// Subscriber peer state

    bool is_subscriber_primary;
    char local_participant_sid[32];
    char sub_audio_track_sid[32];
} engine_t;

static void recalculate_state(engine_t *eng)
{
    connection_state_t new_state = eng->state;

    if (eng->sig_state == CONNECTION_STATE_FAILED ||
        eng->pub_state == CONNECTION_STATE_FAILED ||
        eng->sub_state == CONNECTION_STATE_FAILED)
    {
        new_state = CONNECTION_STATE_FAILED;
    }
    else if (eng->sig_state == CONNECTION_STATE_RECONNECTING ||
             eng->pub_state == CONNECTION_STATE_RECONNECTING ||
             eng->sub_state == CONNECTION_STATE_RECONNECTING)
    {
        new_state = CONNECTION_STATE_RECONNECTING;
    }

    else if (eng->sig_state == CONNECTION_STATE_CONNECTED &&
             ( (eng->is_subscriber_primary && eng->sub_state == CONNECTION_STATE_CONNECTED) ||
               (!eng->is_subscriber_primary && eng->pub_state == CONNECTION_STATE_CONNECTED) ))
    {
        new_state = CONNECTION_STATE_CONNECTED;
    }
    else if (eng->sig_state == CONNECTION_STATE_DISCONNECTED &&
             eng->pub_state == CONNECTION_STATE_DISCONNECTED &&
             eng->sub_state == CONNECTION_STATE_DISCONNECTED)
    {
        new_state = CONNECTION_STATE_DISCONNECTED;
    }
    else {
        new_state = CONNECTION_STATE_CONNECTING;
    }

    if (new_state != eng->state) {
        ESP_LOGI(TAG, "State changed: %d -> %d", eng->state, new_state);
        eng->state = new_state;
        eng->options.on_state_changed(eng->state, eng->options.ctx);
    }
}

static esp_capture_codec_type_t capture_audio_codec_type(esp_peer_audio_codec_t peer_codec)
{
    switch (peer_codec) {
        case ESP_PEER_AUDIO_CODEC_G711A: return ESP_CAPTURE_CODEC_TYPE_G711A;
        case ESP_PEER_AUDIO_CODEC_G711U: return ESP_CAPTURE_CODEC_TYPE_G711U;
        case ESP_PEER_AUDIO_CODEC_OPUS:  return ESP_CAPTURE_CODEC_TYPE_OPUS;
        default:                         return ESP_CAPTURE_CODEC_TYPE_NONE;
    }
}

static esp_capture_codec_type_t capture_video_codec_type(esp_peer_video_codec_t peer_codec)
{
    switch (peer_codec) {
        case ESP_PEER_VIDEO_CODEC_H264:  return ESP_CAPTURE_CODEC_TYPE_H264;
        case ESP_PEER_VIDEO_CODEC_MJPEG: return ESP_CAPTURE_CODEC_TYPE_MJPEG;
        default:                         return ESP_CAPTURE_CODEC_TYPE_NONE;
    }
}

static av_render_audio_codec_t get_dec_codec(esp_peer_audio_codec_t codec)
{
    switch (codec) {
        case ESP_PEER_AUDIO_CODEC_G711A: return AV_RENDER_AUDIO_CODEC_G711A;
        case ESP_PEER_AUDIO_CODEC_G711U: return AV_RENDER_AUDIO_CODEC_G711U;
        case ESP_PEER_AUDIO_CODEC_OPUS:  return AV_RENDER_AUDIO_CODEC_OPUS;
        default:                         return AV_RENDER_AUDIO_CODEC_NONE;
    }
}

static void convert_dec_aud_info(esp_peer_audio_stream_info_t *info, av_render_audio_info_t *dec_info)
{
    dec_info->codec = get_dec_codec(info->codec);
    if (info->codec == ESP_PEER_AUDIO_CODEC_G711A || info->codec == ESP_PEER_AUDIO_CODEC_G711U) {
        dec_info->sample_rate = 8000;
        dec_info->channel = 1;
    } else {
        dec_info->sample_rate = info->sample_rate;
        dec_info->channel = info->channel;
    }
    dec_info->bits_per_sample = 16;
}

static void _media_stream_send_audio(engine_t *eng)
{
    esp_capture_stream_frame_t audio_frame = {
        .stream_type = ESP_CAPTURE_STREAM_TYPE_AUDIO,
    };
    while (esp_capture_acquire_path_frame(eng->capturer_path, &audio_frame, true) == ESP_CAPTURE_ERR_OK) {
        esp_peer_audio_frame_t audio_send_frame = {
            .pts = audio_frame.pts,
            .data = audio_frame.data,
            .size = audio_frame.size,
        };
        peer_send_audio(eng->pub_peer, &audio_send_frame);
        esp_capture_release_path_frame(eng->capturer_path, &audio_frame);
    }
}

static void _media_stream_send_video(engine_t *eng)
{
    esp_capture_stream_frame_t video_frame = {
        .stream_type = ESP_CAPTURE_STREAM_TYPE_VIDEO,
    };
    if (esp_capture_acquire_path_frame(eng->capturer_path, &video_frame, true) == ESP_CAPTURE_ERR_OK) {
        esp_peer_video_frame_t video_send_frame = {
            .pts = video_frame.pts,
            .data = video_frame.data,
            .size = video_frame.size,
        };
        peer_send_video(eng->pub_peer, &video_send_frame);
        esp_capture_release_path_frame(eng->capturer_path, &video_frame);
    }
}

static void media_stream_task(void *arg)
{
    engine_t *eng = (engine_t *)arg;
    while (eng->is_media_streaming) {
        if (eng->options.media.audio_info.codec != ESP_PEER_AUDIO_CODEC_NONE) {
            _media_stream_send_audio(eng);
        }
        if (eng->options.media.video_info.codec != ESP_PEER_VIDEO_CODEC_NONE) {
            _media_stream_send_video(eng);
        }
        media_lib_thread_sleep(FRAME_INTERVAL_MS);
    }
    media_lib_thread_destroy(NULL);
}

static engine_err_t media_stream_begin(engine_t *eng)
{
    if (esp_capture_start(eng->options.media.capturer) != ESP_CAPTURE_ERR_OK) {
        ESP_LOGE(TAG, "Failed to start capture");
        return ENGINE_ERR_MEDIA;
    }
    media_lib_thread_handle_t handle = NULL;
    eng->is_media_streaming = true;
    if (media_lib_thread_create_from_scheduler(&handle, STREAM_THREAD_NAME, media_stream_task, eng) != ESP_OK) {
        ESP_LOGE(TAG, "Failed to create media stream thread");
        eng->is_media_streaming = false;
        return ENGINE_ERR_MEDIA;
    }
    return ENGINE_ERR_NONE;
}

static engine_err_t media_stream_end(engine_t *eng)
{
    if (!eng->is_media_streaming) {
        return ENGINE_ERR_NONE;
    }
    eng->is_media_streaming = false;
    esp_capture_stop(eng->options.media.capturer);
    return ENGINE_ERR_NONE;
}

static engine_err_t send_add_audio_track(engine_t *eng)
{
    bool is_stereo = eng->options.media.audio_info.channel == 2;
    livekit_pb_add_track_request_t req = {
        .cid = AUDIO_TRACK_CID,
        .name = AUDIO_TRACK_NAME,
        .type = LIVEKIT_PB_TRACK_TYPE_AUDIO,
        .source = LIVEKIT_PB_TRACK_SOURCE_MICROPHONE,
        .muted = false,
        .audio_features_count = is_stereo ? 1 : 0,
        .audio_features = { LIVEKIT_PB_AUDIO_TRACK_FEATURE_TF_STEREO },
        .layers_count = 0
    };

    if (signal_send_add_track(eng->sig, &req) != SIGNAL_ERR_NONE) {
        ESP_LOGE(TAG, "Failed to publish audio track");
        return ENGINE_ERR_SIGNALING;
    }
    return ENGINE_ERR_NONE;
}

static engine_err_t send_add_video_track(engine_t *eng)
{
    livekit_pb_video_layer_t video_layer = {
        .quality = LIVEKIT_PB_VIDEO_QUALITY_HIGH,
        .width = eng->options.media.video_info.width,
        .height = eng->options.media.video_info.height
    };
    livekit_pb_add_track_request_t req = {
        .cid = VIDEO_TRACK_CID,
        .name = VIDEO_TRACK_NAME,
        .type = LIVEKIT_PB_TRACK_TYPE_VIDEO,
        .source = LIVEKIT_PB_TRACK_SOURCE_CAMERA,
        .muted = false,
        .layers_count = 1,
        .layers = { video_layer },
        .audio_features_count = 0
    };

    if (signal_send_add_track(eng->sig, &req) != SIGNAL_ERR_NONE) {
        ESP_LOGE(TAG, "Failed to publish video track");
        return ENGINE_ERR_SIGNALING;
    }
    return ENGINE_ERR_NONE;
}

/// Begins media streaming and sends add track requests.
static engine_err_t publish_tracks(engine_t *eng)
{
    if (eng->options.media.audio_info.codec == ESP_PEER_AUDIO_CODEC_NONE &&
        eng->options.media.video_info.codec == ESP_PEER_VIDEO_CODEC_NONE) {
        ESP_LOGI(TAG, "No media tracks to publish");
        return ENGINE_ERR_NONE;
    }

    int ret = ENGINE_ERR_OTHER;
    do {
        if (media_stream_begin(eng) != ENGINE_ERR_NONE) {
            ret = ENGINE_ERR_MEDIA;
            break;
        }
        if (eng->options.media.audio_info.codec != ESP_PEER_AUDIO_CODEC_NONE &&
            send_add_audio_track(eng) != ENGINE_ERR_NONE) {
            ret = ENGINE_ERR_SIGNALING;
            break;
        }
        if (eng->options.media.video_info.codec != ESP_PEER_VIDEO_CODEC_NONE &&
            send_add_video_track(eng) != ENGINE_ERR_NONE) {
            ret = ENGINE_ERR_SIGNALING;
            break;
        }
        return ENGINE_ERR_NONE;
    } while (0);

    media_stream_end(eng);
    return ret;
}

static engine_err_t subscribe_tracks(engine_t *eng, livekit_pb_track_info_t *tracks, int count)
{
    if (eng == NULL || tracks == NULL || count <= 0) {
        return ENGINE_ERR_INVALID_ARG;
    }
    if (eng->sub_audio_track_sid[0] != '\0') {
        return ENGINE_ERR_NONE;
    }
    for (int i = 0; i < count; i++) {
        livekit_pb_track_info_t *track = &tracks[i];

        if (track->type != LIVEKIT_PB_TRACK_TYPE_AUDIO) {
            continue;
        }
        signal_send_update_subscription(eng->sig, track->sid, true);
        strncpy(eng->sub_audio_track_sid, track->sid, sizeof(eng->sub_audio_track_sid));
        ESP_LOGI(TAG, "Subscribed to audio track");
    }
    return ENGINE_ERR_NONE;
}

static void free_ice_servers(engine_t *eng)
{
    if (eng == NULL || eng->ice_servers == NULL) {
        return;
    }
    esp_peer_ice_server_cfg_t *ice_servers = eng->ice_servers;
    for (int i = 0; i < eng->ice_server_count; i++) {
        SAFE_FREE(ice_servers[i].stun_url);
        SAFE_FREE(ice_servers[i].user);
        SAFE_FREE(ice_servers[i].psw);
    }
    SAFE_FREE(eng->ice_servers);
    eng->ice_server_count = 0;
}

__attribute__((unused))
static engine_err_t set_ice_servers(engine_t* eng, livekit_pb_ice_server_t *servers, int count)
{
    if (eng == NULL || servers == NULL || count <= 0) {
        return ENGINE_ERR_INVALID_ARG;
    }
    // A single livekit_ice_server_t can contain multiple URLs, which
    // will map to multiple esp_peer_ice_server_cfg_t entries.
    size_t cfg_count = 0;
    for (int i = 0; i < count; i++) {
        if (servers[i].urls_count <= 0) {
            return ENGINE_ERR_INVALID_ARG;
        }
        for (int j = 0; j < servers[i].urls_count; j++) {
            if (servers[i].urls[j] == NULL) {
                return ENGINE_ERR_INVALID_ARG;
            }
            cfg_count++;
        }
    }

    esp_peer_ice_server_cfg_t *cfgs = calloc(cfg_count, sizeof(esp_peer_ice_server_cfg_t));
    if (cfgs == NULL) {
        return ENGINE_ERR_NO_MEM;
    }

    int cfg_idx = 0;
    for (int i = 0; i < count; i++) {
        for (int j = 0; j < servers[i].urls_count; j++) {
            bool has_auth = false;
            cfgs[cfg_idx].stun_url = strdup(servers[i].urls[j]);
            if (servers[i].username != NULL) {
                cfgs[cfg_idx].user = strdup(servers[i].username);
                has_auth = true;
            }
            if (servers[i].credential != NULL) {
                cfgs[cfg_idx].psw = strdup(servers[i].credential);
                has_auth = true;
            }
            ESP_LOGI(TAG, "Adding ICE server: has_auth=%d, url=%s", has_auth, servers[i].urls[j]);
            cfg_idx++;
        }
    }

    free_ice_servers(eng);
    eng->ice_servers = cfgs;
    eng->ice_server_count = cfg_count;

    return ENGINE_ERR_NONE;
}

static void on_peer_pub_state_changed(connection_state_t state, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    if (state == CONNECTION_STATE_CONNECTED) {
        publish_tracks(eng);
    }
    eng->pub_state = state;
    recalculate_state(eng);
}

static void on_peer_sub_state_changed(connection_state_t state, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    eng->sub_state = state;
    recalculate_state(eng);
}

static void on_peer_pub_offer(const char *sdp, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    signal_send_offer(eng->sig, sdp);
}

static void on_peer_sub_answer(const char *sdp, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    signal_send_answer(eng->sig, sdp);
}

static void on_peer_ice_candidate(const char *candidate, void *ctx)
{
    ESP_LOGD(TAG, "Peer generated ice candidate: %s", candidate);
}

static void on_peer_packet_received(livekit_pb_data_packet_t* packet, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    eng->options.on_data_packet(packet, eng->options.ctx);
}

static void on_peer_sub_audio_info(esp_peer_audio_stream_info_t* info, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;

    av_render_audio_info_t render_info = {};
    convert_dec_aud_info(info, &render_info);
    ESP_LOGD(TAG, "Audio render info: codec=%d, sample_rate=%" PRIu32 ", channels=%" PRIu8,
        render_info.codec, render_info.sample_rate, render_info.channel);

    if (av_render_add_audio_stream(eng->renderer_handle, &render_info) != ESP_MEDIA_ERR_OK) {
        ESP_LOGE(TAG, "Failed to add audio stream to renderer");
        return;
    }
    eng->sub_audio_info = *info;
}

static void on_peer_sub_audio_frame(esp_peer_audio_frame_t* frame, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    if (eng->sub_audio_info.codec == ESP_PEER_AUDIO_CODEC_NONE) return;
    // TODO: Check engine state before rendering

     av_render_audio_data_t audio_data = {
        .pts = frame->pts,
        .data = frame->data,
        .size = frame->size,
    };
    av_render_add_audio_data(eng->renderer_handle, &audio_data);
}

static void on_sig_state_changed(connection_state_t state, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    eng->sig_state = state;
    recalculate_state(eng);
}

static bool disconnect_peer(peer_handle_t *peer)
{
    if (*peer == NULL) return false;
    if (peer_disconnect(*peer) != PEER_ERR_NONE) return false;
    if (peer_destroy(*peer) != PEER_ERR_NONE) return false;
    *peer = NULL;
    return true;
}

static bool connect_peer(engine_t *eng, peer_options_t *options, peer_handle_t *peer)
{
    disconnect_peer(peer);
    if (peer_create(peer, options) != PEER_ERR_NONE) return false;
    if (peer_connect(*peer) != PEER_ERR_NONE) return false;
    return true;
}

static void on_sig_join(livekit_pb_join_response_t *join_res, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;

    if (join_res->subscriber_primary) {
        eng->is_subscriber_primary = true;
        ESP_LOGE(TAG, "Subscriber primary is not supported yet");
        return;
    }

    // set_ice_servers(eng, join_res->ice_servers, join_res->ice_servers_count);

    peer_options_t options = {
        // Options common to both peers
        .force_relay = join_res->has_client_configuration &&
                       join_res->client_configuration.force_relay == LIVEKIT_PB_CLIENT_CONFIG_SETTING_ENABLED,
        .media = &eng->options.media,
        .server_list = eng->ice_servers,
        .server_count = eng->ice_server_count,
        .on_ice_candidate = on_peer_ice_candidate,
        .on_packet_received = on_peer_packet_received,
        .ctx = eng
    };

    // 1. Publisher peer
    options.is_primary = !join_res->subscriber_primary;
    options.target = LIVEKIT_PB_SIGNAL_TARGET_PUBLISHER;
    options.on_state_changed = on_peer_pub_state_changed;
    options.on_sdp = on_peer_pub_offer;

    if (!connect_peer(eng, &options, &eng->pub_peer)) {
       ESP_LOGE(TAG, "Failed to connect publisher peer");
       return;
    }

    // 2. Subscriber peer
    options.is_primary = join_res->subscriber_primary;
    options.target = LIVEKIT_PB_SIGNAL_TARGET_SUBSCRIBER;
    options.on_state_changed = on_peer_sub_state_changed;
    options.on_sdp = on_peer_sub_answer;
    options.on_audio_info = on_peer_sub_audio_info;
    options.on_audio_frame = on_peer_sub_audio_frame;

    if (!connect_peer(eng, &options, &eng->sub_peer)) {
        ESP_LOGE(TAG, "Failed to connect subscriber peer");
        return;
    }

    // Store fields from join response required for later use
    strncpy(eng->local_participant_sid, join_res->participant.sid, sizeof(eng->local_participant_sid));

    // Join response contains initial room and participant info (both local and remote);
    // extract and invoke the appropriate handlers.
    eng->options.on_room_info(&join_res->room, eng->options.ctx);
    eng->options.on_participant_info(&join_res->participant, true, eng->options.ctx);
    for (int i = 0; i < join_res->other_participants_count; i++) {
        eng->options.on_participant_info(&join_res->other_participants[i], false, eng->options.ctx);
    }
}

static void on_sig_leave(livekit_pb_disconnect_reason_t reason, livekit_pb_leave_request_action_t action, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    // TODO: Handle reconnect, update engine state
    disconnect_peer(&eng->pub_peer);
    disconnect_peer(&eng->sub_peer);

    memset(eng->local_participant_sid, 0, sizeof(eng->local_participant_sid));
    memset(eng->sub_audio_track_sid, 0, sizeof(eng->sub_audio_track_sid));
}

static void on_sig_room_update(const livekit_pb_room_t* info, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    eng->options.on_room_info(info, eng->options.ctx);
}

static void on_sig_participant_update(const livekit_pb_participant_info_t* info, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    bool is_local = strncmp(info->sid, eng->local_participant_sid, sizeof(eng->local_participant_sid)) == 0;
    eng->options.on_participant_info(info, is_local, eng->options.ctx);

    if (is_local) return;
    subscribe_tracks(eng, info->tracks, info->tracks_count);
}

static void on_sig_answer(const char *sdp, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    peer_handle_sdp(eng->pub_peer, sdp);
}

static void on_sig_offer(const char *sdp, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    peer_handle_sdp(eng->sub_peer, sdp);
}

static void on_sig_trickle(const char *ice_candidate, livekit_pb_signal_target_t target, void *ctx)
{
    engine_t *eng = (engine_t *)ctx;
    peer_handle_t target_peer = target == LIVEKIT_PB_SIGNAL_TARGET_SUBSCRIBER ?
        eng->sub_peer : eng->pub_peer;
    peer_handle_ice_candidate(target_peer, ice_candidate);
}

engine_err_t engine_create(engine_handle_t *handle, engine_options_t *options)
{
    if (handle                         == NULL ||
        options                        == NULL ||
        options->on_state_changed      == NULL ||
        options->on_data_packet        == NULL ||
        options->on_room_info          == NULL ||
        options->on_participant_info   == NULL
    ) {
        return ENGINE_ERR_INVALID_ARG;
    }

    engine_t *eng = (engine_t *)calloc(1, sizeof(engine_t));
    if (eng == NULL) {
        return ENGINE_ERR_NO_MEM;
    }
    eng->options = *options;
    signal_options_t sig_options = {
        .ctx = eng,
        .on_state_changed = on_sig_state_changed,
        .on_join = on_sig_join,
        .on_leave = on_sig_leave,
        .on_room_update = on_sig_room_update,
        .on_participant_update = on_sig_participant_update,
        .on_answer = on_sig_answer,
        .on_offer = on_sig_offer,
        .on_trickle = on_sig_trickle
    };

     if (signal_create(&eng->sig, &sig_options) != SIGNAL_ERR_NONE) {
        ESP_LOGE(TAG, "Failed to create signaling client");
        free(eng);
        return ENGINE_ERR_SIGNALING;
    }

     esp_capture_sink_cfg_t sink_cfg = {
        .audio_info = {
            .codec = capture_audio_codec_type(eng->options.media.audio_info.codec),
            .sample_rate = eng->options.media.audio_info.sample_rate,
            .channel = eng->options.media.audio_info.channel,
            .bits_per_sample = 16,
        },
        .video_info = {
            .codec = capture_video_codec_type(eng->options.media.video_info.codec),
            .width = eng->options.media.video_info.width,
            .height = eng->options.media.video_info.height,
            .fps = eng->options.media.video_info.fps,
        },
    };

    if (options->media.audio_info.codec != ESP_PEER_AUDIO_CODEC_NONE) {
        // TODO: Can we ensure the renderer is valid? If not, return error.
        eng->renderer_handle = options->media.renderer;
    }
    esp_capture_setup_path(eng->options.media.capturer, ESP_CAPTURE_PATH_PRIMARY, &sink_cfg, &eng->capturer_path);
    esp_capture_enable_path(eng->capturer_path, ESP_CAPTURE_RUN_TYPE_ALWAYS);
    // TODO: Handle capturer error

    *handle = eng;
    return ENGINE_ERR_NONE;
}

engine_err_t engine_destroy(engine_handle_t handle)
{
    if (handle == NULL) {
        return ENGINE_ERR_INVALID_ARG;
    }
    engine_t *eng = (engine_t *)handle;

    if (eng->pub_peer != NULL) {
        peer_destroy(eng->pub_peer);
    }
    if (eng->sub_peer != NULL) {
        peer_destroy(eng->sub_peer);
    }
    signal_destroy(eng->sig);
    free_ice_servers(eng);
    free(eng);
    return ENGINE_ERR_NONE;
}

engine_err_t engine_connect(engine_handle_t handle, const char* server_url, const char* token)
{
    if (handle == NULL || server_url == NULL || token == NULL) {
        return ENGINE_ERR_INVALID_ARG;
    }
    engine_t *eng = (engine_t *)handle;

    if (eng->state != CONNECTION_STATE_DISCONNECTED) {
        return ENGINE_ERR_OTHER;
    }
    if (signal_connect(eng->sig, server_url, token) != SIGNAL_ERR_NONE) {
        ESP_LOGE(TAG, "Failed to connect signaling client");
        return ENGINE_ERR_SIGNALING;
    }
    return ENGINE_ERR_NONE;
}

engine_err_t engine_close(engine_handle_t handle)
{
    if (handle == NULL) {
        return ENGINE_ERR_INVALID_ARG;
    }
    engine_t *eng = (engine_t *)handle;

    if (eng->state == CONNECTION_STATE_DISCONNECTED) {
        return ENGINE_ERR_OTHER;
    }
    media_stream_end(eng);
    // TODO: Reset just the stream that was added in case users added their own streams?
    av_render_reset(eng->renderer_handle);

    if (eng->sub_peer != NULL) {
        peer_disconnect(eng->sub_peer);
    }
    if (eng->pub_peer != NULL) {
        peer_disconnect(eng->pub_peer);
    }
    if (eng->sig != NULL) {
        // TODO: Ensure the WebSocket stays open long enough for the leave message to be sent
        signal_send_leave(eng->sig);
        signal_close(eng->sig);
    }
    return ENGINE_ERR_NONE;
}

engine_err_t engine_send_data_packet(engine_handle_t handle, const livekit_pb_data_packet_t* packet, livekit_pb_data_packet_kind_t kind)
{
    if (handle == NULL || packet == NULL) {
        return ENGINE_ERR_INVALID_ARG;
    }
    engine_t *eng = (engine_t *)handle;

    if (eng->pub_peer == NULL ||
        peer_send_data_packet(eng->pub_peer, packet, kind) != PEER_ERR_NONE) {
        return ENGINE_ERR_RTC;
    }
    return ENGINE_ERR_NONE;
}