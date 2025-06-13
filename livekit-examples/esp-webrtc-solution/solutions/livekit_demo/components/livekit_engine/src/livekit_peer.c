#include <stdlib.h>
#include "esp_log.h"
#include "esp_peer.h"
#include "esp_peer_default.h"
#include "esp_peer_signaling.h"
#include "esp_webrtc_defaults.h"
#include "media_lib_os.h"
#include "esp_codec_dev.h"

#include "livekit_peer.h"

static const char *SUB_TAG = "livekit_peer.sub";
static const char *PUB_TAG = "livekit_peer.pub";
#define TAG(peer) (peer->options.target == LIVEKIT_PB_SIGNAL_TARGET_SUBSCRIBER ? SUB_TAG : PUB_TAG)

#define RELIABLE_CHANNEL_LABEL "_reliable"
#define LOSSY_CHANNEL_LABEL "_lossy"

#define PC_EXIT_BIT      (1 << 0)
#define PC_PAUSED_BIT    (1 << 1)
#define PC_RESUME_BIT    (1 << 2)
#define PC_SEND_QUIT_BIT (1 << 3)

typedef struct {
    livekit_peer_options_t options;
    esp_peer_role_t ice_role;
    esp_peer_handle_t connection;
    esp_peer_state_t state;

    bool running;
    bool pause;
    media_lib_event_grp_handle_t wait_event;

    esp_codec_dev_handle_t        play_handle;
} livekit_peer_t;

static esp_peer_media_dir_t get_media_direction(esp_peer_media_dir_t direction, livekit_pb_signal_target_t target) {
    switch (target) {
        case LIVEKIT_PB_SIGNAL_TARGET_PUBLISHER:
            return direction & ESP_PEER_MEDIA_DIR_SEND_ONLY;
        case LIVEKIT_PB_SIGNAL_TARGET_SUBSCRIBER:
            return direction & ESP_PEER_MEDIA_DIR_RECV_ONLY;
    }
    return ESP_PEER_MEDIA_DIR_NONE;
}

static void peer_task(void *ctx)
{
    livekit_peer_t *peer = (livekit_peer_t *)ctx;
    ESP_LOGI(TAG(peer), "Task started");
    while (peer->running) {
        if (peer->pause) {
            media_lib_event_group_set_bits(peer->wait_event, PC_PAUSED_BIT);
            media_lib_event_group_wait_bits(peer->wait_event, PC_RESUME_BIT, MEDIA_LIB_MAX_LOCK_TIME);
            media_lib_event_group_clr_bits(peer->wait_event, PC_RESUME_BIT);
            continue;
        }
        esp_peer_main_loop(peer->connection);
        media_lib_thread_sleep(10);
    }
    media_lib_event_group_set_bits(peer->wait_event, PC_EXIT_BIT);
    media_lib_thread_destroy(NULL);
}

static void create_data_channels(livekit_peer_t *peer)
{
    if (peer->options.target != LIVEKIT_PB_SIGNAL_TARGET_PUBLISHER) return;
    esp_peer_data_channel_cfg_t channel_cfg = {};

    // TODO: This is a temporary solution to create data channels. This is NOT
    // actually reliable. Update once necessary options are exposed.
    channel_cfg.label = RELIABLE_CHANNEL_LABEL;
    if (esp_peer_create_data_channel(peer->connection, &channel_cfg) != ESP_PEER_ERR_NONE) {
        ESP_LOGE(TAG(peer), "Failed to create reliable data channel");
    }
    channel_cfg.label = LOSSY_CHANNEL_LABEL;
    if (esp_peer_create_data_channel(peer->connection, &channel_cfg) != ESP_PEER_ERR_NONE) {
        ESP_LOGE(TAG(peer), "Failed to create lossy data channel");
    }
}

static int on_state(esp_peer_state_t state, void *ctx)
{
    livekit_peer_t *peer = (livekit_peer_t *)ctx;
    ESP_LOGI(TAG(peer), "State changed to %d", state);

    switch (state) {
        case ESP_PEER_STATE_CONNECTED:
            create_data_channels(peer);
            break;
        default:
            break;
    }
    return 0;
}

static int on_msg(esp_peer_msg_t *info, void *ctx)
{
    livekit_peer_t *peer = (livekit_peer_t *)ctx;
    switch (info->type) {
        case ESP_PEER_MSG_TYPE_SDP:
            peer->options.on_sdp((char *)info->data, peer->options.ctx);
            break;
        case ESP_PEER_MSG_TYPE_CANDIDATE:
            peer->options.on_ice_candidate((char *)info->data, peer->options.ctx);
            break;
        default:
            ESP_LOGI(TAG(peer), "Unhandled msg type: %d", info->type);
            break;
    }
    return 0;
}

static int on_video_info(esp_peer_video_stream_info_t *info, void *ctx)
{
    livekit_peer_t *peer = (livekit_peer_t *)ctx;
    ESP_LOGI(TAG(peer), "Video info received: %d", info->codec);
    return 0;
}

static int on_audio_info(esp_peer_audio_stream_info_t *info, void *ctx)
{
    livekit_peer_t *peer = (livekit_peer_t *)ctx;
    ESP_LOGI(TAG(peer), "Audio info received: %d", info->codec);
    return 0;
}

static int on_video_data(esp_peer_video_frame_t *info, void *ctx)
{
    livekit_peer_t *peer = (livekit_peer_t *)ctx;
    ESP_LOGI(TAG(peer), "Video data received: size=%d", info->size);
    return 0;
}

static int on_audio_data(esp_peer_audio_frame_t *info, void *ctx)
{
    livekit_peer_t *peer = (livekit_peer_t *)ctx;
    ESP_LOGI(TAG(peer), "Audio data received: size=%d", info->size);
    return 0;
}

static int on_channel_open(esp_peer_data_channel_info_t *ch, void *ctx)
{
    livekit_peer_t *peer = (livekit_peer_t *)ctx;
    ESP_LOGI(TAG(peer), "Channel open: label=%s, stream_id=%d", ch->label, ch->stream_id);
    return 0;
}

static int on_channel_close(esp_peer_data_channel_info_t *ch, void *ctx)
{
    livekit_peer_t *peer = (livekit_peer_t *)ctx;
    ESP_LOGI(TAG(peer), "Channel close: label=%s, stream_id=%d", ch->label, ch->stream_id);
    return 0;
}

static int on_data(esp_peer_data_frame_t *frame, void *ctx)
{
    livekit_peer_t *peer = (livekit_peer_t *)ctx;
    ESP_LOGI(TAG(peer), "Data received: size=%d", frame->size);
    return 0;
}

livekit_peer_err_t livekit_peer_create(livekit_peer_handle_t *handle, livekit_peer_options_t options)
{
    if (handle == NULL || options.on_ice_candidate == NULL || options.on_sdp == NULL) {
        return LIVEKIT_PEER_ERR_INVALID_ARG;
    }

    livekit_peer_t *peer = (livekit_peer_t *)calloc(1, sizeof(livekit_peer_t));
    if (peer == NULL) {
        return LIVEKIT_PEER_ERR_NO_MEM;
    }
    peer->options = options;
    peer->ice_role = options.target == LIVEKIT_PB_SIGNAL_TARGET_SUBSCRIBER ?
            ESP_PEER_ROLE_CONTROLLED : ESP_PEER_ROLE_CONTROLLING;

    *handle = (livekit_peer_handle_t)peer;
    return LIVEKIT_PEER_ERR_NONE;
}

livekit_peer_err_t livekit_peer_destroy(livekit_peer_handle_t handle)
{
    if (handle == NULL) {
        return LIVEKIT_PEER_ERR_INVALID_ARG;
    }
    livekit_peer_t *peer = (livekit_peer_t *)handle;
    free(peer);
    return LIVEKIT_PEER_ERR_NONE;
}

livekit_peer_err_t livekit_peer_connect(livekit_peer_handle_t handle, livekit_peer_connect_options_t connect_options)
{
    if (handle == NULL) {
        return LIVEKIT_PEER_ERR_INVALID_ARG;
    }
    livekit_peer_t *peer = (livekit_peer_t *)handle;

    if (peer->connection != NULL) {
        if (peer->options.target == LIVEKIT_PB_SIGNAL_TARGET_PUBLISHER) {
            esp_peer_new_connection(peer->connection);
        }
        return LIVEKIT_PEER_ERR_NONE;
    }
    if (connect_options.media->video_info.codec == ESP_PEER_VIDEO_CODEC_MJPEG) {
        ESP_LOGE(TAG(peer), "MJPEG over data channel is not supported yet");
        return LIVEKIT_PEER_ERR_INVALID_ARG;
    }

    // Configuration for the default peer implementation.
    esp_peer_default_cfg_t default_peer_cfg = {
        .agent_recv_timeout = 10000,
        .data_ch_cfg = {
            .cache_timeout = 5000,
            .send_cache_size = 100 * 1024,
            .recv_cache_size = 100 * 1024
        }
    };

    esp_peer_media_dir_t audio_dir = get_media_direction(connect_options.media->audio_dir, peer->options.target);
    esp_peer_media_dir_t video_dir = get_media_direction(connect_options.media->video_dir, peer->options.target);
    ESP_LOGI(TAG(peer), "Audio dir: %d, Video dir: %d", audio_dir, video_dir);

    esp_peer_cfg_t peer_cfg = {
        .ice_trans_policy = connect_options.force_relay ?
            ESP_PEER_ICE_TRANS_POLICY_RELAY : ESP_PEER_ICE_TRANS_POLICY_ALL,
        .audio_dir = audio_dir,
        .video_dir = video_dir,
        .audio_info = connect_options.media->audio_info,
        .video_info = connect_options.media->video_info,
        .enable_data_channel = peer->options.target == LIVEKIT_PB_SIGNAL_TARGET_PUBLISHER,
        .manual_ch_create = true,
        .no_auto_reconnect = false,
        .extra_cfg = &default_peer_cfg,
        .extra_size = sizeof(default_peer_cfg),
        .on_state = on_state,
        .on_msg = on_msg,
        .on_video_info = on_video_info,
        .on_audio_info = on_audio_info,
        .on_video_data = on_video_data,
        .on_audio_data = on_audio_data,
        .on_channel_open = on_channel_open,
        .on_channel_close = on_channel_close,
        .on_data = on_data,
        .role = peer->ice_role,
        .ctx = peer
    };

    int ret = esp_peer_open(&peer_cfg, esp_peer_get_default_impl(), &peer->connection);
    if (ret != ESP_PEER_ERR_NONE) {
        ESP_LOGE(TAG(peer), "Failed to open peer connection: %d", ret);
        return LIVEKIT_PEER_ERR_RTC;
    }

    media_lib_event_group_create(&peer->wait_event);
    if (peer->wait_event == NULL) {
        return LIVEKIT_PEER_ERR_NO_MEM;
    }

    peer->running = true;
    media_lib_thread_handle_t thread;
    const char* thread_name = peer->options.target == LIVEKIT_PB_SIGNAL_TARGET_SUBSCRIBER ?
        "lk_sub_task" : "lk_pub_task";
    if (media_lib_thread_create_from_scheduler(&thread, thread_name, peer_task, peer) != ESP_PEER_ERR_NONE) {
        ESP_LOGE(TAG(peer), "Failed to create task");
        return LIVEKIT_PEER_ERR_RTC;
    }
    // TODO: Media configuration & capture setup

    if (peer->options.target == LIVEKIT_PB_SIGNAL_TARGET_PUBLISHER) {
        esp_peer_new_connection(peer->connection);
    }
    return LIVEKIT_PEER_ERR_NONE;
}

livekit_peer_err_t livekit_peer_disconnect(livekit_peer_handle_t handle)
{
    if (handle == NULL) {
        return LIVEKIT_PEER_ERR_INVALID_ARG;
    }
    livekit_peer_t *peer = (livekit_peer_t *)handle;

    if (peer->connection != NULL) {
        esp_peer_disconnect(peer->connection);
        bool still_running = peer->running;
        if (peer->pause) {
            peer->pause = false;
            media_lib_event_group_set_bits(peer->wait_event, PC_RESUME_BIT);
        }
        peer->running = false;
        if (still_running) {
            media_lib_event_group_wait_bits(peer->wait_event, PC_EXIT_BIT, MEDIA_LIB_MAX_LOCK_TIME);
            media_lib_event_group_clr_bits(peer->wait_event, PC_EXIT_BIT);
        }
        esp_peer_close(peer->connection);
        peer->connection = NULL;
    }
    if (peer->wait_event) {
        media_lib_event_group_destroy(peer->wait_event);
        peer->wait_event = NULL;
    }
    return LIVEKIT_PEER_ERR_NONE;
}

livekit_peer_err_t livekit_peer_set_ice_servers(livekit_peer_handle_t handle, esp_peer_ice_server_cfg_t *servers, int count)
{
    if (handle == NULL) {
        return LIVEKIT_PEER_ERR_INVALID_ARG;
    }
    livekit_peer_t *peer = (livekit_peer_t *)handle;
    esp_peer_update_ice_info(peer->connection, peer->ice_role, servers, count);
    return LIVEKIT_PEER_ERR_NONE;
}

livekit_peer_err_t livekit_peer_handle_sdp(livekit_peer_handle_t handle, const char *sdp)
{
    if (handle == NULL || sdp == NULL) {
        return LIVEKIT_PEER_ERR_INVALID_ARG;
    }
    livekit_peer_t *peer = (livekit_peer_t *)handle;

    esp_peer_msg_t msg = {
        .type = ESP_PEER_MSG_TYPE_SDP,
        .data = (void *)sdp,
        .size = strlen(sdp)
    };
    if (esp_peer_send_msg(peer->connection, &msg) != ESP_PEER_ERR_NONE) {
        ESP_LOGE(TAG(peer), "Failed to handle answer");
        return LIVEKIT_PEER_ERR_RTC;
    }
    return LIVEKIT_PEER_ERR_NONE;
}

livekit_peer_err_t livekit_peer_handle_ice_candidate(livekit_peer_handle_t handle, const char *candidate)
{
    if (handle == NULL || candidate == NULL) {
        return LIVEKIT_PEER_ERR_INVALID_ARG;
    }
    livekit_peer_t *peer = (livekit_peer_t *)handle;

    esp_peer_msg_t msg = {
        .type = ESP_PEER_MSG_TYPE_CANDIDATE,
        .data = (void *)candidate,
        .size = strlen(candidate)
    };
    if (esp_peer_send_msg(peer->connection, &msg) != ESP_PEER_ERR_NONE) {
        ESP_LOGE(TAG(peer), "Failed to handle ICE candidate");
        return LIVEKIT_PEER_ERR_RTC;
    }
    return LIVEKIT_PEER_ERR_NONE;
}