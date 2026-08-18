class GpsLocation {
  final double latitude;
  final double longitude;
  final double accuracy;
  final DateTime capturedAt;
  final String timezone;
  final String? address;

  const GpsLocation({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.capturedAt,
    this.timezone = 'Asia/Jakarta',
    this.address,
  });

  bool get isAccurate => accuracy <= 20.0;

  String get accuracyLabel {
    final a = accuracy <= 1 ? 1.0 : accuracy;
    return '±${a.toStringAsFixed(0)} m';
  }

  String get coordinatesLabel =>
      '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';

  String get capturedAtIso8601 => capturedAt.toIso8601String();

  String get timestampWithTimezone {
    final offset = capturedAt.timeZoneOffset;
    final sign = offset.isNegative ? '-' : '+';
    final h = offset.inHours.abs().toString().padLeft(2, '0');
    final m = (offset.inMinutes.abs() % 60).toString().padLeft(2, '0');
    return '${capturedAt.toIso8601String().split('.').first}$sign$h:$m';
  }

  String get humanDate {
    const months = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return '${capturedAt.day} ${months[capturedAt.month]} ${capturedAt.year}';
  }

  String get humanTime {
    final t = capturedAt.toLocal();
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}:${t.second.toString().padLeft(2, '0')} WIB';
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'captured_at': capturedAtIso8601,
      'timezone': timezone,
      'address': address,
    };
  }

  factory GpsLocation.fromJson(Map<String, dynamic> json) {
    return GpsLocation(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0,
      capturedAt: DateTime.tryParse(json['captured_at'] ?? '') ??
          DateTime.now(),
      timezone: json['timezone'] ?? 'Asia/Jakarta',
      address: json['address'],
    );
  }

  GpsLocation copyWith({
    double? latitude,
    double? longitude,
    double? accuracy,
    DateTime? capturedAt,
    String? timezone,
    String? address,
  }) {
    return GpsLocation(
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracy: accuracy ?? this.accuracy,
      capturedAt: capturedAt ?? this.capturedAt,
      timezone: timezone ?? this.timezone,
      address: address ?? this.address,
    );
  }

  @override
  String toString() =>
      'GpsLocation($coordinatesLabel, acc: $accuracy, @$timestampWithTimezone)';

  @override
  bool operator ==(Object other) {
    if (other is! GpsLocation) return false;
    return other.latitude == latitude &&
        other.longitude == longitude &&
        other.accuracy == accuracy;
  }

  @override
  int get hashCode => Object.hash(latitude, longitude, accuracy);
}
