import 'inspection_photo_model.dart';

class InspectionVideo {
  final String id;
  final String inspectionId;
  final String filePath;
  final DateTime timestamp;
  final Duration duration;
  final MediaUploadStatus uploadStatus;
  final double? uploadProgress;
  final double? latitude;
  final double? longitude;
  final double? accuracy;
  final String? timezone;

  const InspectionVideo({
    required this.id,
    required this.inspectionId,
    required this.filePath,
    required this.timestamp,
    this.duration = Duration.zero,
    this.uploadStatus = MediaUploadStatus.local,
    this.uploadProgress,
    this.latitude,
    this.longitude,
    this.accuracy,
    this.timezone,
  });

  bool get isUploaded => uploadStatus == MediaUploadStatus.uploaded;
  bool get isLocal => uploadStatus == MediaUploadStatus.local;
  bool get isFailed => uploadStatus == MediaUploadStatus.failed;

  String get durationLabel {
    final m = duration.inMinutes;
    final s = duration.inSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  InspectionVideo copyWith({
    String? id,
    String? inspectionId,
    String? filePath,
    DateTime? timestamp,
    Duration? duration,
    MediaUploadStatus? uploadStatus,
    double? uploadProgress,
    double? latitude,
    double? longitude,
    double? accuracy,
    String? timezone,
  }) {
    return InspectionVideo(
      id: id ?? this.id,
      inspectionId: inspectionId ?? this.inspectionId,
      filePath: filePath ?? this.filePath,
      timestamp: timestamp ?? this.timestamp,
      duration: duration ?? this.duration,
      uploadStatus: uploadStatus ?? this.uploadStatus,
      uploadProgress: uploadProgress ?? this.uploadProgress,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracy: accuracy ?? this.accuracy,
      timezone: timezone ?? this.timezone,
    );
  }

  factory InspectionVideo.fromJson(Map<String, dynamic> json) {
    return InspectionVideo(
      id: json['id'] ?? '',
      inspectionId: json['inspection_id'] ?? '',
      filePath: json['file_path'] ?? '',
      timestamp: DateTime.parse(
        json['timestamp'] ?? DateTime.now().toIso8601String(),
      ),
      duration: Duration(seconds: json['duration_seconds'] ?? 0),
      uploadStatus: MediaUploadStatus.values.firstWhere(
        (e) => e.name == json['upload_status'],
        orElse: () => MediaUploadStatus.local,
      ),
      uploadProgress: json['upload_progress']?.toDouble(),
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      accuracy: json['accuracy']?.toDouble(),
      timezone: json['timezone'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'inspection_id': inspectionId,
      'file_path': filePath,
      'timestamp': timestamp.toIso8601String(),
      'duration_seconds': duration.inSeconds,
      'upload_status': uploadStatus.name,
      'upload_progress': uploadProgress,
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'timezone': timezone,
    };
  }
}
