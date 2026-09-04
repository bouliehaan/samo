package app.samo.android.audio

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.AudioMixerAttributes
import android.media.AudioTrack
import android.os.Build
import android.media.AudioAttributes as PlatformAudioAttributes
import android.media.AudioFormat as PlatformAudioFormat
import androidx.media3.exoplayer.audio.AudioSink
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

internal object SamoBitPerfect {
  /**
   * Codec markers that mean the audio reaching the decoder has already been
   * through a lossy encoder. Matched as substrings of the decoder's input mime
   * because the same codec is spelled several ways (`audio/mp4a-latm`,
   * `audio/aac`) and because a container prefix may ride along.
   *
   * Bit-perfect is a claim about delivering the file's own samples untouched.
   * Once anything upstream has re-encoded them the claim is finished, however
   * capable the DAC is and whatever the catalog says the file was.
   */
  private val LOSSY_CODEC_MARKERS =
    listOf("mp4a", "aac", "mpeg", "mp3", "opus", "vorbis", "wma", "ac3")

  /** True when the stream actually arriving is a lossy encode. */
  fun isLossyDelivery(decodedFormat: SamoDecodedAudioFormat?): Boolean {
    val codec = decodedFormat?.codec?.trim()?.lowercase() ?: return false
    return LOSSY_CODEC_MARKERS.any { codec.contains(it) }
  }

  fun getBitPerfectTruthMap(truth: SamoBitPerfectTruth): WritableMap {
    val map = Arguments.createMap()
    val evidence = Arguments.createArray()

    truth.evidence.forEach { evidence.pushString(it) }

    map.putString("activeClaim", truth.activeClaim)
    map.putBoolean("directBitstreamSupported", truth.directBitstreamSupported)
    map.putBoolean("directOffloadGaplessSupported", truth.directOffloadGaplessSupported)
    map.putBoolean("directOffloadSupported", truth.directOffloadSupported)
    map.putBoolean("directPcmSupported", truth.directPcmSupported)
    map.putArray("evidence", evidence)
    map.putBoolean("offloadedPlaybackActive", truth.offloadedPlaybackActive)
    truth.sourceBitDepth?.let { map.putInt("sourceBitDepth", it) }
    truth.sourceChannelCount?.let { map.putInt("sourceChannelCount", it) }
    truth.sourceSampleRate?.let { map.putInt("sourceSampleRate", it) }
    map.putBoolean("usbBitPerfectMixerRequested", truth.usbBitPerfectMixerRequested)
    map.putBoolean("usbBitPerfectMixerSupported", truth.usbBitPerfectMixerSupported)

    return map
  }

  fun buildBitPerfectTruth(
    context: Context,
    audioTrackConfig: AudioSink.AudioTrackConfig?,
    quality: SamoAudioSourceQuality?,
    decodedFormat: SamoDecodedAudioFormat?,
    requestPreferredMixer: Boolean,
    service: SamoPlaybackService?,
    previousUsbMixerRequested: Boolean
  ): SamoBitPerfectTruth {
    val evidence = mutableListOf<String>()

    if (quality == null) {
      return SamoBitPerfectTruth(
        activeClaim = "unknown",
        evidence = listOf("No source quality descriptor was provided to the Android audio engine.")
      )
    }

    // A lossy arrival makes every calculation below moot, and one of them has
    // a side effect: requestBitPerfectUsbMixer reconfigures the DAC. Left
    // ungated it would configure the hardware for the catalog's 24/96 while a
    // 48 kHz lossy stream is what actually plays.
    val lossyDelivery = isLossyDelivery(decodedFormat)
    val sourceFormat = if (lossyDelivery) null else buildSourcePcmFormat(quality, decodedFormat)
    val platformAttributes = getPlatformAudioAttributes()
    val directSupport = sourceFormat?.let { getDirectPlaybackSupport(it, platformAttributes) } ?: 0
    val directOffloadSupported =
      directSupport and AudioManager.DIRECT_PLAYBACK_OFFLOAD_SUPPORTED != 0
    val directOffloadGaplessSupported =
      directSupport and AudioManager.DIRECT_PLAYBACK_OFFLOAD_GAPLESS_SUPPORTED ==
        AudioManager.DIRECT_PLAYBACK_OFFLOAD_GAPLESS_SUPPORTED
    val directBitstreamSupported =
      directSupport and AudioManager.DIRECT_PLAYBACK_BITSTREAM_SUPPORTED != 0
    val directPcmSupported = sourceFormat?.let {
      isDirectPcmPlaybackSupported(it, platformAttributes)
    } ?: false
    val usbMixerSupported = sourceFormat?.let {
      getSupportedBitPerfectUsbMixerAttributes(context, it) != null
    } ?: false
    val usbMixerRequested = if (requestPreferredMixer && sourceFormat != null && service != null) {
      requestBitPerfectUsbMixer(context, sourceFormat, platformAttributes, service)
    } else {
      previousUsbMixerRequested
    }
    val outputMatchesSource =
      !lossyDelivery &&
        audioTrackConfig != null &&
        outputConfigMatchesSource(audioTrackConfig, quality, decodedFormat)
    val offloadedPlaybackActive = audioTrackConfig?.offload == true

    if (quality.losslessRequired) {
      evidence.add("Source requested lossless/direct delivery.")
    } else {
      evidence.add("Source does not require lossless delivery.")
    }

    if (quality.serverTranscodeRequested) {
      evidence.add("Server transcode is requested; bit-perfect is impossible.")
    } else {
      evidence.add("Server transcode is not requested.")
    }

    // What the decoder is being handed, which is the only statement here made
    // about the audio rather than about the catalog row describing it.
    when {
      decodedFormat?.codec == null ->
        evidence.add("The delivered stream format has not been observed yet.")
      lossyDelivery ->
        evidence.add(
          "The stream arrived as ${decodedFormat.codec}, a lossy encode; " +
            "bit-perfect is impossible regardless of the source file."
        )
      else ->
        evidence.add("The stream arrived as ${decodedFormat.codec}, matching a lossless path.")
    }

    if (lossyDelivery) {
      evidence.add("No PCM target was negotiated: the delivered stream is lossy.")
    } else if (sourceFormat == null) {
      evidence.add("Source sample rate, bit depth, or channel count is missing; route cannot be proven.")
    } else {
      evidence.add(
        "PCM target is ${quality.bitDepth}-bit/" +
          "${decodedFormat?.sampleRate ?: quality.sampleRate} Hz/" +
          "${decodedFormat?.channelCount ?: quality.channelCount}ch."
      )
    }

    if (directPcmSupported) {
      evidence.add("Android reports direct PCM support for this source format.")
    } else {
      evidence.add("Android does not report direct PCM support for this source format.")
    }

    if (usbMixerRequested) {
      evidence.add("Android accepted a USB bit-perfect mixer request for this source format.")
    } else if (usbMixerSupported) {
      evidence.add("A USB bit-perfect mixer format is supported, but it is not active yet.")
    } else {
      evidence.add("No matching USB bit-perfect mixer route is currently available.")
    }

    if (offloadedPlaybackActive) {
      evidence.add("Media3 reports the current AudioTrack is offloaded.")
    } else {
      evidence.add("Media3 does not report active offloaded playback.")
    }

    if (outputMatchesSource) {
      evidence.add("Android AudioTrack output format matches the source quality descriptor.")
    } else if (audioTrackConfig != null) {
      evidence.add("Android AudioTrack output format does not prove a source-matched path.")
    }

    val activeClaim = when {
      !quality.losslessRequired -> "not-bit-perfect"
      quality.serverTranscodeRequested -> "not-bit-perfect"
      // Observed, not declared. Nothing in the request said a transcode would
      // happen — an edge between the server and the phone did it anyway.
      lossyDelivery -> "not-bit-perfect"
      usbMixerRequested && outputMatchesSource -> "bit-perfect-active"
      offloadedPlaybackActive && (directOffloadSupported || directOffloadGaplessSupported) ->
        "bit-perfect-active"
      else -> "unknown"
    }

    return SamoBitPerfectTruth(
      activeClaim = activeClaim,
      directBitstreamSupported = directBitstreamSupported,
      directOffloadGaplessSupported = directOffloadGaplessSupported,
      directOffloadSupported = directOffloadSupported,
      directPcmSupported = directPcmSupported,
      evidence = evidence,
      offloadedPlaybackActive = offloadedPlaybackActive,
      sourceBitDepth = quality.bitDepth,
      sourceChannelCount = quality.channelCount,
      sourceSampleRate = quality.sampleRate,
      usbBitPerfectMixerRequested = usbMixerRequested,
      usbBitPerfectMixerSupported = usbMixerSupported
    )
  }

  fun getPlatformAudioAttributes(): PlatformAudioAttributes {
    return PlatformAudioAttributes.Builder()
      .setContentType(PlatformAudioAttributes.CONTENT_TYPE_MUSIC)
      .setUsage(PlatformAudioAttributes.USAGE_MEDIA)
      .build()
  }

  @Suppress("DEPRECATION")
  fun getDirectPlaybackSupport(
    format: PlatformAudioFormat,
    attributes: PlatformAudioAttributes
  ): Int {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        AudioManager.getDirectPlaybackSupport(format, attributes)
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        if (AudioTrack.isDirectPlaybackSupported(format, attributes)) {
          AudioManager.DIRECT_PLAYBACK_BITSTREAM_SUPPORTED
        } else {
          AudioManager.DIRECT_PLAYBACK_NOT_SUPPORTED
        }
      } else {
        AudioManager.DIRECT_PLAYBACK_NOT_SUPPORTED
      }
    } catch (_: Exception) {
      AudioManager.DIRECT_PLAYBACK_NOT_SUPPORTED
    }
  }

  @Suppress("DEPRECATION")
  fun isDirectPcmPlaybackSupported(
    format: PlatformAudioFormat,
    attributes: PlatformAudioAttributes
  ): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      getDirectPlaybackSupport(format, attributes) != AudioManager.DIRECT_PLAYBACK_NOT_SUPPORTED
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      AudioTrack.isDirectPlaybackSupported(format, attributes)
    } else {
      false
    }
  }

  /**
   * The PCM target to negotiate with the output device.
   *
   * Sample rate and channel count come from the DECODER when it has told us
   * what it is decoding, and from the catalog only until then: the catalog
   * describes a file on the server, and it is the wrong thing to configure
   * hardware against whenever those two have diverged. Bit depth stays the
   * catalog's, since a compressed lossless stream does not carry one and on a
   * genuinely direct path the two agree by definition.
   *
   * [decodedFormat] is a required parameter rather than an optional one so a
   * new caller cannot quietly re-introduce the catalog-only behaviour; pass
   * null explicitly to mean "nothing observed yet".
   */
  fun buildSourcePcmFormat(
    quality: SamoAudioSourceQuality,
    decodedFormat: SamoDecodedAudioFormat?
  ): PlatformAudioFormat? {
    val bitDepth = quality.bitDepth ?: return null
    val channelCount = decodedFormat?.channelCount ?: quality.channelCount ?: return null
    val sampleRate = decodedFormat?.sampleRate ?: quality.sampleRate ?: return null
    val channelMask = getChannelMask(channelCount) ?: return null
    val encoding = getPcmEncoding(bitDepth) ?: return null

    return PlatformAudioFormat.Builder()
      .setChannelMask(channelMask)
      .setEncoding(encoding)
      .setSampleRate(sampleRate)
      .build()
  }

  fun getChannelMask(channelCount: Int): Int? {
    return when (channelCount) {
      1 -> PlatformAudioFormat.CHANNEL_OUT_MONO
      2 -> PlatformAudioFormat.CHANNEL_OUT_STEREO
      6 -> PlatformAudioFormat.CHANNEL_OUT_5POINT1
      8 -> PlatformAudioFormat.CHANNEL_OUT_7POINT1_SURROUND
      else -> null
    }
  }

  fun getPcmEncoding(bitDepth: Int): Int? {
    return when (bitDepth) {
      8 -> PlatformAudioFormat.ENCODING_PCM_8BIT
      16 -> PlatformAudioFormat.ENCODING_PCM_16BIT
      24 -> PlatformAudioFormat.ENCODING_PCM_24BIT_PACKED
      32 -> PlatformAudioFormat.ENCODING_PCM_32BIT
      else -> null
    }
  }

  fun outputConfigMatchesSource(
    audioTrackConfig: AudioSink.AudioTrackConfig,
    quality: SamoAudioSourceQuality,
    decodedFormat: SamoDecodedAudioFormat?
  ): Boolean {
    val sourceEncoding = quality.bitDepth?.let { getPcmEncoding(it) } ?: return false
    val sourceSampleRate = decodedFormat?.sampleRate ?: quality.sampleRate ?: return false
    val sourceChannelMask =
      (decodedFormat?.channelCount ?: quality.channelCount)?.let { getChannelMask(it) }
        ?: return false

    return audioTrackConfig.sampleRate == sourceSampleRate &&
      audioTrackConfig.channelConfig == sourceChannelMask &&
      audioTrackConfig.encoding == sourceEncoding
  }

  fun requestBitPerfectUsbMixer(
    context: Context,
    format: PlatformAudioFormat,
    attributes: PlatformAudioAttributes,
    service: SamoPlaybackService
  ): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return false
    }

    val supported = getSupportedBitPerfectUsbMixerAttributes(context, format) ?: return false
    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val wasSet = try {
      audioManager.setPreferredMixerAttributes(
        attributes,
        supported.device,
        supported.mixerAttributes
      )
    } catch (_: Exception) {
      false
    }

    if (wasSet) {
      service.preferredMixerDevice = supported.device
    }

    return wasSet
  }

  fun getSupportedBitPerfectUsbMixerAttributes(
    context: Context,
    format: PlatformAudioFormat
  ): SamoSupportedMixerAttributes? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return null
    }

    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val outputDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
    val usbDevices = outputDevices.filter {
      it.type == AudioDeviceInfo.TYPE_USB_DEVICE || it.type == AudioDeviceInfo.TYPE_USB_HEADSET
    }

    usbDevices.forEach { device ->
      val mixerAttributes = try {
        audioManager.getSupportedMixerAttributes(device)
      } catch (_: Exception) {
        emptyList()
      }

      mixerAttributes
        .firstOrNull { attributes ->
          val mixerFormat = attributes.format

          attributes.mixerBehavior == AudioMixerAttributes.MIXER_BEHAVIOR_BIT_PERFECT &&
            mixerFormat.sampleRate == format.sampleRate &&
            mixerFormat.encoding == format.encoding &&
            mixerFormat.channelMask == format.channelMask
        }?.let { return SamoSupportedMixerAttributes(device, it) }
    }

    return null
  }

  fun clearPreferredMixerAttributes(context: Context, service: SamoPlaybackService) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return
    }

    val device = service.preferredMixerDevice ?: return
    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    try {
      audioManager.clearPreferredMixerAttributes(getPlatformAudioAttributes(), device)
    } catch (_: Exception) {
      // Mixer preferences are opportunistic; cleanup must never make app teardown unsafe.
    }
    service.preferredMixerDevice = null
  }
}
