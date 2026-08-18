import 'gps_location.dart';

class PhotoCaptureResult {
  final String id;
  final String inspectionId;
  final String photoPath;
  final GpsLocation gps;
  final String capturedAt;
  final String timezone;
  final String category;

  const PhotoCaptureResult({
    required this.id,
    required this.inspectionId,
    required this.photoPath,
    required this.gps,
    required this.capturedAt,
    required this.timezone,
    this.category = 'main',
  });

  Map<String, dynamic> toJson() {
    return {
      'photoId': id,
      'inspectionId': inspectionId,
      'photoPath': photoPath,
      'category': category,
      'gps': gps.toJson(),
      'capturedAt': capturedAt,
      'timezone': timezone,
    };
  }

  factory PhotoCaptureResult.fromJson(Map<String, dynamic> json) {
    return PhotoCaptureResult(
      id: json['photoId'] ?? '',
      inspectionId: json['inspectionId'] ?? '',
      photoPath: json['photoPath'] ?? '',
      gps: GpsLocation.fromJson(json['gps'] ?? {}),
      capturedAt: json['capturedAt'] ?? '',
      timezone: json['timezone'] ?? 'Asia/Jakarta',
      category: json['category'] ?? 'main',
    );
  }
}

class VideoCaptureResult {
  final String id;
  final String inspectionId;
  final String videoPath;
  final GpsLocation gps;
  final String recordedAt;
  final String timezone;
  final Duration duration;

  const VideoCaptureResult({
    required this.id,
    required this.inspectionId,
    required this.videoPath,
    required this.gps,
    required this.recordedAt,
    required this.timezone,
    required this.duration,
  });

  Map<String, dynamic> toJson() {
    return {
      'videoId': id,
      'inspectionId': inspectionId,
      'videoPath': videoPath,
      'gps': gps.toJson(),
      'recordedAt': recordedAt,
      'timezone': timezone,
      'duration': duration.inSeconds,
    };
  }

  factory VideoCaptureResult.fromJson(Map<String, dynamic> json) {
    return VideoCaptureResult(
      id: json['videoId'] ?? '',
      inspectionId: json['inspectionId'] ?? '',
      videoPath: json['videoPath'] ?? '',
      gps: GpsLocation.fromJson(json['gps'] ?? {}),
      recordedAt: json['recordedAt'] ?? '',
      timezone: json['timezone'] ?? 'Asia/Jakarta',
      duration: Duration(seconds: json['duration'] ?? 0),
    );
  }
}
