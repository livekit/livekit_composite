
#pragma once

#include "common.h"
#include "engine.h"
#include "protocol.h"

#define PEER_THREAD_NAME_PREFIX "lk_peer_"

#ifdef __cplusplus
extern "C" {
#endif

typedef void *peer_handle_t;

typedef enum {
    PEER_ERR_NONE           =  0,
    PEER_ERR_INVALID_ARG    = -1,
    PEER_ERR_NO_MEM         = -2,
    PEER_ERR_INVALID_STATE  = -3,
    PEER_ERR_RTC            = -4,
    PEER_ERR_MESSAGE        = -5
} peer_err_t;

/// Options for creating a peer.
typedef struct {
    /// Whether the peer is a publisher or subscriber.
    livekit_pb_signal_target_t target;

    /// ICE server list.
    esp_peer_ice_server_cfg_t* server_list;

    /// Number of servers in the list.
    int server_count;

    /// Weather to force the use of relay ICE candidates.
    bool force_relay;

    /// Whether the peer is the primary peer.
    /// @note This determines which peer controls the data channels.
    bool is_primary;

    /// Media options used for creating SDP messages.
    engine_media_options_t* media;

    /// Invoked when the peer's connection state changes.
    void (*on_state_changed)(connection_state_t state, void *ctx);

    /// Invoked when an SDP message is available. This can be either
    /// an offer or answer depending on target configuration.
    void (*on_sdp)(const char *sdp, void *ctx);

    /// Invoked when a new ICE candidate is available.
    void (*on_ice_candidate)(const char *candidate, void *ctx);

    /// Invoked when a data packet is received over the data channel.
    void (*on_packet_received)(livekit_pb_data_packet_t* packet, void *ctx);

    /// Invoked when information about an incoming audio stream is available.
    void (*on_audio_info)(esp_peer_audio_stream_info_t* info, void *ctx);

    /// Invoked when an audio frame is received.
    void (*on_audio_frame)(esp_peer_audio_frame_t* frame, void *ctx);

    /// Invoked when information about an incoming video stream is available.
    void (*on_video_info)(esp_peer_video_stream_info_t* info, void *ctx);

    /// Invoked when a video frame is received.
    void (*on_video_frame)(esp_peer_video_frame_t* frame, void *ctx);

    /// Context pointer passed to the handlers.
    void *ctx;
} peer_options_t;

peer_err_t peer_create(peer_handle_t *handle, peer_options_t *options);
peer_err_t peer_destroy(peer_handle_t handle);

peer_err_t peer_connect(peer_handle_t handle);
peer_err_t peer_disconnect(peer_handle_t handle);

/// Handles an SDP message from the remote peer.
peer_err_t peer_handle_sdp(peer_handle_t handle, const char *sdp);

/// Handles an ICE candidate from the remote peer.
peer_err_t peer_handle_ice_candidate(peer_handle_t handle, const char *candidate);

/// Sends a data packet to the remote peer.
peer_err_t peer_send_data_packet(peer_handle_t handle, const livekit_pb_data_packet_t* packet, livekit_pb_data_packet_kind_t kind);

/// Sends an audio frame to the remote peer.
/// @warning Only use on publisher peer.
peer_err_t peer_send_audio(peer_handle_t handle, esp_peer_audio_frame_t* frame);

/// Sends a video frame to the remote peer.
/// @warning Only use on publisher peer.
peer_err_t peer_send_video(peer_handle_t handle, esp_peer_video_frame_t* frame);

#ifdef __cplusplus
}
#endif