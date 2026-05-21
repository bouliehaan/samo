package app.samo.android.audio

import android.media.AudioDeviceInfo
import android.media.AudioMixerAttributes
import androidx.media3.exoplayer.audio.AudioSink

internal data class SamoAudioSourceSnapshot(
  val artworkUrl: String?,
  val id: String,
  val source: String?,
  val subtitle: String?,
  val title: String
)

internal data class SamoCastSource(
  val album: String?,
  val artworkUrl: String?,
  val durationMs: Long?,
  val hasHttpHeaders: Boolean,
  val id: String,
  val isLive: Boolean,
  val mimeType: String?,
  val subtitle: String?,
  val title: String,
  val url: String
)

internal data class SamoAudioSourceQuality(
  val bitDepth: Int?,
  val channelCount: Int?,
  val container: String?,
  val losslessRequired: Boolean,
  val sampleRate: Int?,
  val serverTranscodeRequested: Boolean
)

internal data class SamoBitPerfectTruth(
  val activeClaim: String,
  val directBitstreamSupported: Boolean = false,
  val directOffloadGaplessSupported: Boolean = false,
  val directOffloadSupported: Boolean = false,
  val directPcmSupported: Boolean = false,
  val evidence: List<String>,
  val offloadedPlaybackActive: Boolean = false,
  val sourceBitDepth: Int? = null,
  val sourceChannelCount: Int? = null,
  val sourceSampleRate: Int? = null,
  val usbBitPerfectMixerRequested: Boolean = false,
  val usbBitPerfectMixerSupported: Boolean = false
) {
  companion object {
    fun unknown(): SamoBitPerfectTruth {
      return SamoBitPerfectTruth(
        activeClaim = "unknown",
        evidence = listOf("No active Android playback route is being evaluated.")
      )
    }
  }
}

internal data class SamoSupportedMixerAttributes(
  val device: AudioDeviceInfo,
  val mixerAttributes: AudioMixerAttributes
)
