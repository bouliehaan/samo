package app.samo.android.audio

import android.content.Context
import com.google.android.gms.cast.CastMediaControlIntent
import com.google.android.gms.cast.framework.CastOptions
import com.google.android.gms.cast.framework.OptionsProvider
import com.google.android.gms.cast.framework.SessionProvider
import app.samo.android.BuildConfig

class SamoCastOptionsProvider : OptionsProvider {
  override fun getCastOptions(context: Context): CastOptions {
    val customReceiverId = BuildConfig.CAST_RECEIVER_APPLICATION_ID.trim()
    val receiverApplicationId =
      customReceiverId.ifEmpty {
        CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID
      }

    return CastOptions.Builder()
      .setReceiverApplicationId(receiverApplicationId)
      .build()
  }

  override fun getAdditionalSessionProviders(context: Context): List<SessionProvider>? {
    return null
  }
}
