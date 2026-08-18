enum PhotoCategory {
  front,
  rear,
  leftSide,
  rightSide,
  roof,
  interior,
  dashboard,
  trunk,
  engine,
  tire,
  damage,
  completeness,
  odometer,
  fuel,
  other,
}

enum MediaUploadStatus { local, uploading, uploaded, failed }

class InspectionPhoto {
  final String id;
  final String inspectionId;
  final PhotoCategory category;
  final String filePath;
  final DateTime timestamp;
  final MediaUploadStatus uploadStatus;
  final double? uploadProgress;
  final double? latitude;
  final double? longitude;
  final double? accuracy;
  final String? timezone;
  final String? address;

  const InspectionPhoto({
    required this.id,
    required this.inspectionId,
    required this.category,
    required this.filePath,
    required this.timestamp,
    this.uploadStatus = MediaUploadStatus.local,
    this.uploadProgress,
    this.latitude,
    this.longitude,
    this.accuracy,
    this.timezone,
    this.address,
  });

  bool get isUploaded => uploadStatus == MediaUploadStatus.uploaded;
  bool get isLocal => uploadStatus == MediaUploadStatus.local;
  bool get isFailed => uploadStatus == MediaUploadStatus.failed;
  bool get isUploading => uploadStatus == MediaUploadStatus.uploading;

  String get categoryLabel {
    switch (category) {
      case PhotoCategory.front:
        return 'Depan';
      case PhotoCategory.rear:
        return 'Belakang';
      case PhotoCategory.leftSide:
        return 'Sisi Kiri';
      case PhotoCategory.rightSide:
        return 'Sisi Kanan';
      case PhotoCategory.roof:
        return 'Atap';
      case PhotoCategory.interior:
        return 'Interior';
      case PhotoCategory.dashboard:
        return 'Dashboard';
      case PhotoCategory.trunk:
        return 'Bagasi';
      case PhotoCategory.engine:
        return 'Mesin';
      case PhotoCategory.tire:
        return 'Ban';
      case PhotoCategory.damage:
        return 'Kerusakan';
      case PhotoCategory.completeness:
        return 'Kelengkapan';
      case PhotoCategory.odometer:
        return 'Odometer';
      case PhotoCategory.fuel:
        return 'Bensin';
      case PhotoCategory.other:
        return 'Lainnya';
    }
  }

  InspectionPhoto copyWith({
    String? id,
    String? inspectionId,
    PhotoCategory? category,
    String? filePath,
    DateTime? timestamp,
    MediaUploadStatus? uploadStatus,
    double? uploadProgress,
    double? latitude,
    double? longitude,
    double? accuracy,
    String? timezone,
    String? address,
  }) {
    return InspectionPhoto(
      id: id ?? this.id,
      inspectionId: inspectionId ?? this.inspectionId,
      category: category ?? this.category,
      filePath: filePath ?? this.filePath,
      timestamp: timestamp ?? this.timestamp,
      uploadStatus: uploadStatus ?? this.uploadStatus,
      uploadProgress: uploadProgress ?? this.uploadProgress,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracy: accuracy ?? this.accuracy,
      timezone: timezone ?? this.timezone,
      address: address ?? this.address,
    );
  }

  factory InspectionPhoto.fromJson(Map<String, dynamic> json) {
    return InspectionPhoto(
      id: json['id'] ?? '',
      inspectionId: json['inspection_id'] ?? '',
      category: PhotoCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => PhotoCategory.other,
      ),
      filePath: json['file_path'] ?? '',
      timestamp: DateTime.parse(
        json['timestamp'] ?? DateTime.now().toIso8601String(),
      ),
      uploadStatus: MediaUploadStatus.values.firstWhere(
        (e) => e.name == json['upload_status'],
        orElse: () => MediaUploadStatus.local,
      ),
      uploadProgress: json['upload_progress']?.toDouble(),
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      accuracy: json['accuracy']?.toDouble(),
      timezone: json['timezone'],
      address: json['address'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'inspection_id': inspectionId,
      'category': category.name,
      'file_path': filePath,
      'timestamp': timestamp.toIso8601String(),
      'upload_status': uploadStatus.name,
      'upload_progress': uploadProgress,
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'timezone': timezone,
      'address': address,
    };
  }
}
