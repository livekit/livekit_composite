import * as base64 from 'base64-js';
import { NativeModules } from 'react-native';
const { WebRTCModule } = NativeModules;

export enum FrameCryptorState {
  FrameCryptorStateNew,
  FrameCryptorStateOk,
  FrameCryptorStateEncryptionFailed,
  FrameCryptorStateDecryptionFailed,
  FrameCryptorStateMissingKey,
  FrameCryptorStateKeyRatcheted,
  FrameCryptorStateInternalError,
}

export default class RTCKeyProvider {
    _id: string;

    constructor(keyProviderId: string) {
        this._id = keyProviderId;
    }

    async setSharedKey(key: string | Uint8Array, keyIndex = 0) {
        const params = {
            keyProviderId: this._id,
            keyIndex,
        };

        if (typeof key === 'string') {
            params['key'] = key;
            params['keyIsBase64'] = false;
        } else {
            params['key'] = base64.fromByteArray(key as Uint8Array);
            params['keyIsBase64'] = true;
        }

        return WebRTCModule.keyProviderSetSharedKey(params)
            .then(data => data['result']);
    }

    async ratchetSharedKey(keyIndex = 0): Promise<Uint8Array> {
        const params = {
            keyProviderId: this._id,
            keyIndex,
        };

        return WebRTCModule.keyProviderRatchetSharedKey(params)
            .then(data => base64.toByteArray(data['result']));
    }

    async exportSharedKey(keyIndex = 0): Promise<Uint8Array> {
        const params = {
            keyProviderId: this._id,
            keyIndex,
        };

        return WebRTCModule.keyProviderExportSharedKey(params)
            .then(data => base64.toByteArray(data['result']));
    }

    async setKey(participantId: string, key: string | Uint8Array, keyIndex = 0): Promise<boolean> {
        const params = {
            keyProviderId: this._id,
            participantId,
            keyIndex,
        };

        if (typeof key === 'string') {
            params['key'] = key;
            params['keyIsBase64'] = false;
        } else {
            params['key'] = base64.fromByteArray(key as Uint8Array);
            params['keyIsBase64'] = true;
        }

        return WebRTCModule.keyProviderSetKey(params)
            .then(data => data['result']);
    }

    async ratchetKey(participantId: string, keyIndex = 0): Promise<Uint8Array> {
        const params = {
            keyProviderId: this._id,
            participantId,
            keyIndex,
        };

        return WebRTCModule.keyProviderRatchetKey(params)
            .then(data => base64.toByteArray(data['result']));
    }

    async exportKey(participantId: string, keyIndex = 0): Promise<Uint8Array> {
        const params = {
            keyProviderId: this._id,
            participantId,
            keyIndex,
        };

        return WebRTCModule.keyProviderExportKey(params)
            .then(data => base64.toByteArray(data['result']));
    }

    async setSifTrailer(trailer: Uint8Array) {
        const params = {
            keyProviderId: this._id,
            'sifTrailer': base64.fromByteArray(trailer),
        };

        return WebRTCModule.keyProviderSetSifTrailer(params);
    }

    async dispose() {
        const params = {
            keyProviderId: this._id,
        };

        return WebRTCModule.keyProviderDispose(params);
    }
}
