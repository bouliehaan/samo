package app.samo.android.audio

import android.content.ContentResolver
import android.net.Uri
import android.provider.DocumentsContract
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.OutputStream
import java.util.concurrent.Executors

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

    override fun getName(): String = "SamoFileSystem"

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
}
