import * as base64 from 'base64-js';
import { NativeModules } from 'react-native';

import Logger from './Logger';
const { WebRTCModule } = NativeModules;
const log = new Logger('pc');

export interface RTCEncryptedPacket {
  payload: Uint8Array,
  iv: Uint8Array,
  keyIndex: number,
}

export default class RTCDataPacketCryptor {
    _id: string;

    constructor(dataPacketCryptorId: string) {
        this._id = dataPacketCryptorId;
    }

    async encrypt(participantId: string, keyIndex: number, data: Uint8Array): Promise<RTCEncryptedPacket | null> {
        const params = {
            dataPacketCryptorId: this._id,
            participantId,
            keyIndex,
            data: base64.fromByteArray(data)
        };

        const result = await WebRTCModule.dataPacketCryptorEncrypt(params);

        if (!result) {
            log.info('encrypt: result null');

            return null;
        }

        if (result.payload === undefined) {
            log.info('encrypt: payload null');

            return null;
        }

        if (result.iv === undefined) {
            log.info('encrypt: iv null');

            return null;
        }

        if (result.keyIndex === undefined) {
            log.info('encrypt: keyIndex null');

            return null;
        }

        return {
            payload: base64.toByteArray(result.payload),
            iv: base64.toByteArray(result.iv),
            keyIndex: result.keyIndex
        };
    }

    async decrypt(participantId: string, packet: RTCEncryptedPacket): Promise<Uint8Array | null> {
        const params = {
            dataPacketCryptorId: this._id,
            participantId,
            payload: base64.fromByteArray(packet.payload),
            iv: base64.fromByteArray(packet.iv),
            keyIndex: packet.keyIndex,
        };

        const result = await WebRTCModule.dataPacketCryptorDecrypt(params);

        if (!result) {
            log.info('decrypt: result null');

            return null;
        }

        return base64.toByteArray(result.data);
    }


    async dispose() {
        const params = {
            dataPacketCryptorId: this._id,
        };

        await WebRTCModule.dataPacketCryptorDispose(params);
    }
}
