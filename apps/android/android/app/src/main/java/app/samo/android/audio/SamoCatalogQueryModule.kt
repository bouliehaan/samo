package app.samo.android.audio

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.util.concurrent.Executors

/**
 * The JS-facing read API for the Kotlin-owned catalog mirror. Every method is
 * a thin promise wrapper over [SamoCatalogDb]: the query runs on this module's
 * background executor, so the JS thread never touches SQLite (the old
 * expo-sqlite `getAllSync` calls ran the same SELECTs synchronously ON the JS
 * thread — up to 250ms per statement when a sync held the write lock; that
 * whole stall class ends here).
 *
 * Results are raw `payload` JSON strings from the mirror rows; hydration stays
 * in JS (`services/catalog/catalog-reads.ts`) through the same core mappers as
 * before — Kotlin adds no mapping logic.
 */
class SamoCatalogQueryModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    // Single lane: individual queries are sub-millisecond-to-few-ms; ordering
    // them keeps the reader connection contention-free.
    private val executor = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "SamoCatalogQuery").apply { isDaemon = true }
    }

    override fun getName(): String = "SamoCatalogQuery"

    override fun invalidate() {
        executor.shutdown()
        super.invalidate()
    }

    private fun run(promise: Promise, block: () -> Any?) {
        try {
            executor.execute {
                try {
                    promise.resolve(block())
                } catch (error: Throwable) {
                    promise.reject("SamoCatalogQueryError", error)
                }
            }
        } catch (error: Throwable) {
            // Executor rejected (module invalidated mid-call) — degrade like
            // an empty mirror rather than crashing the caller.
            promise.reject("SamoCatalogQueryError", error)
        }
    }

    private fun stringArray(values: List<String>) =
        Arguments.createArray().apply { values.forEach { pushString(it) } }

    @ReactMethod
    fun getItemsByType(sourceId: String, type: String, options: ReadableMap?, promise: Promise) {
        val sort = options?.takeIf { it.hasKey("sort") }?.getString("sort")
        val direction = options?.takeIf { it.hasKey("direction") }?.getString("direction")
        val limit = options?.takeIf { it.hasKey("limit") }?.getInt("limit") ?: -1
        val offset = options?.takeIf { it.hasKey("offset") }?.getInt("offset") ?: 0
        run(promise) {
            stringArray(
                SamoCatalogDb.queryItemsByType(
                    reactContext, sourceId, type, sort, direction, limit, offset,
                ),
            )
        }
    }

    @ReactMethod
    fun getItemById(sourceId: String, type: String, id: String, promise: Promise) {
        run(promise) { SamoCatalogDb.queryItemById(reactContext, sourceId, type, id) }
    }

    @ReactMethod
    fun getDetail(sourceId: String, cacheKey: String, promise: Promise) {
        run(promise) { SamoCatalogDb.queryDetail(reactContext, sourceId, cacheKey) }
    }

    @ReactMethod
    fun getTracks(
        sourceId: String,
        containerType: String,
        containerId: String,
        limit: Double,
        promise: Promise,
    ) {
        run(promise) {
            stringArray(
                SamoCatalogDb.queryTracks(
                    reactContext, sourceId, containerType, containerId, limit.toInt(),
                ),
            )
        }
    }

    @ReactMethod
    fun search(query: String, sourceId: String?, limit: Double, promise: Promise) {
        run(promise) {
            Arguments.createArray().apply {
                SamoCatalogDb.querySearch(reactContext, query, sourceId, limit.toInt())
                    .forEach { hit ->
                        pushMap(
                            Arguments.createMap().apply {
                                putString("type", hit.type)
                                putString("payload", hit.payload)
                            },
                        )
                    }
            }
        }
    }

    @ReactMethod
    fun getSyncStates(promise: Promise) {
        run(promise) {
            Arguments.createArray().apply {
                SamoCatalogDb.querySyncStates(reactContext).forEach { row ->
                    pushMap(
                        Arguments.createMap().apply {
                            putString("sourceId", row.sourceId)
                            putString("status", row.status)
                            row.lastSyncedAt?.let { putDouble("lastSyncedAt", it.toDouble()) }
                            row.lastAttemptAt?.let { putDouble("lastAttemptAt", it.toDouble()) }
                            row.error?.let { putString("error", it) }
                            putDouble("itemCount", row.itemCount.toDouble())
                            putDouble("trackCount", row.trackCount.toDouble())
                            putDouble("detailCount", row.detailCount.toDouble())
                            putDouble("updatedAt", row.updatedAt.toDouble())
                        },
                    )
                }
            }
        }
    }
}
