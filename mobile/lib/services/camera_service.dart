import 'package:camera/camera.dart';
import 'package:permission_handler/permission_handler.dart' as ph;

class CameraService {
  CameraService._();

  static Future<bool> ensureCameraPermission() async {
    final status = await ph.Permission.camera.request();
    if (status.isGranted) return true;

    // Permission ditolak permanen
    if (status.isPermanentlyDenied) {
      await ph.openAppSettings();
      return await ph.Permission.camera.isGranted;
    }
    return false;
  }

  static Future<bool> ensureMicrophonePermission() async {
    final status = await ph.Permission.microphone.request();
    return status.isGranted;
  }

  static Future<List<CameraDescription>> getAvailableCameras() async {
    return await availableCameras();
  }

  static CameraDescription selectBackCamera(List<CameraDescription> cameras) {
    for (final c in cameras) {
      if (c.lensDirection == CameraLensDirection.back) return c;
    }
    return cameras.first;
  }

  static CameraDescription selectFrontCamera(List<CameraDescription> cameras) {
    for (final c in cameras) {
      if (c.lensDirection == CameraLensDirection.front) return c;
    }
    return cameras.first;
  }
}
