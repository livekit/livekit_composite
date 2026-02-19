/*
 * Media/Camera Module for Edge Embedded Client
 *
 * Provides camera initialization and capture interface for LiveKit.
 */

#pragma once

#include "esp_capture.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize the media subsystem
 *
 * Initializes camera driver and video encoder for ESP32-P4.
 * Configures MIPI CSI camera interface.
 *
 * @return 0 on success, negative error code on failure
 */
int media_init(void);

/**
 * @brief Get the capture handle for LiveKit
 *
 * Returns the capturer handle to be used in LiveKit room options.
 * Must call media_init() first.
 *
 * @return Capture handle, or NULL if not initialized
 */
esp_capture_handle_t media_get_capturer(void);

#ifdef __cplusplus
}
#endif
