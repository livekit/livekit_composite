# Copyright © 2025 LiveKit, Inc. All rights reserved.
# Proprietary and confidential.

from typing import Optional
from .plugin import AICousticsAudioEnhancer, EnhancerModel, VadSettings, FRAME_USERDATA_AIC_VAD_ATTRIBUTE


def audio_enhancement(
    *,
    model: EnhancerModel = EnhancerModel.QUAIL_L,
    vad_settings: VadSettings = VadSettings(
        speech_hold_duration=None,
        sensitivity=None,
        minimum_speech_duration=None,
    ),
):
    """
    Implements a mechanism to apply [ai-coustics models](https://ai-coustics.com/) on audio data
    represented as `AudioFrame`s. In addition, each frame will be annotated with a
    FRAME_USERDATA_AIC_VAD_ATTRIBUTE `userdata` attribute containing the output of the aic vad model.
    """
    return AICousticsAudioEnhancer(model=model, vad_settings=vad_settings)


__all__ = [
    "audio_enhancement",
    "FRAME_USERDATA_AIC_VAD_ATTRIBUTE",
    "EnhancerModel",
    "VadSettings",
]
