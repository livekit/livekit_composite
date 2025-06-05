/*
 * Copyright 2024 LiveKit, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package io.livekit.android.compose.meet.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import io.livekit.android.compose.state.rememberParticipantTrackReferences
import io.livekit.android.room.participant.Participant
import io.livekit.android.room.track.Track

/**
 * Handles finding the preferred track for a participant and displaying it.
 */
@Composable
fun PrimarySpeakerView(
    participant: Participant,
    modifier: Modifier = Modifier,
) {
    val videoTracks = rememberParticipantTrackReferences(
        passedParticipant = participant,
        usePlaceholders = setOf(Track.Source.CAMERA),
    )

    // Prefer screen share track.
    val trackToShow = videoTracks.firstOrNull { track -> track.source == Track.Source.SCREEN_SHARE }
        ?: videoTracks.firstOrNull { track -> track.source == Track.Source.CAMERA }
        ?: videoTracks.first()

    TrackItem(
        trackReference = trackToShow,
        modifier = modifier,
    )
}
