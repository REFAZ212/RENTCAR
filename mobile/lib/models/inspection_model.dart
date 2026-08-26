import 'inspection_item_model.dart';
import 'inspection_photo_model.dart';
import 'inspection_video_model.dart';
import 'damage_model.dart';

enum InspectionType { beforeRental, afterRental }

enum InspectionStatus { draft, inProgress, completed, syncPending, synced }

class FuelData {
  final String level;
  final double? liter;

  const FuelData({this.level = '1/2', this.liter});

  String get levelLabel {
    switch (level) {
      case 'full':
        return 'FULL';
      case '3/4':
        return '3/4';
      case '1/2':
        return '1/2';
      case '1/4':
        return '1/4';
      case 'empty':
        return 'EMPTY';
      default:
        return level;
    }
  }

  double get fillRatio {
    switch (level) {
      case 'full':
        return 1.0;
      case '3/4':
        return 0.75;
      case '1/2':
        return 0.5;
      case '1/4':
        return 0.25;
      case 'empty':
        return 0.0;
      default:
        return 0.5;
    }
  }

  FuelData copyWith({String? level, double? liter}) {
    return FuelData(
      level: level ?? this.level,
      liter: liter ?? this.liter,
    );
  }

  factory FuelData.fromJson(Map<String, dynamic> json) {
    return FuelData(
      level: json['level'] ?? '1/2',
      liter: json['liter']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {'level': level, 'liter': liter};
}

class OdometerData {
  final double? value;
  final String? photoId;

  const OdometerData({this.value, this.photoId});

  String get displayValue {
    if (value == null) return '-';
    return '${value!.toStringAsFixed(0).replaceAll(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), '.')} KM';
  }

  OdometerData copyWith({double? value, String? photoId}) {
    return OdometerData(
      value: value ?? this.value,
      photoId: photoId ?? this.photoId,
    );
  }

  factory OdometerData.fromJson(Map<String, dynamic> json) {
    return OdometerData(
      value: json['value']?.toDouble(),
      photoId: json['photo_id'],
    );
  }

  Map<String, dynamic> toJson() => {'value': value, 'photo_id': photoId};
}

class VehicleInfo {
  final String brand;
  final String type;
  final String plateNumber;
  final String? customerName;
  final String? bookingCode;
  final String? purpose;
  final DateTime? rentalStart;
  final DateTime? rentalEnd;
  final String? startTime;
  final String? endTime;
  final double? rentalRate;

  const VehicleInfo({
    required this.brand,
    required this.type,
    required this.plateNumber,
    this.customerName,
    this.bookingCode,
    this.purpose,
    this.rentalStart,
    this.rentalEnd,
    this.startTime,
    this.endTime,
    this.rentalRate,
  });

  String get rentalRateLabel {
    if (rentalRate == null) return '-';
    return 'Rp ${rentalRate!.toStringAsFixed(0).replaceAll(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), '.')}';
  }

  factory VehicleInfo.fromJson(Map<String, dynamic> json) {
    return VehicleInfo(
      brand: json['brand'] ?? '',
      type: json['type'] ?? '',
      plateNumber: json['plate_number'] ?? '',
      customerName: json['customer_name'],
      bookingCode: json['booking_code'],
      purpose: json['purpose'],
      rentalStart: json['rental_start'] != null
          ? DateTime.parse(json['rental_start'])
          : null,
      rentalEnd: json['rental_end'] != null
          ? DateTime.parse(json['rental_end'])
          : null,
      startTime: json['start_time'],
      endTime: json['end_time'],
      rentalRate: json['rental_rate']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'brand': brand,
      'type': type,
      'plate_number': plateNumber,
      'customer_name': customerName,
      'booking_code': bookingCode,
      'purpose': purpose,
      'rental_start': rentalStart?.toIso8601String(),
      'rental_end': rentalEnd?.toIso8601String(),
      'start_time': startTime,
      'end_time': endTime,
      'rental_rate': rentalRate,
    };
  }
}

class InspectionModel {
  final int id;
  final int vehicleId;
  final String vehicleName;
  final String plateNumber;
  final String? customerName;
  final int? bookingId;
  final InspectionType type;
  final InspectionStatus status;
  final DateTime date;
  final String? officerName;
  final String? location;
  final String? notes;
  final int photoCount;
  final int videoCount;
  final int damageCount;
  final Map<String, dynamic>? exteriorData;
  final Map<String, dynamic>? interiorData;
  final Map<String, dynamic>? engineData;
  final Map<String, dynamic>? completenessData;
  final Map<String, dynamic>? fuelData;

  // Extended fields for stepper
  final VehicleInfo? vehicleInfo;
  final List<InspectionItem> items;
  final List<InspectionPhoto> photos;
  final List<InspectionVideo> videos;
  final List<Damage> damages;
  final FuelData? fuelInfo;
  final OdometerData? odometerInfo;
  final int? baselineInspectionId;

  const InspectionModel({
    required this.id,
    required this.vehicleId,
    required this.vehicleName,
    required this.plateNumber,
    this.customerName,
    this.bookingId,
    required this.type,
    required this.status,
    required this.date,
    this.officerName,
    this.location,
    this.notes,
    this.photoCount = 0,
    this.videoCount = 0,
    this.damageCount = 0,
    this.exteriorData,
    this.interiorData,
    this.engineData,
    this.completenessData,
    this.fuelData,
    this.vehicleInfo,
    this.items = const [],
    this.photos = const [],
    this.videos = const [],
    this.damages = const [],
    this.fuelInfo,
    this.odometerInfo,
    this.baselineInspectionId,
  });

  String get typeLabel =>
      type == InspectionType.beforeRental ? 'Sebelum Sewa' : 'Sesudah Sewa';

  String get statusLabel {
    switch (status) {
      case InspectionStatus.draft:
        return 'Belum Dimulai';
      case InspectionStatus.inProgress:
        return 'Berlangsung';
      case InspectionStatus.completed:
        return 'Selesai';
      case InspectionStatus.syncPending:
        return 'Menunggu Sinkronisasi';
      case InspectionStatus.synced:
        return 'Tersinkronisasi';
    }
  }

  bool get isCompleted => status == InspectionStatus.completed;
  bool get canStart => status == InspectionStatus.draft;
  bool get isInProgress => status == InspectionStatus.inProgress;
  bool get isSyncPending => status == InspectionStatus.syncPending;
  bool get isBeforeRental => type == InspectionType.beforeRental;
  bool get isAfterRental => type == InspectionType.afterRental;

  int get completedItemsCount =>
      items.where((i) => i.isOk || i.status == ItemStatus.normal).length;

  int get requiredPhotoCount => 10;
  int get takenPhotosCount => photos.length;

  bool get allChecklistsComplete {
    if (items.isEmpty) return false;
    return items.every((item) => item.status != ItemStatus.ok || item.isOk);
  }

  InspectionModel copyWith({
    int? id,
    int? vehicleId,
    String? vehicleName,
    String? plateNumber,
    String? customerName,
    int? bookingId,
    InspectionType? type,
    InspectionStatus? status,
    DateTime? date,
    String? officerName,
    String? location,
    String? notes,
    int? photoCount,
    int? videoCount,
    int? damageCount,
    VehicleInfo? vehicleInfo,
    List<InspectionItem>? items,
    List<InspectionPhoto>? photos,
    List<InspectionVideo>? videos,
    List<Damage>? damages,
    FuelData? fuelInfo,
    OdometerData? odometerInfo,
    int? baselineInspectionId,
  }) {
    return InspectionModel(
      id: id ?? this.id,
      vehicleId: vehicleId ?? this.vehicleId,
      vehicleName: vehicleName ?? this.vehicleName,
      plateNumber: plateNumber ?? this.plateNumber,
      customerName: customerName ?? this.customerName,
      bookingId: bookingId ?? this.bookingId,
      type: type ?? this.type,
      status: status ?? this.status,
      date: date ?? this.date,
      officerName: officerName ?? this.officerName,
      location: location ?? this.location,
      notes: notes ?? this.notes,
      photoCount: photoCount ?? this.photoCount,
      videoCount: videoCount ?? this.videoCount,
      damageCount: damageCount ?? this.damageCount,
      exteriorData: exteriorData,
      interiorData: interiorData,
      engineData: engineData,
      completenessData: completenessData,
      fuelData: fuelData,
      vehicleInfo: vehicleInfo ?? this.vehicleInfo,
      items: items ?? this.items,
      photos: photos ?? this.photos,
      videos: videos ?? this.videos,
      damages: damages ?? this.damages,
      fuelInfo: fuelInfo ?? this.fuelInfo,
      odometerInfo: odometerInfo ?? this.odometerInfo,
      baselineInspectionId: baselineInspectionId ?? this.baselineInspectionId,
    );
  }

  factory InspectionModel.fromJson(Map<String, dynamic> json) {
    return InspectionModel(
      id: json['id'] ?? 0,
      vehicleId: json['vehicle_id'] ?? 0,
      vehicleName: json['vehicle_name'] ?? '',
      plateNumber: json['plate_number'] ?? '',
      customerName: json['customer_name'],
      bookingId: json['booking_id'],
      type: InspectionType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => InspectionType.beforeRental,
      ),
      status: InspectionStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => InspectionStatus.draft,
      ),
      date: DateTime.parse(json['date'] ?? DateTime.now().toIso8601String()),
      officerName: json['officer_name'],
      location: json['location'],
      notes: json['notes'],
      photoCount: json['photo_count'] ?? 0,
      videoCount: json['video_count'] ?? 0,
      damageCount: json['damage_count'] ?? 0,
      exteriorData: json['exterior_data'],
      interiorData: json['interior_data'],
      engineData: json['engine_data'],
      completenessData: json['completeness_data'],
      fuelData: json['fuel_data'],
      vehicleInfo: json['vehicle_info'] != null
          ? VehicleInfo.fromJson(json['vehicle_info'])
          : null,
      items: json['items'] != null
          ? (json['items'] as List)
              .map((e) => InspectionItem.fromJson(e))
              .toList()
          : [],
      photos: json['photos'] != null
          ? (json['photos'] as List)
              .map((e) => InspectionPhoto.fromJson(e))
              .toList()
          : [],
      videos: json['videos'] != null
          ? (json['videos'] as List)
              .map((e) => InspectionVideo.fromJson(e))
              .toList()
          : [],
      damages: json['damages'] != null
          ? (json['damages'] as List).map((e) => Damage.fromJson(e)).toList()
          : [],
      fuelInfo: json['fuel_info'] != null
          ? FuelData.fromJson(json['fuel_info'])
          : null,
      odometerInfo: json['odometer_info'] != null
          ? OdometerData.fromJson(json['odometer_info'])
          : null,
      baselineInspectionId: json['baseline_inspection_id'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'vehicle_id': vehicleId,
      'vehicle_name': vehicleName,
      'plate_number': plateNumber,
      'customer_name': customerName,
      'booking_id': bookingId,
      'type': type.name,
      'status': status.name,
      'date': date.toIso8601String(),
      'officer_name': officerName,
      'location': location,
      'notes': notes,
      'photo_count': photoCount,
      'video_count': videoCount,
      'damage_count': damageCount,
      'vehicle_info': vehicleInfo?.toJson(),
      'items': items.map((e) => e.toJson()).toList(),
      'photos': photos.map((e) => e.toJson()).toList(),
      'videos': videos.map((e) => e.toJson()).toList(),
      'damages': damages.map((e) => e.toJson()).toList(),
      'fuel_info': fuelInfo?.toJson(),
      'odometer_info': odometerInfo?.toJson(),
      'baseline_inspection_id': baselineInspectionId,
    };
  }
}
