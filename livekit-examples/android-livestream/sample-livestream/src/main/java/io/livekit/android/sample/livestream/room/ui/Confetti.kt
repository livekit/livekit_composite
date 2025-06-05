package io.livekit.android.sample.livestream.room.ui

import android.graphics.Canvas
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.drawable.Drawable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import io.livekit.android.compose.chat.Chat
import io.livekit.android.compose.flow.rememberDataMessageHandler
import io.livekit.android.room.Room
import nl.dionsegijn.konfetti.compose.KonfettiView
import nl.dionsegijn.konfetti.compose.OnParticleSystemUpdateListener
import nl.dionsegijn.konfetti.core.Angle
import nl.dionsegijn.konfetti.core.Party
import nl.dionsegijn.konfetti.core.PartySystem
import nl.dionsegijn.konfetti.core.Position
import nl.dionsegijn.konfetti.core.Rotation
import nl.dionsegijn.konfetti.core.emitter.Emitter
import nl.dionsegijn.konfetti.core.models.Shape
import nl.dionsegijn.konfetti.core.models.Size
import java.util.concurrent.TimeUnit

@Composable
fun RoomConfettiView(room: Room, chatState: Chat, confettiState: ConfettiState, modifier: Modifier = Modifier) {
    val reactionsMessageHandler = rememberDataMessageHandler(room, "reactions")

    LaunchedEffect(room) {
        reactionsMessageHandler.messageFlow.collect {
            val reaction = it.payload.decodeToString()
            confettiState.addParty(reaction)
        }
    }

    LaunchedEffect(chatState) {
        chatState.messagesFlow.collect { chatMessage ->
            if (chatMessage.message.isOneEmoji()) {
                confettiState.addParty(chatMessage.message)
            }
        }
    }

    ConfettiView(state = confettiState, modifier = modifier)
}

@Composable
fun ConfettiView(state: ConfettiState, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
    ) {
        for (party in state.parties) {
            key(party) {
                KonfettiView(
                    modifier = Modifier.fillMaxSize(),
                    parties = party,
                    updateListener = object : OnParticleSystemUpdateListener {
                        override fun onParticleSystemEnded(system: PartySystem, activeSystems: Int) {
                            val list = state.parties.toMutableList()
                            val listToRemove = list.firstOrNull { pList -> pList.contains(system.party) }
                            if (listToRemove != null) {
                                list.remove(listToRemove)
                                state.parties = list
                            }
                        }
                    }
                )
            }
        }
    }
}

class ConfettiState {
    var parties by mutableStateOf(emptyList<List<Party>>())

    fun addParty(emoji: String) {
        @Suppress("NAME_SHADOWING") val emoji = emoji.trim()
        val party = Party(
            speed = 1f,
            maxSpeed = 20f,
            damping = 0.98f,
            angle = Angle.RIGHT - 45,
            spread = 60,
            emitter = Emitter(duration = 100, TimeUnit.MILLISECONDS).max(5),
            position = Position.Relative(0.0, 0.5),
            fadeOutEnabled = true,
            timeToLive = 1000,
        )

        val partyTemplate = listOf(
            party,
            party.copy(
                angle = party.angle - 90, // flip angle from right to left
                position = Position.Relative(1.0, 0.5)
            ),
        )
        val partyList = if (emoji == "\uD83C\uDF89") {
            // Use native confetti instead of emoji
            partyTemplate.map { p ->
                p.copy(
                    colors = listOf(0xfce18a, 0xff726d, 0xf4306d, 0xb48def),
                    emitter = Emitter(duration = 100, TimeUnit.MILLISECONDS).max(40),
                )
            }
        } else {
            partyTemplate.map { p ->
                p.copy(
                    size = listOf(Size(16)),
                    shapes = listOf<Shape>(
                        Shape.DrawableShape(
                            EmojiDrawable(emoji),
                            tint = false,
                            applyAlpha = true,
                        )
                    ),
                    rotation = Rotation(multiplier3D = 0f),
                )
            }
        }

        val newList = parties.toMutableList()
        newList.add(partyList)
        parties = newList
    }
}


private class EmojiDrawable(val string: String) : Drawable() {
    val paint = Paint()

    override fun draw(canvas: Canvas) {
        paint.textSize = bounds.height().toFloat()
        canvas.drawText(string, 0, string.length, bounds.left.toFloat(), bounds.bottom.toFloat(), paint)
    }

    override fun setAlpha(alpha: Int) {
        paint.alpha = alpha
    }

    override fun setColorFilter(colorFilter: ColorFilter?) {
        paint.colorFilter = colorFilter
    }

    override fun getOpacity(): Int {
        return PixelFormat.TRANSLUCENT
    }
}

private val emojiRegex = Regex(
    "(?:[\uD83C\uDF00-\uD83D\uDDFF]|[\uD83E\uDD00-\uD83E\uDDFF]|" +
            "[\uD83D\uDE00-\uD83D\uDE4F]|[\uD83D\uDE80-\uD83D\uDEFF]|" +
            "[\u2600-\u26FF]\uFE0F?|[\u2700-\u27BF]\uFE0F?|\u24C2\uFE0F?|" +
            "[\uD83C\uDDE6-\uD83C\uDDFF]{1,2}|" +
            "[\uD83C\uDD70\uD83C\uDD71\uD83C\uDD7E\uD83C\uDD7F\uD83C\uDD8E\uD83C\uDD91-\uD83C\uDD9A]\uFE0F?|" +
            "[\u0023\u002A\u0030-\u0039]\uFE0F?\u20E3|[\u2194-\u2199\u21A9-\u21AA]\uFE0F?|[\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55]\uFE0F?|" +
            "[\u2934\u2935]\uFE0F?|[\u3030\u303D]\uFE0F?|[\u3297\u3299]\uFE0F?|" +
            "[\uD83C\uDE01\uD83C\uDE02\uD83C\uDE1A\uD83C\uDE2F\uD83C\uDE32-\uD83C\uDE3A\uD83C\uDE50\uD83C\uDE51]\uFE0F?|" +
            "[\u203C\u2049]\uFE0F?|[\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE]\uFE0F?|" +
            "[\u00A9\u00AE]\uFE0F?|[\u2122\u2139]\uFE0F?|\uD83C\uDC04\uFE0F?|\uD83C\uDCCF\uFE0F?|" +
            "[\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA]\uFE0F?)"
)

fun String.isOneEmoji() = this.matches(emojiRegex)