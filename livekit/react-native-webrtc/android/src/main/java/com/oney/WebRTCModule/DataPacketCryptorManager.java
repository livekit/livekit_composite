package com.oney.WebRTCModule;

import android.util.Log;

import org.webrtc.DataPacketCryptor;
import org.webrtc.DataPacketCryptorFactory;
import org.webrtc.FrameCryptorAlgorithm;
import org.webrtc.FrameCryptorKeyProvider;

import javax.annotation.Nullable;

public class DataPacketCryptorManager {
    private static final String TAG = DataPacketCryptorManager.class.getSimpleName();
    private final DataPacketCryptor dataPacketCryptor;
    private boolean isDisposed = false;

    public DataPacketCryptorManager(FrameCryptorAlgorithm algorithm, FrameCryptorKeyProvider keyProvider) {
        dataPacketCryptor =
                DataPacketCryptorFactory.createDataPacketCryptor(FrameCryptorAlgorithm.AES_GCM, keyProvider);
    }

    @Nullable
    public synchronized DataPacketCryptor.EncryptedPacket encrypt(String participantId, int keyIndex, byte[] payload) {
        if (isDisposed) {
            return null;
        }

        DataPacketCryptor.EncryptedPacket packet = dataPacketCryptor.encrypt(participantId, keyIndex, payload);

        if (packet == null) {
            Log.i(TAG, "Error encrypting packet: null packet");
            return null;
        }

        if (packet.payload == null) {
            Log.i(TAG, "Error encrypting packet: null payload");
            return null;
        }
        if (packet.iv == null) {
            Log.i(TAG, "Error encrypting packet: null iv returned");
            return null;
        }

        return packet;
    }

    @Nullable
    public synchronized byte[] decrypt(String participantId, DataPacketCryptor.EncryptedPacket packet) {
        if (isDisposed) {
            return null;
        }

        return dataPacketCryptor.decrypt(participantId, packet);
    }

    public synchronized void dispose() {
        if (isDisposed) {
            return;
        }
        isDisposed = true;
        dataPacketCryptor.dispose();
    }
}