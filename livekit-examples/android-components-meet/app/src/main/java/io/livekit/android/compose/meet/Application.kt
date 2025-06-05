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

package io.livekit.android.compose.meet

import com.github.ajalt.timberkt.Timber
import io.livekit.android.LiveKit
import io.livekit.android.util.LoggingLevel
import timber.log.Timber.DebugTree

class Application : android.app.Application() {

    override fun onCreate() {
        super.onCreate()

        Timber.plant(DebugTree())

        // Change logging level, defaults to OFF
        LiveKit.loggingLevel = LoggingLevel.INFO
    }
}
