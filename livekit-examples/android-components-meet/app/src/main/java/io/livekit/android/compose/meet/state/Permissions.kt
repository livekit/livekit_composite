/*
 * Copyright 2023 LiveKit, Inc.
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

package io.livekit.android.compose.meet.state

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.remember
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.PermissionState
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState

/**
 * Handles requesting the required permissions if needed.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun requirePermission(enabled: Boolean, permission: String): PermissionState {
    val permissionState = rememberPermissionState(permission)

    DisposableEffect(enabled, permissionState) {
        if (enabled && !permissionState.status.isGranted) {
            permissionState.launchPermissionRequest()
        }
        onDispose { /* do nothing */ }
    }

    return permissionState
}

/**
 * @return true if both enabled is true and the camera permission is granted.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun rememberEnableCamera(enabled: Boolean): Boolean {
    val permissionState = requirePermission(enabled = enabled, permission = android.Manifest.permission.CAMERA)
    return remember(enabled, permissionState) {
        derivedStateOf {
            enabled && permissionState.status.isGranted
        }
    }.value
}

/**
 * @return true if both enabled is true and the mic permission is granted.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun rememberEnableMic(enabled: Boolean): Boolean {
    val permissionState = requirePermission(enabled = enabled, permission = android.Manifest.permission.RECORD_AUDIO)
    return remember(enabled, permissionState) {
        derivedStateOf {
            enabled && permissionState.status.isGranted
        }
    }.value
}
