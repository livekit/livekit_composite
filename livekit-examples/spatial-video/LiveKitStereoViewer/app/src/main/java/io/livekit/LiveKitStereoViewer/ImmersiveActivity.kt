package io.livekit.LiveKitStereoViewer

import android.net.Uri
import android.util.Log
import android.view.View
import com.meta.spatial.castinputforward.CastInputForwardFeature
import com.meta.spatial.core.Entity
import com.meta.spatial.core.Pose
import com.meta.spatial.core.Quaternion
import com.meta.spatial.core.SpatialFeature
import com.meta.spatial.core.Vector3
import com.meta.spatial.datamodelinspector.DataModelInspectorFeature
import com.meta.spatial.debugtools.HotReloadFeature
import com.meta.spatial.ovrmetrics.OVRMetricsDataModel
import com.meta.spatial.ovrmetrics.OVRMetricsFeature
import com.meta.spatial.runtime.LayerConfig
import com.meta.spatial.runtime.StereoMode
import com.meta.spatial.toolkit.AppSystemActivity
import com.meta.spatial.toolkit.Grabbable
import com.meta.spatial.toolkit.Material
import com.meta.spatial.toolkit.Mesh
import com.meta.spatial.toolkit.PanelRegistration
import com.meta.spatial.toolkit.Transform
import com.meta.spatial.toolkit.createPanelEntity
import com.meta.spatial.vr.VRFeature
import io.livekit.android.LiveKit
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import io.livekit.android.renderer.SurfaceViewRenderer
import io.livekit.android.room.Room
import io.livekit.android.room.track.VideoTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ImmersiveActivity : AppSystemActivity() {

  private val activityScope = CoroutineScope(Dispatchers.Main)
  private lateinit var room: Room

  private lateinit var renderer: SurfaceViewRenderer
  private var videoTrackSid: String? = null

  private companion object {
    const val TAG = "LiveKitStereoViewer"

    // Set server URL and token here before running
    const val LK_SERVER_URL = ""
    const val LK_TOKEN = ""

    // TODO: These values should be set dynamically.
    const val STREAM_WIDTH = 3840f
    const val STREAM_HEIGHT = 1080f
    val STREAM_STEREO_MODE = StereoMode.LeftRight
  }

  override fun registerFeatures(): List<SpatialFeature> {
    val features = mutableListOf<SpatialFeature>(VRFeature(this))
    if (BuildConfig.DEBUG) {
      features.add(CastInputForwardFeature(this))
      features.add(HotReloadFeature(this))
      features.add(OVRMetricsFeature(this, OVRMetricsDataModel() { numberOfMeshes() }))
      features.add(DataModelInspectorFeature(spatial, this.componentManager))
    }
    return features
  }

  override fun onSceneReady() {
    super.onSceneReady()
    scene.setViewOrigin(0.0f, 0.0f, 2.0f, 180.0f)
    Entity.create(
      listOf(
        Mesh(Uri.parse("mesh://skybox")),
        Material().apply {
          baseTextureAndroidResourceId = R.drawable.skydome
          unlit = true // Prevent scene lighting from affecting the skybox
        },
        Transform(Pose(Vector3(x = 0f, y = 0f, z = 0f)))
      )
    )
    Entity.createPanelEntity(
      R.layout.renderer,
      Transform(Pose(Vector3(0.0f, 1.7f, 1f), Quaternion(180f, 0f, 180f))),
      Grabbable()
    )
  }

  override fun registerPanels(): List<PanelRegistration> {
    return listOf(
      PanelRegistration(R.layout.renderer) {
        config {
          layoutWidthInPx = STREAM_WIDTH.toInt()
          layoutHeightInPx = STREAM_HEIGHT.toInt()
          width = 1f
          height = STREAM_HEIGHT / (STREAM_WIDTH / 2) // Assuming LR layout
          stereoMode = STREAM_STEREO_MODE
          themeResourceId = R.style.PanelAppThemeTransparent
          includeGlass = false
          layerConfig = LayerConfig()
          enableTransparent = true
        }
        panel {
          renderer = rootView?.findViewById<SurfaceViewRenderer>(R.id.renderer) ?: return@panel
          room = LiveKit.create(applicationContext)
          room.initVideoRenderer(renderer)
          connectToRoom()
        }
      }
    )
  }

  private fun connectToRoom() {
    activityScope.launch {
      launch {
        room.events.collect { event ->
          when (event) {
            is RoomEvent.TrackSubscribed -> onTrackSubscribed(event)
            is RoomEvent.TrackUnsubscribed -> onTrackUnsubscribed(event)
            else -> {}
          }
        }
      }
      try {
        if (LK_SERVER_URL.isEmpty() || LK_TOKEN.isEmpty()) {
          Log.e(TAG, "Server URL and token must be set")
          return@launch
        }
        room.connect(LK_SERVER_URL, LK_TOKEN)
        Log.i(TAG, "Connected");
      } catch (e: Exception) {
        Log.e(TAG, "Failed to connect to room", e)
      }
    }
  }

  private fun onTrackSubscribed(event: RoomEvent.TrackSubscribed) {
    val track = event.track
    if (track !is VideoTrack) return
    if (videoTrackSid != null) {
      Log.w(TAG, "Already subscribed to video track")
      return
    }
    Log.i(TAG, "Subscribed to video track")
    videoTrackSid = track.sid
    track.addRenderer(renderer)
    renderer.visibility = View.VISIBLE
  }

  private fun onTrackUnsubscribed(event: RoomEvent.TrackUnsubscribed) {
    val track = event.track
    if (track.sid != videoTrackSid || track !is VideoTrack) return
    Log.i(TAG, "Unsubscribed from video track")
    videoTrackSid = null
    renderer.visibility = View.GONE
  }
}
