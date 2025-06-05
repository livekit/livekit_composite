/* VideoCall WebRTC application code

   This example code is in the Public Domain (or CC0 licensed, at your option.)

   Unless required by applicable law or agreed to in writing, this
   software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
   CONDITIONS OF ANY KIND, either express or implied.
*/

#include "esp_webrtc.h"
#include "media_lib_os.h"
#include "driver/gpio.h"
#include "common.h"
#include "esp_log.h"
#include "esp_webrtc_defaults.h"
#include "esp_peer_default.h"
#include "media_lib_os.h"

#define TAG "VIDEO_CALL"

#define RUN_ASYNC(name, body)           \
    void run_async##name(void *arg)     \
    {                                   \
        body;                           \
        media_lib_thread_destroy(NULL); \
    }                                   \
    media_lib_thread_create_from_scheduler(NULL, #name, run_async##name, NULL);

// Customized commands
#define VIDEO_CALL_RING_CMD          "RING"
#define VIDEO_CALL_CALL_ACCEPTED_CMD "ACCEPT_CALL"
#define VIDEO_CALL_CALL_DENIED_CMD   "DENY_CALL"
#define VIDEO_CALL_TIMEOUT           30000

#define VIDEO_CALL_DATA_CH_SEND_CACHE_SIZE (400 * 1024)
#define VIDEO_CALL_DATA_CH_RECV_CACHE_SIZE (400 * 1024)

#define SAME_STR(a, b) (strncmp(a, b, sizeof(b) - 1) == 0)
#define SEND_CMD(webrtc, cmd) \
    esp_webrtc_send_custom_data(webrtc, ESP_WEBRTC_CUSTOM_DATA_VIA_SIGNALING, (uint8_t *)cmd, strlen(cmd))

typedef enum {
    VIDEO_CALL_STATE_NONE,
    VIDEO_CALL_STATE_RINGING,
    VIDEO_CALL_STATE_CONNECTING,
    VIDEO_CALL_STATE_CONNECTED,
} video_call_state_t;

typedef enum {
    VIDEO_CALL_TONE_RING,
    VIDEO_CALL_TONE_OPEN_DOOR,
} video_call_tone_type_t;

typedef struct {
    const uint8_t *start;
    const uint8_t *end;
    int            duration;
} video_call_tone_data_t;

static esp_webrtc_handle_t webrtc;
static bool                video_call_initiator;
static video_call_state_t  video_call_state;
static bool                monitor_key;

extern const uint8_t ring_music_start[] asm("_binary_ring_aac_start");
extern const uint8_t ring_music_end[] asm("_binary_ring_aac_end");

static int play_tone(video_call_tone_type_t type)
{
    video_call_tone_data_t tone_data[] = {
        { ring_music_start, ring_music_end, 4000 },
    };
    if (type >= sizeof(tone_data) / sizeof(tone_data[0])) {
        return 0;
    }
    return play_music(tone_data[type].start, (int)(tone_data[type].end - tone_data[type].start), tone_data[type].duration);
}

int play_tone_int(int t)
{
    return play_tone((video_call_tone_type_t)t);
}

static void video_call_change_state(video_call_state_t state)
{
    video_call_state = state;
    if (state == VIDEO_CALL_STATE_CONNECTING || state == VIDEO_CALL_STATE_NONE) {
        stop_music();
    }
    // Clear initiator status
    if (state == VIDEO_CALL_STATE_NONE) {
        video_call_initiator = false;
    }
}

static int video_call_on_cmd(esp_webrtc_custom_data_via_t via, uint8_t *data, int size, void *ctx)
{
    if (size == 0 || webrtc == NULL) {
        return 0;
    }
    ESP_LOGI(TAG, "Receive command %.*s", size, (char *)data);

    const char *cmd = (const char *)data;
    if (SAME_STR(cmd, VIDEO_CALL_RING_CMD)) {
        // When receive peer ring command
        if (video_call_state < VIDEO_CALL_STATE_CONNECTING) {
            video_call_change_state(VIDEO_CALL_STATE_CONNECTING);
            RUN_ASYNC(ring, {
                play_tone(VIDEO_CALL_TONE_RING);
            });
        }
        return 0;
    }
    // Answer for peer call
    if (SAME_STR(cmd, VIDEO_CALL_CALL_ACCEPTED_CMD)) {
        video_call_change_state(VIDEO_CALL_STATE_CONNECTING);
        esp_webrtc_enable_peer_connection(webrtc, true);
    } else if (SAME_STR(cmd, VIDEO_CALL_CALL_DENIED_CMD)) {
        esp_webrtc_enable_peer_connection(webrtc, false);
        video_call_change_state(VIDEO_CALL_STATE_NONE);
    }
    return 0;
}

static int webrtc_event_handler(esp_webrtc_event_t *event, void *ctx)
{
    if (event->type == ESP_WEBRTC_EVENT_CONNECTED) {
        video_call_change_state(VIDEO_CALL_STATE_CONNECTED);
    } else if (event->type == ESP_WEBRTC_EVENT_CONNECT_FAILED || event->type == ESP_WEBRTC_EVENT_DISCONNECTED) {
        video_call_change_state(VIDEO_CALL_STATE_NONE);
    }
    return 0;
}

void key_pressed(void)
{
    if (video_call_state < VIDEO_CALL_STATE_CONNECTING) {
        SEND_CMD(webrtc, VIDEO_CALL_RING_CMD);
        ESP_LOGI(TAG, "Ring button on state %d", video_call_state);
        video_call_change_state(VIDEO_CALL_STATE_RINGING);
        video_call_initiator = true;
    } else if (video_call_state == VIDEO_CALL_STATE_CONNECTING && video_call_initiator == false) {
        // Accept call
        SEND_CMD(webrtc, VIDEO_CALL_CALL_ACCEPTED_CMD);
        video_call_change_state(VIDEO_CALL_STATE_CONNECTING);
        esp_webrtc_enable_peer_connection(webrtc, true);
        ESP_LOGI(TAG, "Accept call");
    } else if (video_call_state == VIDEO_CALL_STATE_CONNECTED) {
        // Deny call
        ESP_LOGI(TAG, "Hang off now");
        SEND_CMD(webrtc, VIDEO_CALL_CALL_DENIED_CMD);
        esp_webrtc_enable_peer_connection(webrtc, false);
        video_call_change_state(VIDEO_CALL_STATE_NONE);
    }
}

static void key_monitor_thread(void *arg)
{
    gpio_config_t io_conf;
    memset(&io_conf, 0, sizeof(io_conf));
    io_conf.mode = GPIO_MODE_INPUT;
    io_conf.pin_bit_mask = BIT64(VIDEO_CALL_RING_BUTTON);
    io_conf.pull_down_en = 1;
    esp_err_t ret = 0;
    ret |= gpio_config(&io_conf);

    media_lib_thread_sleep(50);
    int last_level = gpio_get_level(VIDEO_CALL_RING_BUTTON);
    int init_level = last_level;
    uint32_t ring_timeout = 0;

    while (monitor_key) {
        media_lib_thread_sleep(50);
        // Check connecting timeout
        if (video_call_state == VIDEO_CALL_STATE_CONNECTING && video_call_state == VIDEO_CALL_STATE_RINGING) {
            ring_timeout += 50;
            if (ring_timeout > VIDEO_CALL_TIMEOUT) {
                video_call_change_state(VIDEO_CALL_STATE_NONE);
            }
        }
        // Multifunction button:
        //     1. Send ring if state is not connecting
        //     2. Accept call if state is connecting
        //     3. Deny call if state is connected
        int level = gpio_get_level(VIDEO_CALL_RING_BUTTON);
        if (level != last_level) {
            last_level = level;
            if (level != init_level) {
                key_pressed();
            }
        }
    }
    media_lib_thread_destroy(NULL);
}

int start_webrtc(char *url)
{
    if (network_is_connected() == false) {
        ESP_LOGE(TAG, "Wifi not connected yet");
        return -1;
    }
    if (url[0] == 0) {
        ESP_LOGE(TAG, "Room Url not set yet");
        return -1;
    }
    if (webrtc) {
        esp_webrtc_close(webrtc);
        webrtc = NULL;
    }
    monitor_key = true;
    media_lib_thread_handle_t key_thread;
    media_lib_thread_create_from_scheduler(&key_thread, "Key", key_monitor_thread, NULL);
    // Set data channel size for video packets
    esp_peer_default_cfg_t peer_default_cfg = {
        .data_ch_cfg = {
            .send_cache_size = VIDEO_CALL_DATA_CH_SEND_CACHE_SIZE,
            .recv_cache_size = VIDEO_CALL_DATA_CH_RECV_CACHE_SIZE,
        }
    };

    esp_webrtc_cfg_t cfg = {
        .peer_cfg = {
            .audio_info = {
                .codec = ESP_PEER_AUDIO_CODEC_G711A,
            },
            .video_info = {
                .codec = ESP_PEER_VIDEO_CODEC_MJPEG,
                .width = VIDEO_WIDTH,
                .height = VIDEO_HEIGHT,
                .fps = VIDEO_FPS,
            },
            .audio_dir = ESP_PEER_MEDIA_DIR_SEND_RECV,
            .video_dir = ESP_PEER_MEDIA_DIR_SEND_RECV,
            .on_custom_data = video_call_on_cmd,
            .enable_data_channel = DATA_CHANNEL_ENABLED,
            .no_auto_reconnect = true,       // No auto connect peer when signaling connected
            .video_over_data_channel = true, // MJPEG video transfer over data channel
            .extra_cfg = &peer_default_cfg,
            .extra_size = sizeof(peer_default_cfg),
        },
        .signaling_cfg = {
            .signal_url = url,
        },
        .peer_impl = esp_peer_get_default_impl(),
        .signaling_impl = esp_signaling_get_apprtc_impl(),
    };
    int ret = esp_webrtc_open(&cfg, &webrtc);
    if (ret != 0) {
        ESP_LOGE(TAG, "Fail to open webrtc");
        return ret;
    }
    // Set media provider
    esp_webrtc_media_provider_t media_provider = {};
    media_sys_get_provider(&media_provider);
    esp_webrtc_set_media_provider(webrtc, &media_provider);

    // Set event handler
    esp_webrtc_set_event_handler(webrtc, webrtc_event_handler, NULL);

    // Default disable auto connect of peer connection
    esp_webrtc_enable_peer_connection(webrtc, false);

    // Start webrtc
    ret = esp_webrtc_start(webrtc);
    if (ret != 0) {
        ESP_LOGE(TAG, "Fail to start webrtc");
    }
    return ret;
}

void query_webrtc(void)
{
    if (webrtc) {
        esp_webrtc_query(webrtc);
    }
}

int stop_webrtc(void)
{
    if (webrtc) {
        monitor_key = false;
        esp_webrtc_handle_t handle = webrtc;
        webrtc = NULL;
        ESP_LOGI(TAG, "Start to close webrtc %p", handle);
        esp_webrtc_close(handle);
    }
    return 0;
}
