import 'package:livekit_client/livekit_client.dart';

import 'method_channel.dart';

class LivekitVideoFilter implements TrackProcessor<VideoProcessorOptions> {
  final methodChannel = MethodChannelStatic.methodChannel;
  final String methodPrefix = 'video_filter';

  @override
  Future<void> destroy() async {
    await methodChannel.invokeMethod('${methodPrefix}_destroy');
  }

  @override
  Future<void> init(ProcessorOptions<TrackType> options) async {
    await methodChannel.invokeMethod('${methodPrefix}_init', {
      'trackId': options.track.id,
    });
  }

  @override
  String get name => 'LivekiVideoFilter';

  @override
  Future<void> onPublish(Room room) async {
    await methodChannel.invokeMethod('${methodPrefix}_onPublish');
  }

  @override
  Future<void> onUnpublish() async {
    await methodChannel.invokeMethod('${methodPrefix}_onUnpublish');
  }

  @override
  Future<void> restart() async {
    await methodChannel.invokeMethod('${methodPrefix}_restart');
  }
}
