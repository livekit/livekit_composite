#include <stdio.h>
#include "esp_log.h"
#include "codec_init.h"
#include "codec_board.h"
#include "esp_codec_dev.h"
#include "sdkconfig.h"
#include "settings.h"

static const char *TAG = "Board";

void init_board(void)
{
    ESP_LOGI(TAG, "Init board.");
    set_codec_board_type(TEST_BOARD_NAME);
    // Notes when use playback and record at same time, must set reuse_dev = false
    codec_init_cfg_t cfg = {
#if CONFIG_IDF_TARGET_ESP32S3
        .in_mode = CODEC_I2S_MODE_TDM,
        .in_use_tdm = true,
#endif
        .reuse_dev = false
    };
    init_codec(&cfg);
}
