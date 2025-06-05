import 'package:livekit_client/livekit_client.dart';

import 'method_channel.dart';

class LivekitAudioFilter implements TrackProcessor<AudioProcessorOptions> {
  final methodChannel = MethodChannelStatic.methodChannel;
  final String methodPrefix = 'audio_filter';

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
  String get name => 'LivekiAudioFilter';

  @override
  Future<void> onPublish(Room room) async {
    await methodChannel.invokeMethod('${methodPrefix}_onPublish', {});
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
