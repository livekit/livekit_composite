
#pragma once

#include "common.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void *signal_handle_t;

typedef enum {
    SIGNAL_ERR_NONE        =  0,
    SIGNAL_ERR_INVALID_ARG = -1,
    SIGNAL_ERR_NO_MEM      = -2,
    SIGNAL_ERR_WEBSOCKET   = -3,
    SIGNAL_ERR_INVALID_URL = -4,
    SIGNAL_ERR_MESSAGE     = -5,
    SIGNAL_ERR_OTHER       = -6,
    // TODO: Add more error cases as needed
} signal_err_t;

typedef struct {
    void* ctx;
    void (*on_state_changed)(connection_state_t state, void *ctx);
    void (*on_join)(livekit_pb_join_response_t *join_res, void *ctx);
    void (*on_leave)(livekit_pb_disconnect_reason_t reason, livekit_pb_leave_request_action_t action, void *ctx);
    void (*on_room_update)(const livekit_pb_room_t* info, void *ctx);
    void (*on_participant_update)(const livekit_pb_participant_info_t* info, void *ctx);
    void (*on_answer)(const char *sdp, void *ctx);
    void (*on_offer)(const char *sdp, void *ctx);
    void (*on_trickle)(const char *ice_candidate, livekit_pb_signal_target_t target, void *ctx);
} signal_options_t;

signal_err_t signal_create(signal_handle_t *handle, signal_options_t *options);
signal_err_t signal_destroy(signal_handle_t handle);

/// Establishes the WebSocket connection
/// @note This function will close the existing connection if already connected.
signal_err_t signal_connect(signal_handle_t handle, const char* server_url, const char* token);

/// Closes the WebSocket connection
signal_err_t signal_close(signal_handle_t handle);

signal_err_t signal_send_leave(signal_handle_t handle);
signal_err_t signal_send_offer(signal_handle_t handle, const char *sdp);
signal_err_t signal_send_answer(signal_handle_t handle, const char *sdp);

signal_err_t signal_send_add_track(signal_handle_t handle, livekit_pb_add_track_request_t *req);
signal_err_t signal_send_update_subscription(signal_handle_t handle, const char *sid, bool subscribe);

#ifdef __cplusplus
}
#endif