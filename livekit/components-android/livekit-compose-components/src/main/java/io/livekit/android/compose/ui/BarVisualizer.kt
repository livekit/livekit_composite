/*
 * Copyright 2024-2025 LiveKit, Inc.
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

package io.livekit.android.compose.ui

import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.DrawStyle
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import io.livekit.android.annotations.Beta

internal val defaultBarVisualizerAnimationSpec = spring<Float>(
    stiffness = Spring.StiffnessHigh
)

/**
 * Draws bars evenly split across the width of the composable.
 *
 * @param amplitudes Values of the bars, between 0.0f and 1.0f, where 1.0f represents the maximum height of the composable.
 * @param alphas Alphas of the bars, between 0.0f and 1.0f. Defaults to 1.0f if null or not enough values are passed.
 */
@Beta
@Composable
fun BarVisualizer(
    modifier: Modifier = Modifier,
    style: DrawStyle = Fill,
    brush: Brush = SolidColor(Color.Black),
    barWidth: Dp = 8.dp,
    minHeight: Float = 0.2f,
    maxHeight: Float = 1.0f,
    amplitudes: FloatArray,
    alphas: FloatArray? = null,
    animationSpec: AnimationSpec<Float> = defaultBarVisualizerAnimationSpec
) {
    val amplitudeStates = amplitudes.map { animateFloatAsState(targetValue = it, animationSpec = animationSpec) }
    val alphaStates = alphas?.map { animateFloatAsState(targetValue = it) }
    Box(
        modifier = modifier
    ) {
        Canvas(
            modifier = Modifier.fillMaxSize()
        ) {
            if (amplitudeStates.isEmpty()) {
                return@Canvas
            }
            val barWidthPx = barWidth.toPx()
            val innerSpacing = (size.width - barWidthPx * amplitudes.size) / (amplitudeStates.size - 1)
            val barTotalWidth = barWidthPx + innerSpacing
            amplitudeStates.forEachIndexed { index, amplitude ->
                val normalizedAmplitude = minHeight + (maxHeight - minHeight) * amplitude.value.coerceIn(0.0f, 1.0f)
                val alpha = if (alphaStates != null && index < alphaStates.size) {
                    alphaStates[index].value
                } else {
                    1f
                }

                drawRoundRect(
                    brush = brush,
                    topLeft = Offset(
                        x = index * barTotalWidth,
                        y = size.height * (1 - normalizedAmplitude) / 2F
                    ),
                    size = Size(
                        width = barWidthPx,
                        height = (size.height * normalizedAmplitude).coerceAtLeast(1.dp.toPx())
                    ),
                    cornerRadius = CornerRadius(barWidthPx / 2, barWidthPx / 2),
                    alpha = alpha,
                    style = style
                )
            }
        }
    }
}
