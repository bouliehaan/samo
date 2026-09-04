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

/**
 * The format the player is ACTUALLY decoding, read off the selected audio track
 * once the stream is open.
 *
 * Distinct from [SamoAudioSourceQuality], which is what the catalog says the
 * file on the server is. The two agree on a LAN stream and on a downloaded
 * file; they diverge the moment anything re-encodes the audio in between, and
 * only this one is evidence.
 *
 * `bitrate` is null far more often than not — Ogg/Opus declares no bitrate in
 * its headers — so it is reported when present and never inferred.
 */
internal data class SamoDecodedAudioFormat(
  val bitrate: Int?,
  val channelCount: Int?,
  /** Decoder input mime, e.g. `audio/opus`. */
  val codec: String?,
  val sampleRate: Int?
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
