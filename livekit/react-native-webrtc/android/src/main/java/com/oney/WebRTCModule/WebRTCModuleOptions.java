package com.oney.WebRTCModule;

import org.webrtc.AudioProcessingFactory;
import org.webrtc.Loggable;
import org.webrtc.Logging;
import org.webrtc.VideoDecoderFactory;
import org.webrtc.VideoEncoderFactory;
import org.webrtc.audio.AudioDeviceModule;

import java.util.concurrent.Callable;

public class WebRTCModuleOptions {
    private static WebRTCModuleOptions instance;

    public VideoEncoderFactory videoEncoderFactory;
    public VideoDecoderFactory videoDecoderFactory;
    public AudioDeviceModule audioDeviceModule;
    public Callable<AudioProcessingFactory> audioProcessingFactoryFactory;

    public Loggable injectableLogger;
    public Logging.Severity loggingSeverity;
    public String fieldTrials;
    public boolean enableMediaProjectionService;

    public static WebRTCModuleOptions getInstance() {
        if (instance == null) {
            instance = new WebRTCModuleOptions();
        }

        return instance;
    }
}
