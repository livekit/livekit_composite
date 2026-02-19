#include "example.h"
#include "board.h"
#include "cJSON.h"
#include "esp_log.h"
#include "livekit.h"
#include "livekit_sandbox.h"
#include "media.h"

static const char *TAG = "livekit_example";

static livekit_room_handle_t room_handle;

/**
 * @brief Parse and log bounding box detections
 *
 * Expected JSON format from cloud processor:
 * {
 *   "boxes": [
 *     {"class": "person", "confidence": 0.95, "x1": 0.1, "y1": 0.2, "x2": 0.5, "y2": 0.8},
 *     ...
 *   ]
 * }
 */
static void parse_bounding_boxes(const uint8_t *data, size_t len) {
    // Null-terminate the JSON string
    char *json_str = malloc(len + 1);
    if (!json_str) {
        ESP_LOGE(TAG, "Failed to allocate memory for JSON");
        return;
    }
    memcpy(json_str, data, len);
    json_str[len] = '\0';

    // Parse JSON
    cJSON *root = cJSON_Parse(json_str);
    if (!root) {
        ESP_LOGE(TAG, "Failed to parse JSON: %s", cJSON_GetErrorPtr());
        free(json_str);
        return;
    }

    // Get boxes array
    cJSON *boxes = cJSON_GetObjectItem(root, "boxes");
    if (!boxes || !cJSON_IsArray(boxes)) {
        cJSON_Delete(root);
        free(json_str);
        return;
    }

    int box_count = cJSON_GetArraySize(boxes);
    if (box_count > 0) {
        ESP_LOGI(TAG, "Detected %d object(s):", box_count);

        cJSON *box;
        int idx = 0;
        cJSON_ArrayForEach(box, boxes) {
            cJSON *cls = cJSON_GetObjectItem(box, "class");
            cJSON *conf = cJSON_GetObjectItem(box, "confidence");
            cJSON *x1 = cJSON_GetObjectItem(box, "x1");
            cJSON *y1 = cJSON_GetObjectItem(box, "y1");
            cJSON *x2 = cJSON_GetObjectItem(box, "x2");
            cJSON *y2 = cJSON_GetObjectItem(box, "y2");

            const char *class_name = (cls && cJSON_IsString(cls)) ? cls->valuestring : "unknown";

            if (conf && x1 && y1 && x2 && y2) {
                ESP_LOGI(TAG,
                         "  [%d] %s conf=%.2f x1=%.3f y1=%.3f x2=%.3f y2=%.3f",
                         idx,
                         class_name,
                         cJSON_IsNumber(conf) ? conf->valuedouble : 0.0,
                         cJSON_IsNumber(x1) ? x1->valuedouble : 0.0,
                         cJSON_IsNumber(y1) ? y1->valuedouble : 0.0,
                         cJSON_IsNumber(x2) ? x2->valuedouble : 0.0,
                         cJSON_IsNumber(y2) ? y2->valuedouble : 0.0);
            }
            idx++;
        }
    }

    cJSON_Delete(root);
    free(json_str);
}

/**
 * @brief Callback for received data packets
 */
static void on_data_received(const livekit_data_received_t *data, void *ctx) {
    if (!data || !data->topic) {
        return;
    }

    if (strcmp(data->topic, "bounding_boxes") == 0) {
        parse_bounding_boxes(data->payload.bytes, data->payload.size);
    }
}

/// Invoked when the room's connection state changes.
static void on_state_changed(livekit_connection_state_t state, void *ctx) {
    ESP_LOGI(TAG, "Room state changed: %s", livekit_connection_state_str(state));

    livekit_failure_reason_t reason = livekit_room_get_failure_reason(room_handle);
    if (reason != LIVEKIT_FAILURE_REASON_NONE) {
        ESP_LOGE(TAG, "Failure reason: %s", livekit_failure_reason_str(reason));
    }
}

void join_room() {
    if (room_handle != NULL) {
        ESP_LOGE(TAG, "Room already created");
        return;
    }

    livekit_room_options_t room_options = {
        .publish = {.kind = LIVEKIT_MEDIA_TYPE_BOTH,
                    .audio_encode = {.codec = LIVEKIT_AUDIO_CODEC_G711A,
                                     .sample_rate = 8000,
                                     .channel_count = 1},
                    .video_encode = {.codec = LIVEKIT_VIDEO_CODEC_H264,
                                     .width = CONFIG_LK_EXAMPLE_VIDEO_WIDTH,
                                     .height = CONFIG_LK_EXAMPLE_VIDEO_HEIGHT,
                                     .fps = CONFIG_LK_EXAMPLE_VIDEO_FPS},
                    .capturer = media_get_capturer()},
        .on_state_changed = on_state_changed,
        .on_data_received = on_data_received,
    };
    if (livekit_room_create(&room_handle, &room_options) != LIVEKIT_ERR_NONE) {
        ESP_LOGE(TAG, "Failed to create room");
        return;
    }

    livekit_err_t connect_res;
#ifdef CONFIG_LK_EXAMPLE_USE_SANDBOX
    // Option A: Sandbox token server.
    livekit_sandbox_res_t res = {};
    livekit_sandbox_options_t gen_options = {.sandbox_id = CONFIG_LK_EXAMPLE_SANDBOX_ID,
                                             .room_name = CONFIG_LK_EXAMPLE_ROOM_NAME,
                                             .participant_name =
                                                 CONFIG_LK_EXAMPLE_PARTICIPANT_NAME};
    if (!livekit_sandbox_generate(&gen_options, &res)) {
        ESP_LOGE(TAG, "Failed to generate sandbox token");
        return;
    }
    connect_res = livekit_room_connect(room_handle, res.server_url, res.token);
    livekit_sandbox_res_free(&res);
#else
    // Option B: Pre-generated token.
    connect_res =
        livekit_room_connect(room_handle, CONFIG_LK_EXAMPLE_SERVER_URL, CONFIG_LK_EXAMPLE_TOKEN);
#endif

    if (connect_res != LIVEKIT_ERR_NONE) {
        ESP_LOGE(TAG, "Failed to connect to room");
    }
}

void leave_room() {
    if (room_handle == NULL) {
        ESP_LOGE(TAG, "Room not created");
        return;
    }
    if (livekit_room_close(room_handle) != LIVEKIT_ERR_NONE) {
        ESP_LOGE(TAG, "Failed to leave room");
    }
    if (livekit_room_destroy(room_handle) != LIVEKIT_ERR_NONE) {
        ESP_LOGE(TAG, "Failed to destroy room");
        return;
    }
    room_handle = NULL;
}
