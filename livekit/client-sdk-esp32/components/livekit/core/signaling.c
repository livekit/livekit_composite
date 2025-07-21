#include <inttypes.h>
#include <cJSON.h>
#define LOG_LOCAL_LEVEL ESP_LOG_DEBUG
#include "esp_log.h"
#include "esp_peer_signaling.h"
#include "esp_netif.h"
#include "media_lib_os.h"
#ifdef CONFIG_MBEDTLS_CERTIFICATE_BUNDLE
#include "esp_crt_bundle.h"
#endif
#include "esp_websocket_client.h"
#include "esp_tls.h"
#include "esp_timer.h"

#include "protocol.h"
#include "signaling.h"
#include "url.h"
#include "utils.h"

static const char *TAG = "livekit_signaling";

#define SIGNAL_WS_BUFFER_SIZE          20 * 1024
#define SIGNAL_WS_RECONNECT_TIMEOUT_MS 1000
#define SIGNAL_WS_NETWORK_TIMEOUT_MS   10000
#define SIGNAL_WS_CLOSE_CODE           1000
#define SIGNAL_WS_CLOSE_TIMEOUT_MS     250

typedef struct {
    esp_websocket_client_handle_t ws;
    signal_options_t         options;
    esp_timer_handle_t            ping_timer;

    int32_t                       ping_interval_ms;
    int32_t                       ping_timeout_ms;
    int64_t                       rtt;
} signal_t;

static void log_error_if_nonzero(const char *message, int error_code)
{
    if (error_code != 0) {
        ESP_LOGE(TAG, "Last error %s: 0x%x", message, error_code);
    }
}

static signal_err_t send_request(signal_t *sg, livekit_pb_signal_request_t *request)
{
    // TODO: Optimize (use static buffer for small messages)
    ESP_LOGD(TAG, "Sending request: type=%d", request->which_message);

    size_t encoded_size = 0;
    if (!pb_get_encoded_size(&encoded_size, LIVEKIT_PB_SIGNAL_REQUEST_FIELDS, request)) {
        return SIGNAL_ERR_MESSAGE;
    }
    uint8_t *enc_buf = (uint8_t *)malloc(encoded_size);
    if (enc_buf == NULL) {
        return SIGNAL_ERR_NO_MEM;
    }
    int ret = SIGNAL_ERR_NONE;
    do {
        pb_ostream_t stream = pb_ostream_from_buffer(enc_buf, encoded_size);
        if (!pb_encode(&stream, LIVEKIT_PB_SIGNAL_REQUEST_FIELDS, request)) {
            ESP_LOGE(TAG, "Failed to encode request");
            ret = SIGNAL_ERR_MESSAGE;
            break;
        }
        if (esp_websocket_client_send_bin(sg->ws,
                (const char *)enc_buf,
                stream.bytes_written,
                portMAX_DELAY) < 0) {
            ESP_LOGE(TAG, "Failed to send request");
            ret = SIGNAL_ERR_MESSAGE;
            break;
        }
    } while (0);
    free(enc_buf);
    return ret;
}

static void send_ping(void *arg)
{
    signal_t *sg = (signal_t *)arg;

    livekit_pb_signal_request_t req = LIVEKIT_PB_SIGNAL_REQUEST_INIT_DEFAULT;
    req.which_message = LIVEKIT_PB_SIGNAL_REQUEST_PING_REQ_TAG;
    req.message.ping_req.timestamp = get_unix_time_ms();
    req.message.ping_req.rtt = sg->rtt;

    send_request(sg, &req);
}

static void handle_res(signal_t *sg, livekit_pb_signal_response_t *res)
{
    switch (res->which_message) {
        case LIVEKIT_PB_SIGNAL_RESPONSE_PONG_RESP_TAG:
            livekit_pb_pong_t *pong = &res->message.pong_resp;
            sg->rtt = get_unix_time_ms() - pong->last_ping_timestamp;
            // TODO: Reset ping timeout
            break;
        case LIVEKIT_PB_SIGNAL_RESPONSE_REFRESH_TOKEN_TAG:
            // TODO: Handle refresh token
            break;
        case LIVEKIT_PB_SIGNAL_RESPONSE_JOIN_TAG:
            livekit_pb_join_response_t *join_res = &res->message.join;
            ESP_LOGI(TAG, "Join: subscriber_primary=%d", join_res->subscriber_primary);

            sg->ping_interval_ms = join_res->ping_interval * 1000;
            sg->ping_timeout_ms = join_res->ping_timeout * 1000;
            esp_timer_start_periodic(sg->ping_timer, sg->ping_interval_ms * 1000);

            sg->options.on_join(join_res, sg->options.ctx);
            break;
        case LIVEKIT_PB_SIGNAL_RESPONSE_LEAVE_TAG:
            livekit_pb_leave_request_t *leave_res = &res->message.leave;
            ESP_LOGI(TAG, "Leave: reason=%d, action=%d", leave_res->reason, leave_res->action);
            esp_timer_stop(sg->ping_timer);
            sg->options.on_leave(leave_res->reason, leave_res->action, sg->options.ctx);
            break;
        case LIVEKIT_PB_SIGNAL_RESPONSE_ROOM_UPDATE_TAG:
            livekit_pb_room_update_t *room_update = &res->message.room_update;
            if (!room_update->has_room) break;
            sg->options.on_room_update(&room_update->room, sg->options.ctx);
            break;
        case LIVEKIT_PB_SIGNAL_RESPONSE_UPDATE_TAG:
            livekit_pb_participant_update_t *participant_update = &res->message.update;
            for (int i = 0; i < participant_update->participants_count; i++) {
                sg->options.on_participant_update(&participant_update->participants[i], sg->options.ctx);
            }
            break;
        case LIVEKIT_PB_SIGNAL_RESPONSE_OFFER_TAG:
            livekit_pb_session_description_t *offer = &res->message.offer;
            ESP_LOGI(TAG, "Offer: id=%" PRIu32 "\n%s", offer->id, offer->sdp);
            sg->options.on_offer(offer->sdp, sg->options.ctx);
            break;
        case LIVEKIT_PB_SIGNAL_RESPONSE_ANSWER_TAG:
            livekit_pb_session_description_t *answer = &res->message.answer;
            ESP_LOGI(TAG, "Answer: id=%" PRIu32 "\n%s", answer->id, answer->sdp);
            sg->options.on_answer(answer->sdp, sg->options.ctx);
            break;
        case LIVEKIT_PB_SIGNAL_RESPONSE_TRICKLE_TAG:
            livekit_pb_trickle_request_t *trickle = &res->message.trickle;
            if (trickle->candidate_init == NULL) {
                ESP_LOGE(TAG, "Trickle candidate_init is NULL");
                break;
            }
            cJSON *candidate_init = NULL;
            do {
                candidate_init = cJSON_Parse(trickle->candidate_init);
                if (candidate_init == NULL) {
                    const char *error_ptr = cJSON_GetErrorPtr();
                    if (error_ptr != NULL) {
                        ESP_LOGE(TAG, "Failed to parse candidate_init: %s", error_ptr);
                    }
                    break;
                }
                cJSON *candidate = cJSON_GetObjectItemCaseSensitive(candidate_init, "candidate");
                if (!cJSON_IsString(candidate) || (candidate->valuestring == NULL)) {
                    ESP_LOGE(TAG, "Missing candidate key in candidate_init");
                    break;
                }
                ESP_LOGI(TAG, "Trickle: target=%d, final=%d\n%s",
                    trickle->target,
                    trickle->final,
                    candidate->valuestring
                );
                sg->options.on_trickle(candidate->valuestring, trickle->target, sg->options.ctx);
            } while (0);
            cJSON_Delete(candidate_init);
            break;
        default:
            break;
    }
    pb_release(LIVEKIT_PB_SIGNAL_RESPONSE_FIELDS, res);
}

static void on_data(signal_t *sg, const char *data, size_t len)
{
    ESP_LOGD(TAG, "Incoming res: %d byte(s)", len);
    livekit_pb_signal_response_t res = {};
    pb_istream_t stream = pb_istream_from_buffer((const pb_byte_t *)data, len);
    if (!pb_decode(&stream, LIVEKIT_PB_SIGNAL_RESPONSE_FIELDS, &res)) {
        ESP_LOGE(TAG, "Failed to decode res: %s", stream.errmsg);
        return;
    }
    handle_res(sg, &res);
}

static void on_ws_event(void *ctx, esp_event_base_t base, int32_t event_id, void *event_data)
{
    assert(ctx != NULL);
    signal_t *sg = (signal_t *)ctx;
    esp_websocket_event_data_t *data = (esp_websocket_event_data_t *)event_data;

    switch (event_id) {
        case WEBSOCKET_EVENT_CONNECTED:
            ESP_LOGD(TAG, "Signaling connected");
            sg->options.on_state_changed(CONNECTION_STATE_CONNECTED, sg->options.ctx);
            break;
        case WEBSOCKET_EVENT_DISCONNECTED:
            ESP_LOGD(TAG, "Signaling disconnected");

            // In the normal case, this timer will be stopped when the leave message is received.
            // However, if the connection is lost, we need to stop the timer manually.
            esp_timer_stop(sg->ping_timer);

            log_error_if_nonzero("HTTP status code", data->error_handle.esp_ws_handshake_status_code);
            if (data->error_handle.error_type == WEBSOCKET_ERROR_TYPE_TCP_TRANSPORT) {
                log_error_if_nonzero("reported from esp-tls", data->error_handle.esp_tls_last_esp_err);
                log_error_if_nonzero("reported from tls stack", data->error_handle.esp_tls_stack_err);
                log_error_if_nonzero("captured as transport's socket errno", data->error_handle.esp_transport_sock_errno);
            }
            sg->options.on_state_changed(CONNECTION_STATE_DISCONNECTED, sg->options.ctx);
            break;
        case WEBSOCKET_EVENT_DATA:
            if (data->op_code != WS_TRANSPORT_OPCODES_BINARY) {
                ESP_LOGD(TAG, "Message: opcode=%d, len=%d", data->op_code, data->data_len);
                break;
            }
            if (data->data_len < 1) break;
            on_data(sg, data->data_ptr, data->data_len);
            break;
        case WEBSOCKET_EVENT_ERROR:
            ESP_LOGE(TAG, "Failed to connect to server");
            esp_timer_stop(sg->ping_timer);

            log_error_if_nonzero("HTTP status code", data->error_handle.esp_ws_handshake_status_code);
            if (data->error_handle.error_type == WEBSOCKET_ERROR_TYPE_TCP_TRANSPORT) {
                log_error_if_nonzero("reported from esp-tls", data->error_handle.esp_tls_last_esp_err);
                log_error_if_nonzero("reported from tls stack", data->error_handle.esp_tls_stack_err);
                log_error_if_nonzero("captured as transport's socket errno", data->error_handle.esp_transport_sock_errno);
            }
            sg->options.on_state_changed(CONNECTION_STATE_FAILED, sg->options.ctx);
            break;
        default: break;
    }
}

signal_err_t signal_create(signal_handle_t *handle, signal_options_t *options)
{
    if (options == NULL || handle == NULL) {
        return SIGNAL_ERR_INVALID_ARG;
    }

    if (options->on_state_changed      == NULL ||
        options->on_join               == NULL ||
        options->on_leave              == NULL ||
        options->on_room_update        == NULL ||
        options->on_participant_update == NULL ||
        options->on_offer              == NULL ||
        options->on_answer             == NULL ||
        options->on_trickle            == NULL
    ) {
        ESP_LOGE(TAG, "Missing required event handlers");
        return SIGNAL_ERR_INVALID_ARG;
    }

    signal_t *sg = calloc(1, sizeof(signal_t));
    if (sg == NULL) {
        return SIGNAL_ERR_NO_MEM;
    }
    sg->options = *options;

    esp_timer_create_args_t timer_args = {
        .callback = send_ping,
        .arg = sg,
        .name = "ping"
    };
    if (esp_timer_create(&timer_args, &sg->ping_timer) != ESP_OK) {
        ESP_LOGE(TAG, "Failed to create ping timer");
        free(sg);
        return SIGNAL_ERR_OTHER;
    }

    // URL will be set on connect
    static esp_websocket_client_config_t ws_config = {
        .buffer_size = SIGNAL_WS_BUFFER_SIZE,
        .disable_pingpong_discon = true,
        .reconnect_timeout_ms = SIGNAL_WS_RECONNECT_TIMEOUT_MS,
        .network_timeout_ms = SIGNAL_WS_NETWORK_TIMEOUT_MS,
#ifdef CONFIG_MBEDTLS_CERTIFICATE_BUNDLE
        .crt_bundle_attach = esp_crt_bundle_attach
#endif
    };
    sg->ws = esp_websocket_client_init(&ws_config);
    if (sg->ws == NULL) {
        ESP_LOGE(TAG, "Failed to initialize WebSocket client");
        esp_timer_delete(sg->ping_timer);
        free(sg);
        return SIGNAL_ERR_WEBSOCKET;
    }
    esp_websocket_register_events(
        sg->ws,
        WEBSOCKET_EVENT_ANY,
        on_ws_event,
        (void *)sg
    );
    *handle = sg;
    return SIGNAL_ERR_NONE;
}

signal_err_t signal_destroy(signal_handle_t handle)
{
    if (handle == NULL) {
        return SIGNAL_ERR_INVALID_ARG;
    }
    signal_t *sg = (signal_t *)handle;
    esp_timer_delete(sg->ping_timer);
    signal_close(handle);
    esp_websocket_client_destroy(sg->ws);
    free(sg);
    return SIGNAL_ERR_NONE;
}

signal_err_t signal_connect(signal_handle_t handle, const char* server_url, const char* token)
{
    if (server_url == NULL || token == NULL || handle == NULL) {
        return SIGNAL_ERR_INVALID_ARG;
    }
    signal_t *sg = (signal_t *)handle;

    char* url;
    if (!url_build(server_url, token, &url)) {
        return SIGNAL_ERR_INVALID_URL;
    }
    esp_websocket_client_set_uri(sg->ws, url);
    free(url);

    if (esp_websocket_client_start(sg->ws) != ESP_OK) {
        ESP_LOGE(TAG, "Failed to start WebSocket");
        return SIGNAL_ERR_WEBSOCKET;
    }
    return SIGNAL_ERR_NONE;
}

signal_err_t signal_close(signal_handle_t handle)
{
    if (handle == NULL) {
        return SIGNAL_ERR_INVALID_ARG;
    }
    signal_t *sg = (signal_t *)handle;

    esp_timer_stop(sg->ping_timer);
    if (esp_websocket_client_is_connected(sg->ws) &&
        esp_websocket_client_close(sg->ws, pdMS_TO_TICKS(SIGNAL_WS_CLOSE_TIMEOUT_MS)) != ESP_OK) {
        ESP_LOGE(TAG, "Failed to close WebSocket");
        return SIGNAL_ERR_WEBSOCKET;
    }
    return SIGNAL_ERR_NONE;
}

signal_err_t signal_send_leave(signal_handle_t handle)
{
    if (handle == NULL) {
        return SIGNAL_ERR_INVALID_ARG;
    }
    signal_t *sg = (signal_t *)handle;
    livekit_pb_signal_request_t req = LIVEKIT_PB_SIGNAL_REQUEST_INIT_ZERO;
    req.which_message = LIVEKIT_PB_SIGNAL_REQUEST_LEAVE_TAG;

    livekit_pb_leave_request_t leave = {
        .reason = LIVEKIT_PB_DISCONNECT_REASON_CLIENT_INITIATED,
        .action = LIVEKIT_PB_LEAVE_REQUEST_ACTION_DISCONNECT
    };
    req.message.leave = leave;
    return send_request(sg, &req);
}

signal_err_t signal_send_answer(signal_handle_t handle, const char *sdp)
{
    if (sdp == NULL || handle == NULL) {
        return SIGNAL_ERR_INVALID_ARG;
    }
    signal_t *sg = (signal_t *)handle;
    livekit_pb_signal_request_t req = LIVEKIT_PB_SIGNAL_REQUEST_INIT_ZERO;

    livekit_pb_session_description_t desc = {
        .type = "answer",
        .sdp = (char *)sdp
    };
    req.which_message = LIVEKIT_PB_SIGNAL_REQUEST_ANSWER_TAG;
    req.message.answer = desc;
    return send_request(sg, &req);
}

signal_err_t signal_send_offer(signal_handle_t handle, const char *sdp)
{
    if (sdp == NULL || handle == NULL) {
        return SIGNAL_ERR_INVALID_ARG;
    }
    signal_t *sg = (signal_t *)handle;
    livekit_pb_signal_request_t req = LIVEKIT_PB_SIGNAL_REQUEST_INIT_ZERO;

    livekit_pb_session_description_t desc = {
        .type = "offer",
        .sdp = (char *)sdp
    };
    req.which_message = LIVEKIT_PB_SIGNAL_REQUEST_OFFER_TAG;
    req.message.offer = desc;
    return send_request(sg, &req);
}

signal_err_t signal_send_add_track(signal_handle_t handle, livekit_pb_add_track_request_t *add_track_req)
{
    if (handle == NULL || add_track_req == NULL) {
        return SIGNAL_ERR_INVALID_ARG;
    }
    signal_t *sg = (signal_t *)handle;
    livekit_pb_signal_request_t req = LIVEKIT_PB_SIGNAL_REQUEST_INIT_ZERO;
    req.which_message = LIVEKIT_PB_SIGNAL_REQUEST_ADD_TRACK_TAG;
    req.message.add_track = *add_track_req;
    return send_request(sg, &req);
}

signal_err_t signal_send_update_subscription(signal_handle_t handle, const char *sid, bool subscribe)
{
    if (sid == NULL || handle == NULL) {
        return SIGNAL_ERR_INVALID_ARG;
    }
    signal_t *sg = (signal_t *)handle;
    livekit_pb_signal_request_t req = LIVEKIT_PB_SIGNAL_REQUEST_INIT_ZERO;

    livekit_pb_update_subscription_t subscription = {
        .track_sids = (char*[]){(char*)sid},
        .track_sids_count = 1,
        .subscribe = subscribe
    };
    req.which_message = LIVEKIT_PB_SIGNAL_REQUEST_SUBSCRIPTION_TAG;
    req.message.subscription = subscription;
    return send_request(sg, &req);
}