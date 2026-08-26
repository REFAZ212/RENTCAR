package com.example.mobile

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileInputStream
import java.io.OutputStream

class MainActivity : FlutterActivity() {
  private val CHANNEL = "com.udinrentcar.media_store"

  override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
    super.configureFlutterEngine(flutterEngine)
    MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
      when (call.method) {
        "saveImageToGallery" -> saveImageToGallery(call, result)
        "saveVideoToGallery" -> saveVideoToGallery(call, result)
        else -> result.notImplemented()
      }
    }
  }

  private fun saveImageToGallery(call: MethodCall, result: MethodChannel.Result) {
    val filePath = call.argument<String>("filePath")
    val relativePath = call.argument<String>("relativePath") ?: "Pictures/UDIN RENTCAR"

    if (filePath == null || filePath.isEmpty()) {
      result.error("INVALID_ARGUMENT", "File path is null or empty", null)
      return
    }

    val file = File(filePath)
    if (!file.exists()) {
      result.error("FILE_NOT_FOUND", "File does not exist: $filePath", null)
      return
    }

    try {
      val savedUri = saveToMediaStore(
        file = file,
        relativePath = relativePath,
        mimeType = "image/jpeg",
        isVideo = false
      )
      result.success(savedUri != null)
    } catch (e: Exception) {
      result.error("SAVE_FAILED", "Failed to save image: ${e.message}", null)
    }
  }

  private fun saveVideoToGallery(call: MethodCall, result: MethodChannel.Result) {
    val filePath = call.argument<String>("filePath")
    val relativePath = call.argument<String>("relativePath") ?: "Movies/UDIN RENTCAR"

    if (filePath == null || filePath.isEmpty()) {
      result.error("INVALID_ARGUMENT", "File path is null or empty", null)
      return
    }

    val file = File(filePath)
    if (!file.exists()) {
      result.error("FILE_NOT_FOUND", "File does not exist: $filePath", null)
      return
    }

    try {
      val savedUri = saveToMediaStore(
        file = file,
        relativePath = relativePath,
        mimeType = "video/mp4",
        isVideo = true
      )
      result.success(savedUri != null)
    } catch (e: Exception) {
      result.error("SAVE_FAILED", "Failed to save video: ${e.message}", null)
    }
  }

  private fun saveToMediaStore(
    file: File,
    relativePath: String,
    mimeType: String,
    isVideo: Boolean
  ): Uri? {
    val resolver = contentResolver

    val contentValues = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, file.name)
      put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
        put(MediaStore.MediaColumns.IS_PENDING, 1)
      }
    }

    val collection = if (isVideo) {
      MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    } else {
      MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    }

    val uri = resolver.insert(collection, contentValues) ?: return null

    try {
      resolver.openOutputStream(uri)?.use { outputStream ->
        FileInputStream(file).use { inputStream ->
          inputStream.copyTo(outputStream)
        }
      }
    } catch (e: Exception) {
      resolver.delete(uri, null, null)
      throw e
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      contentValues.clear()
      contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
      resolver.update(uri, contentValues, null, null)
    }

    return uri
  }
}
