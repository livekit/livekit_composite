import { NativeModules } from 'react-native';

import RTCDataPacketCryptor from './RTCDataPacketCryptor';
import RTCFrameCryptorAlgorithm from './RTCFrameCryptorFactory';
import RTCKeyProvider from './RTCKeyProvider';
const { WebRTCModule } = NativeModules;

export default class RTCDataPacketCryptorFactory {
    static async createDataPacketCryptor(
        algorithm: RTCFrameCryptorAlgorithm,
        keyProvider: RTCKeyProvider
    ): Promise<RTCDataPacketCryptor> {
        const params = {
            'algorithm': algorithm,
            'keyProviderId': keyProvider._id
        };
        const result = await WebRTCModule.dataPacketCryptorFactoryCreateDataPacketCryptor(params);

        if (!result) {
            throw new Error('Error when creating data packet cryptor for sender');
        }

        return new RTCDataPacketCryptor(result.dataPacketCryptorId);
    }
}