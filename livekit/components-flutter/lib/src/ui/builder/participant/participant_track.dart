// Copyright 2024 LiveKit, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import 'package:flutter/material.dart';

import 'package:livekit_client/livekit_client.dart' as lk;
import 'package:provider/provider.dart';

import '../../../context/participant_context.dart';
import '../../../context/track_reference_context.dart';

class ParticipantTrack extends StatelessWidget {
  const ParticipantTrack({
    super.key,
    required this.participant,
    this.track,
    required this.builder,
  });

  final lk.Participant participant;
  final lk.TrackPublication? track;

  final Widget Function(BuildContext context) builder;

  @override
  Widget build(BuildContext context) {
    if (track == null) {
      return ChangeNotifierProvider(
        key: ValueKey(participant.identity),
        create: (_) => ParticipantContext(participant),
        child: builder(context),
      );
    }
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          key: ValueKey(track!.sid),
          create: (_) => ParticipantContext(participant),
        ),
        ChangeNotifierProvider(
          key: ValueKey(track!.sid),
          create: (_) => TrackReferenceContext(participant, pub: track),
        ),
      ],
      child: builder(context),
    );
  }
}
