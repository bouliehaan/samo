package app.samo.android.audio

import android.content.Context
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.HttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import java.io.File

/**
 * Disk cache for on-demand HTTP streams (podcasts, audiobooks, music). Live
 * radio is excluded — caching an infinite stream would fill storage.
 *
 * Disabled in [SamoPlaybackService] until cache keys and Range seeks are
 * validated for authenticated Samo stream URLs.
 */
@UnstableApi
internal object SamoStreamCache {
  private const val CACHE_BYTES = 256L * 1024L * 1024L

  @Volatile
  private var cache: SimpleCache? = null

  private fun getCache(context: Context): SimpleCache {
    return cache ?: synchronized(this) {
      cache ?: run {
        val cacheDir = File(context.cacheDir, "samo-stream-cache")
        val evictor = LeastRecentlyUsedCacheEvictor(CACHE_BYTES)
        SimpleCache(cacheDir, evictor, StandaloneDatabaseProvider(context)).also {
          cache = it
        }
      }
    }
  }

  fun buildDataSourceFactory(
    context: Context,
    httpDataSourceFactory: HttpDataSource.Factory,
    enableDiskCache: Boolean,
  ): DataSource.Factory {
    val upstream = DefaultDataSource.Factory(context, httpDataSourceFactory)
    if (!enableDiskCache) {
      return upstream
    }

    return CacheDataSource.Factory()
      .setCache(getCache(context))
      .setUpstreamDataSourceFactory(upstream)
      .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
  }
}
