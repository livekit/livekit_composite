import { Event, EventTarget, defineEventAttribute } from 'event-target-shim/index';
import { NativeModules } from 'react-native';

import { addListener, removeListener } from './EventEmitter';
import Logger from './Logger';
const { WebRTCModule } = NativeModules;

const log = new Logger('pc');

type FRAME_CRYPTOR_EVENTS =  'onframecryptorstatechanged';

interface IRTCDataChannelEventInitDict extends Event.EventInit {
    frameCryptor: RTCFrameCryptor;
    state: RTCFrameCryptorState;
}

/**
 * @eventClass
 * This event is fired whenever the RTCDataChannel has changed in any way.
 * @param {FRAME_CRYPTOR_EVENTS} type - The type of event.
 * @param {IRTCDataChannelEventInitDict} eventInitDict - The event init properties.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel#events MDN} for details.
 */
export class RTCFrameCryptorStateEvent<
TEventType extends FRAME_CRYPTOR_EVENTS
> extends Event<TEventType> {
    /** @eventProperty */
    frameCryptor: RTCFrameCryptor;
    /** @eventProperty */
    state: RTCFrameCryptorState;
    constructor(type: TEventType, eventInitDict: IRTCDataChannelEventInitDict) {
        super(type, eventInitDict);
        this.frameCryptor = eventInitDict.frameCryptor;
        this.state = eventInitDict.state;
    }
}

type RTCFrameCryptorEventMap = {
    onframecryptorstatechanged: RTCFrameCryptorStateEvent<'onframecryptorstatechanged'>;
}

export enum RTCFrameCryptorState {
    FrameCryptorStateNew,
    FrameCryptorStateOk,
    FrameCryptorStateEncryptionFailed,
    FrameCryptorStateDecryptionFailed,
    FrameCryptorStateMissingKey,
    FrameCryptorStateKeyRatcheted,
    FrameCryptorStateInternalError,
}

export default class RTCFrameCryptor extends EventTarget<RTCFrameCryptorEventMap> {
    private _frameCryptorId: string;
    private _participantId: string;

    constructor(frameCryptorId: string, participantId: string) {
        super();
        this._frameCryptorId = frameCryptorId;
        this._participantId = participantId;
        this._registerEvents();
    }

    get id() {
        return this._frameCryptorId;
    }

    get participantId() {
        return this._participantId;
    }

    _cryptorStateFromString(str: string): RTCFrameCryptorState {
        switch (str) {
            case 'new':
                return RTCFrameCryptorState.FrameCryptorStateNew;
            case 'ok':
                return RTCFrameCryptorState.FrameCryptorStateOk;
            case 'decryptionFailed':
                return RTCFrameCryptorState.FrameCryptorStateDecryptionFailed;
            case 'encryptionFailed':
                return RTCFrameCryptorState.FrameCryptorStateEncryptionFailed;
            case 'internalError':
                return RTCFrameCryptorState.FrameCryptorStateInternalError;
            case 'keyRatcheted':
                return RTCFrameCryptorState.FrameCryptorStateKeyRatcheted;
            case 'missingKey':
                return RTCFrameCryptorState.FrameCryptorStateMissingKey;
            default:
                throw 'Unknown FrameCryptorState: $str';
        }
    }

    async setKeyIndex(keyIndex: number): Promise<boolean> {
        const params = {
            frameCryptorId: this._frameCryptorId,
            keyIndex,
        };

        return WebRTCModule.frameCryptorSetKeyIndex(params)
            .then(data => data['result']);
    }

    async getKeyIndex(): Promise<number> {
        const params = {
            frameCryptorId: this._frameCryptorId,
        };

        return WebRTCModule.frameCryptorGetKeyIndex(params)
            .then(data => data['keyIndex']);
    }

    async setEnabled(enabled: boolean): Promise<boolean> {
        const params = {
            frameCryptorId: this._frameCryptorId,
            enabled,
        };

        return WebRTCModule.frameCryptorSetEnabled(params)
            .then(data => data['result']);
    }

    async getEnabled(): Promise<boolean> {
        const params = {
            frameCryptorId: this._frameCryptorId,
        };

        return WebRTCModule.frameCryptorGetEnabled(params)
            .then(data => data['enabled']);
    }

    async dispose(): Promise<void> {
        const params = {
            frameCryptorId: this._frameCryptorId,
        };

        await WebRTCModule.frameCryptorDispose(params);
        removeListener(this);
    }


    _registerEvents(): void {
        addListener(this, 'frameCryptionStateChanged', (ev: any) => {
            if (ev.participantId !== this._participantId || ev.frameCryptorId !== this._frameCryptorId) {
                return;
            }

            log.debug(`${this.id} frameCryptionStateChanged ${ev.state}`);

            const initDict = {
                frameCryptor: this,
                state: ev.state,
            };

            this.dispatchEvent(new RTCFrameCryptorStateEvent('onframecryptorstatechanged', initDict));
        });
    }
}

/**
 * Define the `onxxx` event handlers.
 */
const proto = RTCFrameCryptor.prototype;

defineEventAttribute(proto, 'onframecryptorstatechanged');