package com.oney.WebRTCModule;

import android.util.Base64;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

import org.webrtc.FrameCryptor;
import org.webrtc.FrameCryptorAlgorithm;
import org.webrtc.FrameCryptorFactory;
import org.webrtc.FrameCryptorKeyProvider;
import org.webrtc.RtpReceiver;
import org.webrtc.RtpSender;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

public class RTCFrameCryptor {

    private static final String TAG = "RTCFrameCryptor";
    private final Map<String, FrameCryptor> frameCryptos = new HashMap<>();
    private final Map<String, FrameCryptorStateObserver> frameCryptoObservers = new HashMap<>();
    private final Map<String, FrameCryptorKeyProvider> keyProviders = new HashMap<>();
    private final WebRTCModule webRTCModule;

    public RTCFrameCryptor(WebRTCModule webRTCModule) {
        this.webRTCModule = webRTCModule;
    }

    private void sendEvent(String eventName, WritableMap params) {
        webRTCModule.sendEvent(eventName, params);
    }

    class FrameCryptorStateObserver implements FrameCryptor.Observer {
        public FrameCryptorStateObserver(String frameCryptorId) {
            this.frameCryptorId = frameCryptorId;
        }

        private final String frameCryptorId;

        private String frameCryptorErrorStateToString(FrameCryptor.FrameCryptionState state) {
            switch (state) {
                case NEW:
                    return "new";
                case OK:
                    return "ok";
                case DECRYPTIONFAILED:
                    return "decryptionFailed";
                case ENCRYPTIONFAILED:
                    return "encryptionFailed";
                case INTERNALERROR:
                    return "internalError";
                case KEYRATCHETED:
                    return "keyRatcheted";
                case MISSINGKEY:
                    return "missingKey";
                default:
                    throw new IllegalArgumentException("Unknown FrameCryptorErrorState: " + state);
            }
        }

        @Override
        public void onFrameCryptionStateChanged(String participantId, FrameCryptor.FrameCryptionState state) {
            WritableMap event = Arguments.createMap();
            event.putString("event", "frameCryptionStateChanged");
            event.putString("participantId", participantId);
            event.putString("state", frameCryptorErrorStateToString(state));
            event.putString("frameCryptorId", frameCryptorId);
            sendEvent("frameCryptionStateChanged", event);
        }
    }
//

    private FrameCryptorAlgorithm frameCryptorAlgorithmFromInt(int algorithm) {
        switch (algorithm) {
            case 0:
                return FrameCryptorAlgorithm.AES_GCM;
            case 1:
                return FrameCryptorAlgorithm.AES_CBC;
            default:
                return FrameCryptorAlgorithm.AES_GCM;
        }
    }

    public String frameCryptorFactoryCreateFrameCryptor(ReadableMap params) {
        String keyProviderId = params.getString("keyProviderId");
        FrameCryptorKeyProvider keyProvider = keyProviders.get(keyProviderId);
        if (keyProvider == null) {
            Log.w(TAG, "frameCryptorFactoryCreateFrameCryptorFailed: keyProvider not found");
            return null;
        }
        int peerConnectionId = params.getInt("peerConnectionId");
        PeerConnectionObserver pco = webRTCModule.getPeerConnectionObserver(peerConnectionId);
        if (pco == null) {
            Log.w(TAG, "frameCryptorFactoryCreateFrameCryptorFailed: peerConnection not found");
            return null;
        }
        String participantId = params.getString("participantId");
        String type = params.getString("type");
        int algorithm = params.getInt("algorithm");
        String rtpSenderId = params.getString("rtpSenderId");
        String rtpReceiverId = params.getString("rtpReceiverId");

        if (type == null || !(type.equals("sender") || type.equals("receiver"))){
            Log.w(TAG, "frameCryptorFactoryCreateFrameCryptorFailed: type must be sender or receiver");
            return null;
        } else if (type.equals("sender")) {
            RtpSender rtpSender = pco.getSender(rtpSenderId);

            FrameCryptor frameCryptor = FrameCryptorFactory.createFrameCryptorForRtpSender(webRTCModule.mFactory,
                    rtpSender,
                    participantId,
                    frameCryptorAlgorithmFromInt(algorithm),
                    keyProvider);
            String frameCryptorId = UUID.randomUUID().toString();
            frameCryptos.put(frameCryptorId, frameCryptor);
            FrameCryptorStateObserver observer = new FrameCryptorStateObserver(frameCryptorId);
            frameCryptor.setObserver(observer);
            frameCryptoObservers.put(frameCryptorId, observer);

            return frameCryptorId;
        } else {
            RtpReceiver rtpReceiver = pco.getReceiver(rtpReceiverId);

            FrameCryptor frameCryptor = FrameCryptorFactory.createFrameCryptorForRtpReceiver(webRTCModule.mFactory,
                    rtpReceiver,
                    participantId,
                    frameCryptorAlgorithmFromInt(algorithm),
                    keyProvider);
            String frameCryptorId = UUID.randomUUID().toString();
            frameCryptos.put(frameCryptorId, frameCryptor);
            FrameCryptorStateObserver observer = new FrameCryptorStateObserver(frameCryptorId);
            frameCryptor.setObserver(observer);
            frameCryptoObservers.put(frameCryptorId, observer);

            return frameCryptorId;
        }
    }

    public void frameCryptorSetKeyIndex(ReadableMap params, @NonNull Promise result) {
        String frameCryptorId = params.getString("frameCryptorId");
        FrameCryptor frameCryptor = frameCryptos.get(frameCryptorId);
        if (frameCryptor == null) {
            result.reject("frameCryptorSetKeyIndexFailed", "frameCryptor not found", (Throwable) null);
            return;
        }
        int keyIndex = params.getInt("keyIndex");
        frameCryptor.setKeyIndex(keyIndex);
        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putBoolean("result", true);
        result.resolve(paramsResult);
    }

    public void frameCryptorGetKeyIndex(ReadableMap params, @NonNull Promise result) {
        String frameCryptorId = params.getString("frameCryptorId");
        FrameCryptor frameCryptor = frameCryptos.get(frameCryptorId);
        if (frameCryptor == null) {
            result.reject("frameCryptorGetKeyIndexFailed", "frameCryptor not found", (Throwable) null);
            return;
        }
        int keyIndex = frameCryptor.getKeyIndex();
        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putInt("keyIndex", keyIndex);
        result.resolve(paramsResult);
    }

    public void frameCryptorSetEnabled(ReadableMap params, @NonNull Promise result) {
        String frameCryptorId = params.getString("frameCryptorId");
        FrameCryptor frameCryptor = frameCryptos.get(frameCryptorId);
        if (frameCryptor == null) {
            result.reject("frameCryptorSetEnabledFailed", "frameCryptor not found", (Throwable) null);
            return;
        }
        boolean enabled = params.getBoolean("enabled");
        frameCryptor.setEnabled(enabled);

        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putBoolean("result", enabled);
        result.resolve(paramsResult);
    }

    public void frameCryptorGetEnabled(ReadableMap params, @NonNull Promise result) {
        String frameCryptorId = params.getString("frameCryptorId");
        FrameCryptor frameCryptor = frameCryptos.get(frameCryptorId);
        if (frameCryptor == null) {
            result.reject("frameCryptorGetEnabledFailed", "frameCryptor not found", (Throwable) null);
            return;
        }
        boolean enabled = frameCryptor.isEnabled();
        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putBoolean("enabled", enabled);
        result.resolve(paramsResult);
    }

    public void frameCryptorDispose(ReadableMap params, @NonNull Promise result) {
        String frameCryptorId = params.getString("frameCryptorId");
        FrameCryptor frameCryptor = frameCryptos.get(frameCryptorId);
        if (frameCryptor == null) {
            result.reject("frameCryptorDisposeFailed", "frameCryptor not found", (Throwable) null);
            return;
        }
        frameCryptor.dispose();
        frameCryptos.remove(frameCryptorId);
        frameCryptoObservers.remove(frameCryptorId);
        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putString("result", "success");
        result.resolve(paramsResult);
    }

    @Nullable
    public String frameCryptorFactoryCreateKeyProvider(ReadableMap keyProviderOptions) {
        String keyProviderId = UUID.randomUUID().toString();

        if (keyProviderOptions == null) {
            Log.w(TAG, "frameCryptorFactoryCreateKeyProvider: keyProviderOptions is null!");
            return null;
        }
        boolean sharedKey = keyProviderOptions.getBoolean("sharedKey");
        int ratchetWindowSize = keyProviderOptions.getInt("ratchetWindowSize");
        int failureTolerance = keyProviderOptions.getInt("failureTolerance");

        byte[] ratchetSalt = getBytesFromMap(keyProviderOptions, "ratchetSalt", "ratchetSaltIsBase64");

        byte[] uncryptedMagicBytes = new byte[0];
        if (keyProviderOptions.hasKey("uncryptedMagicBytes")) {
            uncryptedMagicBytes = Base64.decode(keyProviderOptions.getString("uncryptedMagicBytes"), Base64.DEFAULT);
        }
        int keyRingSize = (int) keyProviderOptions.getInt("keyRingSize");
        boolean discardFrameWhenCryptorNotReady = (boolean) keyProviderOptions.getBoolean("discardFrameWhenCryptorNotReady");
        FrameCryptorKeyProvider keyProvider = FrameCryptorFactory.createFrameCryptorKeyProvider(sharedKey, ratchetSalt, ratchetWindowSize,
                uncryptedMagicBytes, failureTolerance, keyRingSize, discardFrameWhenCryptorNotReady);
        keyProviders.put(keyProviderId, keyProvider);
        return keyProviderId;
    }

    public void keyProviderSetSharedKey(ReadableMap params, @NonNull Promise result) {
        String keyProviderId = params.getString("keyProviderId");
        FrameCryptorKeyProvider keyProvider = keyProviders.get(keyProviderId);
        if (keyProvider == null) {
            result.reject("keyProviderSetKeySharedFailed", "keyProvider not found", (Throwable) null);
            return;
        }
        int keyIndex = params.getInt("keyIndex");
        byte[] key = getBytesFromMap(params, "key", "keyIsBase64");
        keyProvider.setSharedKey(keyIndex, key);

        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putBoolean("result", true);
        result.resolve(paramsResult);
    }

    public void keyProviderRatchetSharedKey(ReadableMap params, @NonNull Promise result) {
        String keyProviderId = params.getString("keyProviderId");
        FrameCryptorKeyProvider keyProvider = keyProviders.get(keyProviderId);
        if (keyProvider == null) {
            result.reject("keyProviderRatchetSharedKeyFailed", "keyProvider not found", (Throwable) null);
            return;
        }
        int keyIndex = params.getInt("keyIndex");

        byte[] newKey = keyProvider.ratchetSharedKey(keyIndex);

        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putString("result", Base64.encodeToString(newKey, Base64.DEFAULT));
        result.resolve(paramsResult);
    }

    public void keyProviderExportSharedKey(ReadableMap params, @NonNull Promise result) {
        String keyProviderId = params.getString("keyProviderId");
        FrameCryptorKeyProvider keyProvider = keyProviders.get(keyProviderId);
        if (keyProvider == null) {
            result.reject("keyProviderExportSharedKeyFailed", "keyProvider not found", (Throwable) null);
            return;
        }
        int keyIndex = params.getInt("keyIndex");

        byte[] key = keyProvider.exportSharedKey(keyIndex);

        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putString("result", Base64.encodeToString(key, Base64.DEFAULT));
        result.resolve(paramsResult);
    }

    public void keyProviderSetKey(ReadableMap params, @NonNull Promise result) {
        String keyProviderId = params.getString("keyProviderId");
        FrameCryptorKeyProvider keyProvider = keyProviders.get(keyProviderId);
        if (keyProvider == null) {
            result.reject("keyProviderSetKeyFailed", "keyProvider not found", (Throwable) null);
            return;
        }
        int keyIndex = params.getInt("keyIndex");
        String participantId = params.getString("participantId");
        byte[] key = getBytesFromMap(params, "key", "keyIsBase64");
        keyProvider.setKey(participantId, keyIndex, key);

        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putBoolean("result", true);
        result.resolve(paramsResult);
    }

    public void keyProviderRatchetKey(ReadableMap params, @NonNull Promise result) {
        String keyProviderId = params.getString("keyProviderId");
        FrameCryptorKeyProvider keyProvider = keyProviders.get(keyProviderId);
        if (keyProvider == null) {
            result.reject("keyProviderSetKeysFailed", "keyProvider not found", (Throwable) null);
            return;
        }
        String participantId = params.getString("participantId");
        int keyIndex = params.getInt("keyIndex");

        byte[] newKey = keyProvider.ratchetKey(participantId, keyIndex);

        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putString("result", Base64.encodeToString(newKey, Base64.DEFAULT));
        result.resolve(paramsResult);
    }

    public void keyProviderExportKey(ReadableMap params, @NonNull Promise result) {
        String keyProviderId = params.getString("keyProviderId");
        FrameCryptorKeyProvider keyProvider = keyProviders.get(keyProviderId);
        if (keyProvider == null) {
            result.reject("keyProviderExportKeyFailed", "keyProvider not found", (Throwable) null);
            return;
        }
        String participantId = params.getString("participantId");
        int keyIndex = params.getInt("keyIndex");

        byte[] key = keyProvider.exportKey(participantId, keyIndex);

        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putString("result", Base64.encodeToString(key, Base64.DEFAULT));
        result.resolve(paramsResult);
    }

    public void keyProviderSetSifTrailer(ReadableMap params, @NonNull Promise result) {
        String keyProviderId = params.getString("keyProviderId");
        FrameCryptorKeyProvider keyProvider = keyProviders.get(keyProviderId);
        if (keyProvider == null) {
            result.reject("keyProviderSetSifTrailerFailed", "keyProvider not found", (Throwable) null);
            return;
        }
        byte[] sifTrailer = Base64.decode(params.getString("sifTrailer"), Base64.DEFAULT);
        keyProvider.setSifTrailer(sifTrailer);

        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putBoolean("result", true);
        result.resolve(paramsResult);
    }

    public void keyProviderDispose(ReadableMap params, @NonNull Promise result) {
        String keyProviderId = params.getString("keyProviderId");
        FrameCryptorKeyProvider keyProvider = keyProviders.get(keyProviderId);
        if (keyProvider == null) {
            result.reject("keyProviderDisposeFailed", "keyProvider not found", (Throwable) null);
            return;
        }
        keyProvider.dispose();
        keyProviders.remove(keyProviderId);
        WritableMap paramsResult = Arguments.createMap();
        paramsResult.putString("result", "success");
        result.resolve(paramsResult);
    }

    private byte[] getBytesFromMap(ReadableMap map, String key, String isBase64Key) {
        boolean isBase64 = map.getBoolean(isBase64Key);
        byte[] bytes;

        if (isBase64) {
            bytes = Base64.decode(map.getString(key), Base64.DEFAULT);
        } else {
            bytes = Objects.requireNonNull(map.getString(key)).getBytes(StandardCharsets.UTF_8);
        }
        return bytes;
    }
}
