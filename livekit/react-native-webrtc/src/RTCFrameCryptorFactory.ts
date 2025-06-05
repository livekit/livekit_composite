import * as base64 from 'base64-js';
import { NativeModules } from 'react-native';

import RTCFrameCryptor from './RTCFrameCryptor';
import RTCKeyProvider from './RTCKeyProvider';
import RTCRtpReceiver from './RTCRtpReceiver';
import RTCRtpSender from './RTCRtpSender';
const { WebRTCModule } = NativeModules;

export enum RTCFrameCryptorAlgorithm {
  kAesGcm = 0,
  // kAesCbc = 1,
}

export type RTCKeyProviderOptions = {
  sharedKey: boolean,
  ratchetSalt: string | Uint8Array,
  ratchetWindowSize: number,
  uncryptedMagicBytes?: Uint8Array,
  failureTolerance?: number,
  keyRingSize?: number,
  discardFrameWhenCryptorNotReady?: boolean
}

export default class RTCFrameCryptorFactory {
    static createFrameCryptorForRtpSender(
        participantId: string,
        sender: RTCRtpSender,
        algorithm: RTCFrameCryptorAlgorithm,
        keyProvider: RTCKeyProvider
    ): RTCFrameCryptor {
        const params = {
            'peerConnectionId': sender._peerConnectionId,
            'rtpSenderId': sender._id,
            participantId,
            'keyProviderId': keyProvider._id,
            'type': 'sender',
            'algorithm': algorithm
        };
        const result = WebRTCModule.frameCryptorFactoryCreateFrameCryptor(params);

        if (!result) {
            throw new Error('Error when creating frame cryptor for sender');
        }

        return new RTCFrameCryptor(result, participantId);
    }
    static createFrameCryptorForRtpReceiver(
        participantId: string,
        receiver: RTCRtpReceiver,
        algorithm: RTCFrameCryptorAlgorithm,
        keyProvider: RTCKeyProvider
    ): RTCFrameCryptor {
        const params = {
            'peerConnectionId': receiver._peerConnectionId,
            'rtpReceiverId': receiver._id,
            participantId,
            'keyProviderId': keyProvider._id,
            'type': 'receiver',
            'algorithm': algorithm
        };
        const result = WebRTCModule.frameCryptorFactoryCreateFrameCryptor(params);

        if (!result) {
            throw new Error('Error when creating frame cryptor for receiver');
        }

        return new RTCFrameCryptor(result, participantId);
    }

    static createDefaultKeyProvider(options: RTCKeyProviderOptions): RTCKeyProvider {
        const params = {
            'sharedKey': options.sharedKey,
            'ratchetWindowSize': options.ratchetWindowSize,
            'failureTolerance': options.failureTolerance ?? -1,
            'keyRingSize': options.keyRingSize ?? 16,
            'discardFrameWhenCryptorNotReady': options.discardFrameWhenCryptorNotReady ?? false
        };

        if (typeof options.ratchetSalt === 'string') {
            params['ratchetSalt'] = options.ratchetSalt;
            params['ratchetSaltIsBase64'] = false;
        } else {
            const bytes = options.ratchetSalt as Uint8Array;

            params['ratchetSalt'] = base64.fromByteArray(bytes);
            params['ratchetSaltIsBase64'] = true;
        }

        if (options.uncryptedMagicBytes) {
            params['uncryptedMagicBytes'] = base64.fromByteArray(options.uncryptedMagicBytes);
        }

        const result = WebRTCModule.frameCryptorFactoryCreateKeyProvider(params);

        if (!result) {
            throw new Error('Error when creating key provider!');
        }

        return new RTCKeyProvider(result);
    }
}