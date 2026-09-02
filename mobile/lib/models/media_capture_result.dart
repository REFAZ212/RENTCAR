import 'gps_location.dart';

class PhotoCaptureResult {
  final String id;
  final String inspectionId;
  final String photoPath;
  final String? watermarkedPath;
  final GpsLocation gps;
  final String capturedAt;
  final String timezone;
  final String category;

  const PhotoCaptureResult({
    required this.id,
    required this.inspectionId,
    required this.photoPath,
    this.watermarkedPath,
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
      'watermarkedPath': watermarkedPath,
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
      watermarkedPath: json['watermarkedPath'],
      gps: GpsLocation.fromJson(json['gps'] ?? {}),
      capturedAt: json['capturedAt'] ?? '',
      timezone: json['timezone'] ?? 'Asia/Jakarta',
      category: json['category'] ?? 'main',
    );
  }

  PhotoCaptureResult copyWith({
    String? id,
    String? inspectionId,
    String? photoPath,
    String? watermarkedPath,
    GpsLocation? gps,
    String? capturedAt,
    String? timezone,
    String? category,
  }) {
    return PhotoCaptureResult(
      id: id ?? this.id,
      inspectionId: inspectionId ?? this.inspectionId,
      photoPath: photoPath ?? this.photoPath,
      watermarkedPath: watermarkedPath ?? this.watermarkedPath,
      gps: gps ?? this.gps,
      capturedAt: capturedAt ?? this.capturedAt,
      timezone: timezone ?? this.timezone,
      category: category ?? this.category,
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
