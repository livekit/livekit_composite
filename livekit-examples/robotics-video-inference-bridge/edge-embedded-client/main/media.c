#include "codec_board.h"
#include "codec_init.h"
#include "esp_capture_defaults.h"
#include "esp_capture_sink.h"
#include "esp_check.h"
#include "esp_log.h"
#include "esp_video_dec_default.h"
#include "esp_video_device.h"
#include "esp_video_enc_default.h"
#include "esp_video_init.h"

#include "media.h"

static const char *TAG = "media";

#define NULL_CHECK(pointer, message) ESP_RETURN_ON_FALSE(pointer != NULL, -1, TAG, message)

typedef struct {
    esp_capture_sink_handle_t capturer_handle;
    esp_capture_video_src_if_t *video_source;
} capture_system_t;

static capture_system_t capturer_system = {0};

/**
 * @brief Create camera source for ESP32-P4 MIPI CSI interface
 */
static esp_capture_video_src_if_t *create_camera_source(void) {
    camera_cfg_t cam_pin_cfg = {};
    int ret = get_camera_cfg(&cam_pin_cfg);
    if (ret != 0) {
        ESP_LOGE(TAG, "Failed to get camera config");
        return NULL;
    }

#if CONFIG_IDF_TARGET_ESP32P4
    esp_video_init_csi_config_t csi_config = {0};
    esp_video_init_dvp_config_t dvp_config = {0};
    esp_video_init_config_t cam_config = {0};

    if (cam_pin_cfg.type == CAMERA_TYPE_MIPI) {
        // MIPI CSI camera (typical for ESP32-P4-NANO)
        csi_config.sccb_config.i2c_handle = get_i2c_bus_handle(0);
        csi_config.sccb_config.freq = 100000;
        csi_config.reset_pin = cam_pin_cfg.reset;
        csi_config.pwdn_pin = cam_pin_cfg.pwr;
        ESP_LOGI(TAG, "Using MIPI CSI camera, i2c handle=%p", csi_config.sccb_config.i2c_handle);
        cam_config.csi = &csi_config;
    } else if (cam_pin_cfg.type == CAMERA_TYPE_DVP) {
        // DVP camera (parallel interface)
        dvp_config.reset_pin = cam_pin_cfg.reset;
        dvp_config.pwdn_pin = cam_pin_cfg.pwr;
        dvp_config.dvp_pin.data_width = CAM_CTLR_DATA_WIDTH_8;
        dvp_config.dvp_pin.data_io[0] = cam_pin_cfg.data[0];
        dvp_config.dvp_pin.data_io[1] = cam_pin_cfg.data[1];
        dvp_config.dvp_pin.data_io[2] = cam_pin_cfg.data[2];
        dvp_config.dvp_pin.data_io[3] = cam_pin_cfg.data[3];
        dvp_config.dvp_pin.data_io[4] = cam_pin_cfg.data[4];
        dvp_config.dvp_pin.data_io[5] = cam_pin_cfg.data[5];
        dvp_config.dvp_pin.data_io[6] = cam_pin_cfg.data[6];
        dvp_config.dvp_pin.data_io[7] = cam_pin_cfg.data[7];
        dvp_config.dvp_pin.vsync_io = cam_pin_cfg.vsync;
        dvp_config.dvp_pin.pclk_io = cam_pin_cfg.pclk;
        dvp_config.dvp_pin.xclk_io = cam_pin_cfg.xclk;
        dvp_config.dvp_pin.de_io = cam_pin_cfg.de;
        dvp_config.xclk_freq = 20000000;
        ESP_LOGI(TAG, "Using DVP camera");
        cam_config.dvp = &dvp_config;
    } else {
        ESP_LOGE(TAG, "Unknown camera type: %d", cam_pin_cfg.type);
        return NULL;
    }

    ret = esp_video_init(&cam_config);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Camera init failed: 0x%x", ret);
        return NULL;
    }

    // Create V4L2 video source
    esp_capture_video_v4l2_src_cfg_t v4l2_cfg = {
        .dev_name = "/dev/video0",
        .buf_count = 2,
    };
    return esp_capture_new_video_v4l2_src(&v4l2_cfg);

#else
    // Non-P4 targets (ESP32-S3, etc.) with DVP only
    if (cam_pin_cfg.type == CAMERA_TYPE_DVP) {
        esp_capture_video_dvp_src_cfg_t dvp_config = {0};
        dvp_config.buf_count = 2;
        dvp_config.reset_pin = cam_pin_cfg.reset;
        dvp_config.pwr_pin = cam_pin_cfg.pwr;
        dvp_config.data[0] = cam_pin_cfg.data[0];
        dvp_config.data[1] = cam_pin_cfg.data[1];
        dvp_config.data[2] = cam_pin_cfg.data[2];
        dvp_config.data[3] = cam_pin_cfg.data[3];
        dvp_config.data[4] = cam_pin_cfg.data[4];
        dvp_config.data[5] = cam_pin_cfg.data[5];
        dvp_config.data[6] = cam_pin_cfg.data[6];
        dvp_config.data[7] = cam_pin_cfg.data[7];
        dvp_config.vsync_pin = cam_pin_cfg.vsync;
        dvp_config.href_pin = cam_pin_cfg.href;
        dvp_config.pclk_pin = cam_pin_cfg.pclk;
        dvp_config.xclk_pin = cam_pin_cfg.xclk;
        dvp_config.xclk_freq = 20000000;
        return esp_capture_new_video_dvp_src(&dvp_config);
    }
    ESP_LOGE(TAG, "No supported camera interface");
    return NULL;
#endif
}

/**
 * @brief Build the video capture system (video only, no audio)
 */
static int build_capturer_system(void) {
    // Create camera source
    capturer_system.video_source = create_camera_source();
    NULL_CHECK(capturer_system.video_source, "Failed to create camera source");

    // Create video-only capture pipeline
    esp_capture_cfg_t cfg = {.sync_mode = ESP_CAPTURE_SYNC_MODE_NONE, // No audio sync needed
                             .audio_src = NULL,                       // Video only
                             .video_src = capturer_system.video_source};

    esp_err_t ret = esp_capture_open(&cfg, &capturer_system.capturer_handle);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to open capture system: %d", ret);
        return -1;
    }

    NULL_CHECK(capturer_system.capturer_handle, "Capture handle is NULL");
    ESP_LOGI(TAG, "Video capture system initialized");
    return 0;
}

int media_init(void) {
    ESP_LOGI(TAG, "Initializing media subsystem");

    // Register video encoder (H.264 hardware encoder on ESP32-P4)
    esp_video_enc_register_default();

    // Build capture system
    int ret = build_capturer_system();
    if (ret != 0) {
        ESP_LOGE(TAG, "Failed to build capture system");
        return ret;
    }

    ESP_LOGI(TAG, "Media subsystem ready");
    return 0;
}

esp_capture_handle_t media_get_capturer(void) { return capturer_system.capturer_handle; }
