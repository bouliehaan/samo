package app.samo.android.audio

import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Durable per-item playback journal. Serves two jobs from one file:
 *
 *  1. PENDING WRITES — a write is journaled (`unsent=true`) before the network
 *     attempt and marked sent on ack, so a hard process-kill mid-write replays
 *     on next launch (the in-flight retry thread dies with the process).
 *
 *  2. RESUME CACHE — entries are NOT deleted on ack, only flagged sent, so the
 *     latest known position per item survives. On a flaky LAN the live server
 *     read for resume can transiently fail; the client falls back to this local
 *     value instead of restarting the book at 0 (and then overwriting the good
 *     server position with 0). This is the "remember where I was, locally" half.
 *
 * One entry per (kind,targetId), latest-wins. Bounded to [MAX_ENTRIES] (oldest
 * SENT entries evicted first; unsent entries are never dropped). Written
 * atomically (temp + rename).
 *
 * NOT thread-safe by design — every method runs on [SamoProgressSync]'s single
 * write thread, which serializes writes, replay, and resume reads.
 */
internal class SamoProgressJournal(private val file: File) {
    private val entries = LinkedHashMap<String, PendingWrite>()
    private var loaded = false

    data class PendingWrite(
        val serverUrl: String,
        val bearer: String,
        val kind: String,
        val targetId: String,
        val progressSeconds: Long,
        val completed: Boolean?,
        val touchLastPlayedAt: Boolean,
        val touchLastPositionAt: Boolean,
        val incrementPlayCount: Boolean,
        val updatedAtMs: Long,
        /** false once the server has acked this position (kept for resume). */
        val unsent: Boolean = true,
    ) {
        val key: String get() = "$kind:$targetId"
    }

    fun upsert(entry: PendingWrite) {
        ensureLoaded()
        entries[entry.key] = entry.copy(unsent = true)
        evictIfNeeded()
        persist()
    }

    /** Mark the latest write for an item acked — keep it as the resume value. */
    fun markSent(kind: String, targetId: String) {
        ensureLoaded()
        val key = "$kind:$targetId"
        val existing = entries[key] ?: return
        if (existing.unsent) {
            entries[key] = existing.copy(unsent = false)
            persist()
        }
    }

    /** Writes still awaiting a server ack — replayed on startup. */
    fun pending(): List<PendingWrite> {
        ensureLoaded()
        return entries.values.filter { it.unsent }
    }

    /** Latest known position for an item (sent or not), for resume fallback. */
    fun resumeFor(kind: String, targetId: String): PendingWrite? {
        ensureLoaded()
        return entries["$kind:$targetId"]
    }

    private fun evictIfNeeded() {
        if (entries.size <= MAX_ENTRIES) return
        // Evict oldest SENT entries first; never drop an unsent (pending) write.
        val evictable = entries.values
            .filter { !it.unsent }
            .sortedBy { it.updatedAtMs }
        var toRemove = entries.size - MAX_ENTRIES
        for (entry in evictable) {
            if (toRemove <= 0) break
            entries.remove(entry.key)
            toRemove--
        }
    }

    private fun ensureLoaded() {
        if (loaded) return
        loaded = true
        runCatching {
            if (!file.exists()) return@runCatching
            val text = file.readText()
            if (text.isBlank()) return@runCatching
            val array = JSONArray(text)
            for (i in 0 until array.length()) {
                val o = array.getJSONObject(i)
                val entry = PendingWrite(
                    serverUrl = o.getString("serverUrl"),
                    bearer = o.getString("bearer"),
                    kind = o.getString("kind"),
                    targetId = o.getString("targetId"),
                    progressSeconds = o.getLong("progressSeconds"),
                    completed =
                        if (o.has("completed") && !o.isNull("completed")) {
                            o.getBoolean("completed")
                        } else {
                            null
                        },
                    touchLastPlayedAt = o.optBoolean("touchLastPlayedAt", false),
                    touchLastPositionAt = o.optBoolean("touchLastPositionAt", false),
                    incrementPlayCount = o.optBoolean("incrementPlayCount", false),
                    updatedAtMs = o.optLong("updatedAtMs", 0L),
                    // Pre-flag-format entries were all genuinely pending.
                    unsent = o.optBoolean("unsent", true),
                )
                entries[entry.key] = entry
            }
        }.onFailure { Log.w(TAG, "Failed to load progress journal", it) }
    }

    private fun persist() {
        runCatching {
            val array = JSONArray()
            for (entry in entries.values) {
                val o = JSONObject()
                o.put("serverUrl", entry.serverUrl)
                o.put("bearer", entry.bearer)
                o.put("kind", entry.kind)
                o.put("targetId", entry.targetId)
                o.put("progressSeconds", entry.progressSeconds)
                if (entry.completed != null) o.put("completed", entry.completed)
                if (entry.touchLastPlayedAt) o.put("touchLastPlayedAt", true)
                if (entry.touchLastPositionAt) o.put("touchLastPositionAt", true)
                if (entry.incrementPlayCount) o.put("incrementPlayCount", true)
                o.put("updatedAtMs", entry.updatedAtMs)
                o.put("unsent", entry.unsent)
                array.put(o)
            }
            val payload = array.toString()
            val tmp = File(file.parentFile, "${file.name}.tmp")
            tmp.writeText(payload)
            // POSIX rename is atomic on Android's fs and replaces an existing
            // dest; fall back to a direct write if the platform refuses.
            if (!tmp.renameTo(file)) {
                file.writeText(payload)
                tmp.delete()
            }
        }.onFailure { Log.w(TAG, "Failed to persist progress journal", it) }
    }

    companion object {
        private const val TAG = "SamoProgressJournal"
        private const val MAX_ENTRIES = 256
    }
}
