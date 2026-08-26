import 'package:flutter/services.dart';

class MediaStoreService {
  static const MethodChannel _channel = MethodChannel('com.udinrentcar.media_store');

  /// Save image file to MediaStore (Gallery)
  /// Returns true if successful
  static Future<bool> saveImageToGallery({
    required String filePath,
    String relativePath = 'Pictures/UDIN RENTCAR',
  }) async {
    try {
      final result = await _channel.invokeMethod('saveImageToGallery', {
        'filePath': filePath,
        'relativePath': relativePath,
      });
      return result == true;
    } on PlatformException catch (_) {
      return false;
    }
  }

  /// Save video file to MediaStore (Gallery)
  /// Returns true if successful
  static Future<bool> saveVideoToGallery({
    required String filePath,
    String relativePath = 'Movies/UDIN RENTCAR',
  }) async {
    try {
      final result = await _channel.invokeMethod('saveVideoToGallery', {
        'filePath': filePath,
        'relativePath': relativePath,
      });
      return result == true;
    } on PlatformException catch (_) {
      return false;
    }
  }
}