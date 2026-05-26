package app.samo.android.audio

import android.content.ContentResolver
import android.database.Cursor
import android.net.Uri
import android.provider.DocumentsContract
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.CancellationException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max
import kotlin.math.min

/**
 * Streams a file:// source into a SAF content:// destination chunk-by-chunk
 * using ContentResolver under the hood. Replaces the JS-side base64 round
 * trip we'd otherwise have to use for SD card writes, which couldn't handle
 * audiobook-sized files (the entire payload had to fit in memory as a single
 * base64 string).
 *
 * This module is intentionally minimal: one method, one purpose. If we ever
 * need other native file operations they can land here, but the goal is to
 * keep this surface tiny so it's easy to audit.
 */
class SamoFileSystemModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    // Run copies on a dedicated single-thread pool so concurrent SAF copies
    // don't fight for the same buffer, and so the JS thread is never blocked
    // waiting on disk I/O.
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val activeDownloadCancels = ConcurrentHashMap<String, AtomicBoolean>()
    @Volatile private var downloadThrottleBytesPerSecond: Long = 0L

    override fun getName(): String = "SamoFileSystem"

    @ReactMethod
    fun setDownloadThrottle(bytesPerSecond: Double, promise: Promise) {
        downloadThrottleBytesPerSecond = max(0L, bytesPerSecond.toLong())
        promise.resolve(null)
    }

    @ReactMethod
    fun cancelNativeDownload(downloadId: String, promise: Promise) {
        activeDownloadCancels[downloadId]?.set(true)
        promise.resolve(null)
    }

    @ReactMethod
    fun downloadFile(
        downloadId: String,
        sourceUrl: String,
        destinationFileUri: String,
        headers: ReadableMap?,
        promise: Promise,
    ) {
        val cancelFlag = AtomicBoolean(false)
        if (activeDownloadCancels.putIfAbsent(downloadId, cancelFlag) != null) {
            promise.reject("SAMO_DOWNLOAD_ERROR", "Download is already running: $downloadId")
            return
        }

        SamoDownloadService.begin(reactContext)
        ioExecutor.execute {
            var connection: HttpURLConnection? = null
            var tempFile: File? = null
            try {
                val destinationFile = fileFromUri(destinationFileUri)
                destinationFile.parentFile?.mkdirs()
                val partialFile = File(destinationFile.path + ".part")
                tempFile = partialFile
                if (partialFile.exists()) {
                    partialFile.delete()
                }

                connection = (URL(sourceUrl).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 15_000
                    readTimeout = 30_000
                    requestMethod = "GET"
                    headers?.let { readable ->
                        val iterator = readable.keySetIterator()
                        while (iterator.hasNextKey()) {
                            val key = iterator.nextKey()
                            val value = readable.getString(key)
                            if (!value.isNullOrBlank()) {
                                setRequestProperty(key, value)
                            }
                        }
                    }
                }

                val responseCode = connection.responseCode
                if (responseCode !in 200..299) {
                    throw IllegalStateException("Download failed with HTTP $responseCode")
                }

                val totalBytes = connection.contentLengthLong.takeIf { it > 0 } ?: -1L
                var writtenBytes = 0L
                var lastProgressBytes = 0L
                var lastProgressAt = System.currentTimeMillis()
                val startedAt = lastProgressAt
                connection.inputStream.use { input ->
                    FileOutputStream(partialFile).use { output ->
                        val buffer = ByteArray(64 * 1024)
                        while (true) {
                            if (cancelFlag.get()) {
                                throw CancellationException("Download canceled")
                            }
                            val read = input.read(buffer)
                            if (read <= 0) break
                            output.write(buffer, 0, read)
                            writtenBytes += read.toLong()

                            val now = System.currentTimeMillis()
                            if (
                                writtenBytes == totalBytes ||
                                writtenBytes - lastProgressBytes >= PROGRESS_EVENT_BYTES ||
                                now - lastProgressAt >= PROGRESS_EVENT_MS
                            ) {
                                emitDownloadProgress(downloadId, writtenBytes, totalBytes)
                                lastProgressBytes = writtenBytes
                                lastProgressAt = now
                            }

                            val throttle = downloadThrottleBytesPerSecond
                            if (throttle > 0) {
                                val expectedElapsedMs = writtenBytes * 1000L / throttle
                                val actualElapsedMs = now - startedAt
                                val sleepMs = expectedElapsedMs - actualElapsedMs
                                if (sleepMs > 0) {
                                    Thread.sleep(min(sleepMs, 250L))
                                }
                            }
                        }
                        output.flush()
                    }
                }

                if (destinationFile.exists()) {
                    destinationFile.delete()
                }
                if (!partialFile.renameTo(destinationFile)) {
                    throw IllegalStateException("Could not move completed download into place")
                }

                emitDownloadProgress(downloadId, writtenBytes, totalBytes)
                val result = Arguments.createMap().apply {
                    putString("uri", Uri.fromFile(destinationFile).toString())
                    putDouble("bytesWritten", writtenBytes.toDouble())
                    putDouble("totalBytes", totalBytes.toDouble())
                }
                promise.resolve(result)
            } catch (error: CancellationException) {
                tempFile?.delete()
                promise.reject("SAMO_DOWNLOAD_CANCELED", error.message, error)
            } catch (error: Exception) {
                tempFile?.delete()
                promise.reject("SAMO_DOWNLOAD_ERROR", error.message ?: "Download failed", error)
            } finally {
                connection?.disconnect()
                activeDownloadCancels.remove(downloadId)
                SamoDownloadService.finish(reactContext)
            }
        }
    }

    @ReactMethod
    fun streamCopyToSaf(
        sourceFileUri: String,
        parentTreeUri: String,
        fileName: String,
        mimeType: String,
        promise: Promise,
    ) {
        ioExecutor.execute {
            val src =
                try {
                    File(Uri.parse(sourceFileUri).path ?: sourceFileUri.removePrefix("file://"))
                } catch (error: Exception) {
                    promise.reject("SAMO_FS_ERROR", error.message ?: "Bad source URI", error)
                    return@execute
                }

            if (!src.exists() || !src.isFile) {
                promise.reject("SAMO_FS_ERROR", "Source file does not exist: ${src.path}")
                return@execute
            }

            val resolver: ContentResolver = reactContext.contentResolver
            val treeUri =
                try {
                    Uri.parse(parentTreeUri)
                } catch (error: Exception) {
                    promise.reject("SAMO_FS_ERROR", error.message ?: "Bad tree URI", error)
                    return@execute
                }

            val docId =
                try {
                    DocumentsContract.getTreeDocumentId(treeUri)
                } catch (error: Exception) {
                    promise.reject(
                        "SAMO_FS_ERROR",
                        "Tree URI is not a SAF tree: ${error.message}",
                        error,
                    )
                    return@execute
                }
            val parentDocUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId)

            var createdUri: Uri? = null
            try {
                createdUri =
                    DocumentsContract.createDocument(
                        resolver,
                        parentDocUri,
                        if (mimeType.isBlank()) "application/octet-stream" else mimeType,
                        fileName,
                    )
                if (createdUri == null) {
                    promise.reject(
                        "SAMO_FS_ERROR",
                        "Could not create destination file in the chosen folder. Re-pick the SD card folder to refresh permissions.",
                    )
                    return@execute
                }

                FileInputStream(src).use { input ->
                    val output: OutputStream =
                        resolver.openOutputStream(createdUri, "wt")
                            ?: throw IllegalStateException(
                                "Could not open output stream for SAF URI",
                            )
                    output.use { sink ->
                        val buffer = ByteArray(64 * 1024)
                        while (true) {
                            val read = input.read(buffer)
                            if (read <= 0) break
                            sink.write(buffer, 0, read)
                        }
                        sink.flush()
                    }
                }

                promise.resolve(createdUri.toString())
            } catch (error: Exception) {
                // Best-effort cleanup of any partially-written destination so
                // the SD card doesn't accumulate half-written files.
                if (createdUri != null) {
                    try {
                        DocumentsContract.deleteDocument(resolver, createdUri)
                    } catch (_: Exception) {
                        // ignore
                    }
                }
                promise.reject("SAMO_FS_ERROR", error.message ?: "Copy failed", error)
            }
        }
    }

    @ReactMethod
    fun listDownloadAudioFiles(treeUriString: String, promise: Promise) {
        ioExecutor.execute {
            try {
                val treeUri = Uri.parse(treeUriString)
                val treeDocId = DocumentsContract.getTreeDocumentId(treeUri)
                val results = Arguments.createArray()
                collectDownloadAudioFiles(reactContext.contentResolver, treeUri, treeDocId, results)
                promise.resolve(results)
            } catch (error: Exception) {
                promise.reject("SAMO_FS_ERROR", error.message ?: "Could not list folder", error)
            }
        }
    }

    @ReactMethod
    fun readTextDocument(documentUriString: String, promise: Promise) {
        ioExecutor.execute {
            try {
                val documentUri = Uri.parse(documentUriString)
                val text =
                    reactContext.contentResolver.openInputStream(documentUri)?.use { input ->
                        input.bufferedReader().readText()
                    } ?: ""
                promise.resolve(text)
            } catch (error: Exception) {
                promise.reject("SAMO_FS_ERROR", error.message ?: "Could not read document", error)
            }
        }
    }

    @ReactMethod
    fun writeTextDocument(
        treeUriString: String,
        fileName: String,
        text: String,
        promise: Promise,
    ) {
        ioExecutor.execute {
            try {
                val resolver: ContentResolver = reactContext.contentResolver
                val treeUri = Uri.parse(treeUriString)
                val treeDocId = DocumentsContract.getTreeDocumentId(treeUri)
                val parentDocUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, treeDocId)
                val safeFileName = fileName.ifBlank { REGISTRY_SIDECAR_FILE_NAME }
                val documentUri =
                    findDirectChildDocumentUri(resolver, treeUri, treeDocId, safeFileName)
                        ?: DocumentsContract.createDocument(
                            resolver,
                            parentDocUri,
                            "application/json",
                            safeFileName,
                        )
                        ?: throw IllegalStateException(
                            "Could not create metadata file in the chosen folder.",
                        )
                val output =
                    resolver.openOutputStream(documentUri, "wt")
                        ?: throw IllegalStateException("Could not open metadata file for writing.")
                output.bufferedWriter(Charsets.UTF_8).use { writer ->
                    writer.write(text)
                    writer.flush()
                }
                promise.resolve(documentUri.toString())
            } catch (error: Exception) {
                promise.reject("SAMO_FS_ERROR", error.message ?: "Could not write document", error)
            }
        }
    }

    private fun findDirectChildDocumentUri(
        resolver: ContentResolver,
        treeUri: Uri,
        documentId: String,
        displayName: String,
    ): Uri? {
        val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId)
        val projection =
            arrayOf(
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            )
        val cursor = resolver.query(childrenUri, projection, null, null, null) ?: return null
        cursor.use {
            val idIndex =
                it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
            val nameIndex =
                it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
            while (it.moveToNext()) {
                val childId = it.getString(idIndex) ?: continue
                val name = it.getString(nameIndex) ?: continue
                if (name == displayName) {
                    return DocumentsContract.buildDocumentUriUsingTree(treeUri, childId)
                }
            }
        }
        return null
    }

    private fun collectDownloadAudioFiles(
        resolver: ContentResolver,
        treeUri: Uri,
        documentId: String,
        out: com.facebook.react.bridge.WritableArray,
    ) {
        val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId)
        val projection =
            arrayOf(
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE,
            )
        val cursor = resolver.query(childrenUri, projection, null, null, null) ?: return
        cursor.use {
            val idIndex =
                it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
            val nameIndex =
                it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
            val mimeIndex =
                it.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE)
            while (it.moveToNext()) {
                val childId = it.getString(idIndex) ?: continue
                val name = it.getString(nameIndex) ?: continue
                val mimeType = it.getString(mimeIndex) ?: ""
                if (mimeType == DocumentsContract.Document.MIME_TYPE_DIR) {
                    collectDownloadAudioFiles(resolver, treeUri, childId, out)
                    continue
                }
                if (
                    name.endsWith(".audio", ignoreCase = true) ||
                        name == REGISTRY_SIDECAR_FILE_NAME
                ) {
                    val map = Arguments.createMap()
                    map.putString("uri", DocumentsContract.buildDocumentUriUsingTree(treeUri, childId).toString())
                    map.putString("name", name)
                    out.pushMap(map)
                }
            }
        }
    }

    private fun fileFromUri(uri: String): File {
        return try {
            File(Uri.parse(uri).path ?: uri.removePrefix("file://"))
        } catch (_: Exception) {
            File(uri.removePrefix("file://"))
        }
    }

    private fun emitDownloadProgress(downloadId: String, bytesWritten: Long, totalBytes: Long) {
        val event = Arguments.createMap().apply {
            putString("id", downloadId)
            putDouble("bytesWritten", bytesWritten.toDouble())
            putDouble("totalBytes", totalBytes.toDouble())
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("SamoFileDownloadProgress", event)
    }

    companion object {
        private const val PROGRESS_EVENT_BYTES = 512L * 1024L
        private const val PROGRESS_EVENT_MS = 750L
        private const val REGISTRY_SIDECAR_FILE_NAME = "samo-download-registry.json"
    }
}
