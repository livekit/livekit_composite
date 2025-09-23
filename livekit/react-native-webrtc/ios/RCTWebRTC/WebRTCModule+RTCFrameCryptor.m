#include <Foundation/Foundation.h>
#import <objc/runtime.h>

#import <React/RCTBridge.h>
#import <React/RCTBridgeModule.h>

#import "WebRTCModule+RTCPeerConnection.h"
#import "WebRTCModule.h"

// Key for objc_set/getAssociatedObject, value of NSString*
static char frameCryptorUUIDKey;

@interface WebRTCModule ()<RTCFrameCryptorDelegate>
@end

@implementation WebRTCModule (RTCFrameCryptor)

- (RTCCryptorAlgorithm)getAlgorithm:(NSNumber *)algorithm {
    switch ([algorithm intValue]) {
        // case 0:
        //     return RTCCryptorAlgorithmAesGcm;
        // case 1:
        //     return RTCCryptorAlgorithmAesCbc;
        default:
            return RTCCryptorAlgorithmAesGcm;
    }
}

- (NSData *)bytesFromMap:(NSDictionary *)map key:(NSString *)key isBase64Key:(nullable NSString *)isBase64Key {
    BOOL isBase64 = YES;
    if (isBase64Key) {
        isBase64 = [map[isBase64Key] boolValue];
    }

    if (isBase64) {
        return [[NSData alloc] initWithBase64EncodedString:map[key] options:0];
    } else {
        return [map[key] dataUsingEncoding:NSUTF8StringEncoding];
    }
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(frameCryptorFactoryCreateFrameCryptor : (nonnull NSDictionary *)constraints) {
    __block NSString *frameCryptorId = nil;
    dispatch_sync(self.workerQueue, ^{
        NSNumber *peerConnectionId = constraints[@"peerConnectionId"];
        NSNumber *algorithm = constraints[@"algorithm"];
        if (algorithm == nil) {
            NSLog(@"frameCryptorFactoryCreateFrameCryptorFailed: Invalid algorithm");
            return;
        }

        NSString *participantId = constraints[@"participantId"];
        if (participantId == nil) {
            NSLog(@"frameCryptorFactoryCreateFrameCryptorFailed: Invalid participantId");
            return;
        }

        NSString *keyProviderId = constraints[@"keyProviderId"];
        if (keyProviderId == nil) {
            NSLog(@"frameCryptorFactoryCreateFrameCryptorFailed: Invalid keyProviderId");
            return;
        }

        RTCFrameCryptorKeyProvider *keyProvider = self.keyProviders[keyProviderId];
        if (keyProvider == nil) {
            NSLog(@"frameCryptorFactoryCreateFrameCryptorFailed: Invalid keyProvider");
            return;
        }

        NSString *type = constraints[@"type"];
        NSString *rtpSenderId = constraints[@"rtpSenderId"];
        NSString *rtpReceiverId = constraints[@"rtpReceiverId"];

        if ([type isEqualToString:@"sender"]) {
            RTCRtpSender *sender = [self getSenderByPeerConnectionId:peerConnectionId senderId:rtpSenderId];

            if (sender == nil) {
                NSLog(@"frameCryptorFactoryCreateFrameCryptorFailed: Error: sender not found!");
                return;
            }

            RTCFrameCryptor *frameCryptor = [[RTCFrameCryptor alloc] initWithFactory:self.peerConnectionFactory
                                                                           rtpSender:sender
                                                                       participantId:participantId
                                                                           algorithm:[self getAlgorithm:algorithm]
                                                                         keyProvider:keyProvider];
            frameCryptorId = [[NSUUID UUID] UUIDString];

            frameCryptor.delegate = self;

            self.frameCryptors[frameCryptorId] = frameCryptor;
            objc_setAssociatedObject(frameCryptor, &frameCryptorUUIDKey, frameCryptorId, OBJC_ASSOCIATION_COPY);
            return;
        } else if ([type isEqualToString:@"receiver"]) {
            RTCRtpReceiver *receiver = [self getReceiverByPeerConnectionId:peerConnectionId receiverId:rtpReceiverId];
            if (receiver == nil) {
                NSLog(@"frameCryptorFactoryCreateFrameCryptorFailed: Error: receiver not found!");
                return;
            }
            RTCFrameCryptor *frameCryptor = [[RTCFrameCryptor alloc] initWithFactory:self.peerConnectionFactory
                                                                         rtpReceiver:receiver
                                                                       participantId:participantId
                                                                           algorithm:[self getAlgorithm:algorithm]
                                                                         keyProvider:keyProvider];
            frameCryptorId = [[NSUUID UUID] UUIDString];

            frameCryptor.delegate = self;

            self.frameCryptors[frameCryptorId] = frameCryptor;
            objc_setAssociatedObject(frameCryptor, &frameCryptorUUIDKey, frameCryptorId, OBJC_ASSOCIATION_COPY);
            return;
        } else {
            NSLog(@"InvalidArgument: Invalid type");
            return;
        }
    });

    return frameCryptorId;
}

RCT_EXPORT_METHOD(frameCryptorSetKeyIndex
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    NSString *frameCryptorId = constraints[@"frameCryptorId"];
    if (frameCryptorId == nil) {
        reject(@"frameCryptorSetKeyIndexFailed", @"Invalid frameCryptorId", nil);
        return;
    }
    RTCFrameCryptor *frameCryptor = self.frameCryptors[frameCryptorId];
    if (frameCryptor == nil) {
        reject(@"frameCryptorSetKeyIndexFailed", @"Invalid frameCryptor", nil);
        return;
    }

    NSNumber *keyIndex = constraints[@"keyIndex"];
    if (keyIndex == nil) {
        reject(@"frameCryptorSetKeyIndexFailed", @"Invalid keyIndex", nil);
        return;
    }
    [frameCryptor setKeyIndex:[keyIndex intValue]];
    resolve(@{@"result" : @YES});
}

RCT_EXPORT_METHOD(frameCryptorGetKeyIndex
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    NSString *frameCryptorId = constraints[@"frameCryptorId"];
    if (frameCryptorId == nil) {
        reject(@"frameCryptorGetKeyIndexFailed", @"Invalid frameCryptorId", nil);
        return;
    }
    RTCFrameCryptor *frameCryptor = self.frameCryptors[frameCryptorId];
    if (frameCryptor == nil) {
        reject(@"frameCryptorGetKeyIndexFailed", @"Invalid frameCryptor", nil);
        return;
    }
    resolve(@{@"keyIndex" : [NSNumber numberWithInt:frameCryptor.keyIndex]});
}

RCT_EXPORT_METHOD(frameCryptorSetEnabled
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    NSString *frameCryptorId = constraints[@"frameCryptorId"];
    if (frameCryptorId == nil) {
        reject(@"frameCryptorSetEnabledFailed", @"Invalid frameCryptorId", nil);
        return;
    }
    RTCFrameCryptor *frameCryptor = self.frameCryptors[frameCryptorId];
    if (frameCryptor == nil) {
        reject(@"frameCryptorSetEnabledFailed", @"Invalid frameCryptor", nil);
        return;
    }

    NSNumber *enabled = constraints[@"enabled"];
    if (enabled == nil) {
        reject(@"frameCryptorSetEnabledFailed", @"Invalid enabled", nil);
        return;
    }
    frameCryptor.enabled = [enabled boolValue];
    resolve(@{@"result" : enabled});
}

RCT_EXPORT_METHOD(frameCryptorGetEnabled
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    NSString *frameCryptorId = constraints[@"frameCryptorId"];
    if (frameCryptorId == nil) {
        reject(@"frameCryptorGetEnabledFailed", @"Invalid frameCryptorId", nil);
        return;
    }
    RTCFrameCryptor *frameCryptor = self.frameCryptors[frameCryptorId];
    if (frameCryptor == nil) {
        reject(@"frameCryptorGetEnabledFailed", @"Invalid frameCryptor", nil);
        return;
    }
    resolve(@{@"enabled" : [NSNumber numberWithBool:frameCryptor.enabled]});
}

RCT_EXPORT_METHOD(frameCryptorDispose
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    NSString *frameCryptorId = constraints[@"frameCryptorId"];
    if (frameCryptorId == nil) {
        reject(@"frameCryptorDisposeFailed", @"Invalid frameCryptorId", nil);
        return;
    }
    RTCFrameCryptor *frameCryptor = self.frameCryptors[frameCryptorId];
    if (frameCryptor == nil) {
        reject(@"frameCryptorDisposeFailed", @"Invalid frameCryptor", nil);
        return;
    }
    [self.frameCryptors removeObjectForKey:frameCryptorId];
    frameCryptor.enabled = NO;
    resolve(@{@"result" : @"success"});
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(frameCryptorFactoryCreateKeyProvider
                                       : (nonnull NSDictionary *)keyProviderOptions) {
    __block NSString *keyProviderId = [[NSUUID UUID] UUIDString];

    dispatch_sync(self.workerQueue, ^{
        NSNumber *sharedKey = keyProviderOptions[@"sharedKey"];
        if (sharedKey == nil) {
            NSLog(@"frameCryptorFactoryCreateKeyProviderFailed: Invalid sharedKey");
            keyProviderId = nil;
            return;
        }

        if (keyProviderOptions[@"ratchetSalt"] == nil) {
            NSLog(@"frameCryptorFactoryCreateKeyProviderFailed: Invalid ratchetSalt");
            keyProviderId = nil;
            return;
        }
        NSData *ratchetSalt = [self bytesFromMap:keyProviderOptions
                                             key:@"ratchetSalt"
                                     isBase64Key:@"ratchetSaltIsBase64"];

        NSNumber *ratchetWindowSize = keyProviderOptions[@"ratchetWindowSize"];
        if (ratchetWindowSize == nil) {
            NSLog(@"frameCryptorFactoryCreateKeyProviderFailed: Invalid ratchetWindowSize");
            keyProviderId = nil;
            return;
        }

        NSNumber *failureTolerance = keyProviderOptions[@"failureTolerance"];
        NSData *uncryptedMagicBytes = nil;

        if (keyProviderOptions[@"uncryptedMagicBytes"] != nil) {
            uncryptedMagicBytes = [[NSData alloc] initWithBase64EncodedString:keyProviderOptions[@"uncryptedMagicBytes"]
                                                                      options:0];
        }

        NSNumber *keyRingSize = keyProviderOptions[@"keyRingSize"];
        NSNumber *discardFrameWhenCryptorNotReady = keyProviderOptions[@"discardFrameWhenCryptorNotReady"];

        RTCFrameCryptorKeyProvider *keyProvider = [[RTCFrameCryptorKeyProvider alloc]
                        initWithRatchetSalt:ratchetSalt
                          ratchetWindowSize:[ratchetWindowSize intValue]
                              sharedKeyMode:[sharedKey boolValue]
                        uncryptedMagicBytes:uncryptedMagicBytes
                           failureTolerance:failureTolerance != nil ? [failureTolerance intValue] : -1
                                keyRingSize:keyRingSize != nil ? [keyRingSize intValue] : 0
            discardFrameWhenCryptorNotReady:discardFrameWhenCryptorNotReady != nil
                                                ? [discardFrameWhenCryptorNotReady boolValue]
                                                : NO];
        self.keyProviders[keyProviderId] = keyProvider;
        return;
    });
    return keyProviderId;
}

- (nullable RTCFrameCryptorKeyProvider *)getKeyProviderForId:(NSString *)keyProviderId
                                                    rejecter:(RCTPromiseRejectBlock)reject {
    if (keyProviderId == nil) {
        reject(@"getKeyProviderForIdFailed", @"Invalid keyProviderId", nil);
        return nil;
    }
    RTCFrameCryptorKeyProvider *keyProvider = self.keyProviders[keyProviderId];
    if (keyProvider == nil) {
        reject(@"getKeyProviderForIdFailed", @"Invalid keyProvider", nil);
        return nil;
    }
    return keyProvider;
}

RCT_EXPORT_METHOD(keyProviderSetSharedKey
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    RTCFrameCryptorKeyProvider *keyProvider = [self getKeyProviderForId:constraints[@"keyProviderId"] rejecter:reject];
    if (keyProvider == nil) {
        return;
    }

    NSNumber *keyIndex = constraints[@"keyIndex"];
    if (keyIndex == nil) {
        reject(@"keyProviderSetSharedKey", @"Invalid keyIndex", nil);
        return;
    }

    if (constraints[@"key"] == nil) {
        reject(@"keyProviderSetSharedKey", @"Invalid key", nil);
        return;
    }
    NSData *key = [self bytesFromMap:constraints key:@"key" isBase64Key:@"keyIsBase64"];

    [keyProvider setSharedKey:key withIndex:[keyIndex intValue]];
    resolve(@{@"result" : @YES});
}

RCT_EXPORT_METHOD(keyProviderRatchetSharedKey
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    RTCFrameCryptorKeyProvider *keyProvider = [self getKeyProviderForId:constraints[@"keyProviderId"] rejecter:reject];
    if (keyProvider == nil) {
        return;
    }

    NSNumber *keyIndex = constraints[@"keyIndex"];
    if (keyIndex == nil) {
        reject(@"keyProviderRatchetSharedKeyFailed", @"Invalid keyIndex", nil);
        return;
    }

    NSData *newKey = [keyProvider ratchetSharedKey:[keyIndex intValue]];
    resolve(@{@"result" : [newKey base64EncodedStringWithOptions:0]});
}

RCT_EXPORT_METHOD(keyProviderExportSharedKey
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    RTCFrameCryptorKeyProvider *keyProvider = [self getKeyProviderForId:constraints[@"keyProviderId"] rejecter:reject];
    if (keyProvider == nil) {
        return;
    }

    NSNumber *keyIndex = constraints[@"keyIndex"];
    if (keyIndex == nil) {
        reject(@"keyProviderExportSharedKeyFailed", @"Invalid keyIndex", nil);
        return;
    }

    NSData *key = [keyProvider exportSharedKey:[keyIndex intValue]];
    resolve(@{@"result" : [key base64EncodedStringWithOptions:0]});
}

RCT_EXPORT_METHOD(keyProviderSetKey
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    RTCFrameCryptorKeyProvider *keyProvider = [self getKeyProviderForId:constraints[@"keyProviderId"] rejecter:reject];
    if (keyProvider == nil) {
        return;
    }

    NSNumber *keyIndex = constraints[@"keyIndex"];
    if (keyIndex == nil) {
        reject(@"keyProviderSetKeyFailed", @"Invalid keyIndex", nil);
        return;
    }

    if (constraints[@"key"] == nil) {
        reject(@"keyProviderSetKeyFailed", @"Invalid key", nil);
        return;
    }
    NSData *key = [self bytesFromMap:constraints key:@"key" isBase64Key:@"keyIsBase64"];

    NSString *participantId = constraints[@"participantId"];
    if (participantId == nil) {
        reject(@"keyProviderSetKeyFailed", @"Invalid participantId", nil);
        return;
    }

    [keyProvider setKey:key withIndex:[keyIndex intValue] forParticipant:participantId];
    resolve(@{@"result" : @YES});
}

RCT_EXPORT_METHOD(keyProviderRatchetKey
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    RTCFrameCryptorKeyProvider *keyProvider = [self getKeyProviderForId:constraints[@"keyProviderId"] rejecter:reject];
    if (keyProvider == nil) {
        return;
    }

    NSNumber *keyIndex = constraints[@"keyIndex"];
    if (keyIndex == nil) {
        reject(@"keyProviderRatchetKeyFailed", @"Invalid keyIndex", nil);
        return;
    }

    NSString *participantId = constraints[@"participantId"];
    if (participantId == nil) {
        reject(@"keyProviderRatchetKeyFailed", @"Invalid participantId", nil);
        return;
    }

    NSData *newKey = [keyProvider ratchetKey:participantId withIndex:[keyIndex intValue]];
    resolve(@{@"result" : [newKey base64EncodedStringWithOptions:0]});
}

RCT_EXPORT_METHOD(keyProviderExportKey
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    RTCFrameCryptorKeyProvider *keyProvider = [self getKeyProviderForId:constraints[@"keyProviderId"] rejecter:reject];
    if (keyProvider == nil) {
        return;
    }

    NSNumber *keyIndex = constraints[@"keyIndex"];
    if (keyIndex == nil) {
        reject(@"keyProviderExportKeyFailed", @"Invalid keyIndex", nil);
        return;
    }

    NSString *participantId = constraints[@"participantId"];
    if (participantId == nil) {
        reject(@"keyProviderExportKeyFailed", @"Invalid participantId", nil);
        return;
    }

    NSData *key = [keyProvider exportKey:participantId withIndex:[keyIndex intValue]];
    resolve(@{@"result" : [key base64EncodedStringWithOptions:0]});
}

RCT_EXPORT_METHOD(keyProviderSetSifTrailer
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    RTCFrameCryptorKeyProvider *keyProvider = [self getKeyProviderForId:constraints[@"keyProviderId"] rejecter:reject];
    if (keyProvider == nil) {
        return;
    }

    if (constraints[@"sifTrailer"] == nil) {
        reject(@"keyProviderSetSifTrailerFailed", @"Invalid key", nil);
        return;
    }
    NSData *sifTrailer = [[NSData alloc] initWithBase64EncodedString:constraints[@"sifTrailer"] options:0];

    [keyProvider setSifTrailer:sifTrailer];
    resolve(nil);
}

RCT_EXPORT_METHOD(keyProviderDispose
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    NSString *keyProviderId = constraints[@"keyProviderId"];
    if (keyProviderId == nil) {
        reject(@"getKeyProviderForIdFailed", @"Invalid keyProviderId", nil);
        return;
    }
    [self.keyProviders removeObjectForKey:keyProviderId];
    resolve(@{@"result" : @"success"});
}

- (NSString *)stringFromState:(RTCFrameCryptorState)state {
    switch (state) {
        case RTCFrameCryptorStateNew:
            return @"new";
        case RTCFrameCryptorStateOk:
            return @"ok";
        case RTCFrameCryptorStateEncryptionFailed:
            return @"encryptionFailed";
        case RTCFrameCryptorStateDecryptionFailed:
            return @"decryptionFailed";
        case RTCFrameCryptorStateMissingKey:
            return @"missingKey";
        case RTCFrameCryptorStateKeyRatcheted:
            return @"keyRatcheted";
        case RTCFrameCryptorStateInternalError:
            return @"internalError";
        default:
            return @"unknown";
    }
}

RCT_EXPORT_METHOD(dataPacketCryptorFactoryCreateDataPacketCryptor
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    NSNumber *algorithm = constraints[@"algorithm"];
    NSString *keyProviderId = constraints[@"keyProviderId"];
    if (keyProviderId == nil) {
        reject(@"dataPacketCryptorFactoryCreateDataPacketCryptorFailed", @"Invalid keyProviderId", nil);
        return;
    }

    RTCFrameCryptorKeyProvider *keyProvider = self.keyProviders[keyProviderId];
    if (keyProvider == nil) {
        reject(@"getKeyProviderForIdFailed", @"Invalid keyProviderId", nil);
        return;
    }

    RTCDataPacketCryptor *cryptor = [[RTCDataPacketCryptor alloc] initWithAlgorithm:[self getAlgorithm:algorithm]
                                                                        keyProvider:keyProvider];
    NSString *cryptorId = [[NSUUID UUID] UUIDString];

    self.dataPacketCryptors[cryptorId] = cryptor;

    resolve(@{@"dataPacketCryptorId" : cryptorId});
}

RCT_EXPORT_METHOD(dataPacketCryptorEncrypt
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    NSString *cryptorId = constraints[@"dataPacketCryptorId"];
    NSString *participantId = constraints[@"participantId"];
    NSNumber *keyIndex = constraints[@"keyIndex"];
    NSData *data = [self bytesFromMap:constraints key:@"data" isBase64Key:nil];

    RTCDataPacketCryptor *cryptor = self.dataPacketCryptors[cryptorId];

    if (cryptor == nil) {
        reject(@"dataPacketCryptorEncryptFailed", @"data packet cryptor not found", nil);
        return;
    }

    RTCEncryptedPacket *packet = [cryptor encrypt:participantId keyIndex:[keyIndex unsignedIntValue] data:data];

    if (packet == nil) {
        reject(@"dataPacketCryptorEncryptFailed", @"packet encryption failed", nil);
        return;
    }

    resolve(@{
        @"payload" : [packet.data base64EncodedStringWithOptions:0],
        @"iv" : [packet.iv base64EncodedStringWithOptions:0],
        @"keyIndex" : [NSNumber numberWithUnsignedInt:packet.keyIndex]
    });
}

RCT_EXPORT_METHOD(dataPacketCryptorDecrypt
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    NSString *cryptorId = constraints[@"dataPacketCryptorId"];
    NSString *participantId = constraints[@"participantId"];
    NSNumber *keyIndex = constraints[@"keyIndex"];
    NSData *payload = [self bytesFromMap:constraints key:@"payload" isBase64Key:nil];
    NSData *iv = [self bytesFromMap:constraints key:@"iv" isBase64Key:nil];

    RTCDataPacketCryptor *cryptor = self.dataPacketCryptors[cryptorId];

    if (cryptor == nil) {
        reject(@"dataPacketCryptorDecryptFailed", @"data packet cryptor not found", nil);
        return;
    }

    RTCEncryptedPacket *packet = [[RTCEncryptedPacket alloc] initWithData:payload
                                                                       iv:iv
                                                                 keyIndex:[keyIndex unsignedIntValue]];
    NSData *decryptedData = [cryptor decrypt:participantId encryptedPacket:packet];

    if (decryptedData == nil) {
        reject(@"dataPacketCryptorDecryptFailed", @"packet decryption failed", nil);
        return;
    }

    resolve(@{@"data" : [decryptedData base64EncodedStringWithOptions:0]});
}
RCT_EXPORT_METHOD(dataPacketCryptorDispose
                  : (nonnull NSDictionary *)constraints resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject) {
    NSString *cryptorId = constraints[@"dataPacketCryptorId"];

    RTCDataPacketCryptor *cryptor = self.dataPacketCryptors[cryptorId];

    if (cryptor == nil) {
        reject(@"dataPacketCryptorDisposeFailed", @"data packet cryptor not found", nil);
        return;
    }

    [self.dataPacketCryptors removeObjectForKey:cryptorId];
    resolve(@{@"result" : @"success"});
}

#pragma mark - RTCFrameCryptorDelegate methods

- (void)frameCryptor:(RTC_OBJC_TYPE(RTCFrameCryptor) *)frameCryptor
    didStateChangeWithParticipantId:(NSString *)participantId
                          withState:(RTCFrameCryptorState)stateChanged {
    id frameCryptorId = objc_getAssociatedObject(frameCryptor, &frameCryptorUUIDKey);

    if (![frameCryptorId isKindOfClass:[NSString class]]) {
        NSLog(@"Received frameCryptordidStateChangeWithParticipantId event for frame cryptor without UUID!");
        return;
    }

    NSDictionary *event = @{
        @"event" : kEventFrameCryptionStateChanged,
        @"participantId" : participantId,
        @"frameCryptorId" : (NSString *)frameCryptorId,
        @"state" : [self stringFromState:stateChanged]
    };
    [self sendEventWithName:kEventFrameCryptionStateChanged body:event];
}

@end
