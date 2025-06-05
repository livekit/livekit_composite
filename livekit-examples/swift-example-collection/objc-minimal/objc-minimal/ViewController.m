//
//  ViewController.m
//  objc-minimal
//
//  Created by Hiroshi Horie on 2022/09/02.
//

#import "ViewController.h"

@import LiveKit;

@interface ViewController () <RoomDelegate> {
    Room *_room;
    VideoView *_localVideoView;
    VideoView *_remoteVideoView;
}

@end

@implementation ViewController

- (void)room:(Room *)room didUpdateConnectionState:(enum ConnectionState)newState from:(enum ConnectionState)oldState {
    NSLog(@"didUpdate connectionState: %ld", (long)newState);
}

- (void)room:(Room *)room localParticipant:(LocalParticipant *)participant didPublishTrack:(LocalTrackPublication *)publication {
    id localTrack = publication.track;
    // filter out audio tracks etc
    if ([localTrack conformsToProtocol:@protocol(VideoTrack)]) {
        _localVideoView.track = localTrack;
    }
}

- (void)room:(Room *)room participant:(RemoteParticipant *)participant didSubscribeTrack:(RemoteTrackPublication *)publication {
    id remoteTrack = publication.track;
    // filter out audio tracks etc
    if ([remoteTrack conformsToProtocol:@protocol(VideoTrack)]) {
        _remoteVideoView.track = remoteTrack;
    }
}

- (void)loadView {

    Room *room = [[Room alloc] initWithDelegate:self
                                 connectOptions:nil
                                    roomOptions:nil];

    _room = room;

    // Prepare parent View

    NSView *view = [[NSView alloc] initWithFrame:NSMakeRect(100, 100, 300, 300)];
    view.wantsLayer = YES;
    view.layer.backgroundColor = NSColor.redColor.CGColor;

    // Prepare VideoView

    _localVideoView = [[VideoView alloc] initWithFrame:view.frame];
    _localVideoView.isDebugMode = YES;
    _localVideoView.wantsLayer = YES;
    _localVideoView.layer.backgroundColor = NSColor.greenColor.CGColor;
    [view addSubview:_localVideoView];

    _remoteVideoView = [[VideoView alloc] initWithFrame:view.frame];
    _remoteVideoView.isDebugMode = YES;
    _remoteVideoView.wantsLayer = YES;
    _remoteVideoView.layer.backgroundColor = NSColor.purpleColor.CGColor;
    [view addSubview:_remoteVideoView];

    self.view = view;
}

- (void)viewDidLoad {
    [super viewDidLoad];

    // Do any additional setup after loading the view.

    NSLog(@"view did load");

    // Connect to Room

    [_room connectWithUrl:@""
                    token:@""
           connectOptions:nil
              roomOptions:nil
        completionHandler:^(NSError * _Nullable error) {
        // Check for errors...
        if (error != nil) {
            NSLog(@"Failed to connect with error: %@", error);
            return;
        }

        // Publish camera
        [self->_room.localParticipant setCameraWithEnabled:YES
                                            captureOptions:nil
                                            publishOptions:nil
                                         completionHandler:^(LocalTrackPublication * _Nullable publication, NSError * _Nullable error) {
            // Handle errors...
        }];

    }];
}

- (void)viewDidLayout {
    [super viewDidLayout];
    CGSize size = self.view.bounds.size;
    // Local view on the left side
    _localVideoView.frame = CGRectMake(0, 0, size.width / 2, size.height);
    // Local view on the right side
    _remoteVideoView.frame = CGRectMake(_localVideoView.frame.size.width, 0,
                                        size.width / 2, size.height);
}

- (void)viewWillDisappear {
    [_room disconnectWithCompletionHandler:^{}];
}

- (void)setRepresentedObject:(id)representedObject {
    [super setRepresentedObject:representedObject];

    // Update the view, if already loaded.
}

@end
