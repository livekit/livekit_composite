#import <WebRTC/RTCPeerConnection.h>
#import "DataChannelWrapper.h"
#import "WebRTCModule.h"

@interface RTCPeerConnection (React)

@property(nonatomic, strong) NSNumber *reactTag;
@property(nonatomic, strong) NSMutableDictionary<NSString *, DataChannelWrapper *> *dataChannels;
@property(nonatomic, strong) NSMutableDictionary<NSString *, RTCMediaStream *> *remoteStreams;
@property(nonatomic, strong) NSMutableDictionary<NSString *, RTCMediaStreamTrack *> *remoteTracks;
@property(nonatomic, weak) id webRTCModule;

@end

@interface WebRTCModule (RTCPeerConnection)<RTCPeerConnectionDelegate>

-(nullable RTCRtpSender *)getSenderByPeerConnectionId: (nonnull NSNumber *)peerConnectionId
                                             senderId: (nonnull NSString *)senderId;
-(nullable RTCRtpReceiver *)getReceiverByPeerConnectionId: (nonnull NSNumber *)peerConnectionId
                                               receiverId: (nonnull NSString *)receiverId;
-(nullable RTCRtpTransceiver *)getTransceiverByPeerConnectionId: (nonnull NSNumber *)peerConnectionId
                                                  transceiverId: (nonnull NSString *)transceiverId;

@end
