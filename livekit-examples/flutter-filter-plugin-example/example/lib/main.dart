import 'package:flutter/material.dart';
import 'dart:async';

// ignore: depend_on_referenced_packages
import 'package:livekit_client/livekit_client.dart';
import 'package:livekit_filter_plugin_example/livekit_filter_plugin_example.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final _videoFilter = LivekitVideoFilter();
  final _audioFilter = LivekitAudioFilter();
  Room? _room;

  String url = 'ws://127.0.0.1:7880';

  String token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzcwNzM1ODksImlzcyI6IkFQSXJramtRYVZRSjVERSIsIm5hbWUiOiItaSIsIm5iZiI6MTczNTI3MzU4OSwic3ViIjoiLWkiLCJ2aWRlbyI6eyJjYW5VcGRhdGVPd25NZXRhZGF0YSI6dHJ1ZSwicm9vbSI6Im1hYyIsInJvb21Kb2luIjp0cnVlfX0.00Q4fpJf4amGTex5-Hltb1PrTBQN0kq-ssxv7QMTVL4';

  @override
  void initState() {
    super.initState();
    initFilters();
  }

  // Platform messages are asynchronous, so we initialize in an async method.
  Future<void> initFilters() async {
    _room = Room(
      roomOptions: RoomOptions(
        defaultAudioCaptureOptions: AudioCaptureOptions(
          processor: _audioFilter,
        ),
        defaultCameraCaptureOptions: CameraCaptureOptions(
          processor: _videoFilter,
        ),
      ),
    );
    await _room!.connect(url, token);
    await _room!.localParticipant!.setCameraEnabled(true);
    await _room!.localParticipant!.setMicrophoneEnabled(true);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Plugin example app'),
        ),
        body: Center(
          child: Text('xxxxx'),
        ),
      ),
    );
  }
}
