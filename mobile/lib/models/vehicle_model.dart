enum VehicleStatus { available, rented, maintenance }

class VehicleModel {
  final int id;
  final String brand;
  final String type;
  final String plateNumber;
  final String? year;
  final String? color;
  final String? imageUrl;
  final VehicleStatus status;
  final String? customerName;
  final DateTime? rentalStart;
  final DateTime? rentalEnd;

  const VehicleModel({
    required this.id,
    required this.brand,
    required this.type,
    required this.plateNumber,
    this.year,
    this.color,
    this.imageUrl,
    this.status = VehicleStatus.available,
    this.customerName,
    this.rentalStart,
    this.rentalEnd,
  });

  String get displayName => '$brand $type';
  bool get isRented => status == VehicleStatus.rented;

  String get statusLabel {
    switch (status) {
      case VehicleStatus.available:
        return 'Tersedia';
      case VehicleStatus.rented:
        return 'Sedang Disewa';
      case VehicleStatus.maintenance:
        return 'Perawatan';
    }
  }

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    return VehicleModel(
      id: json['id'] ?? 0,
      brand: json['brand'] ?? '',
      type: json['type'] ?? '',
      plateNumber: json['plate_number'] ?? '',
      year: json['year'],
      color: json['color'],
      imageUrl: json['image_url'],
      status: VehicleStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => VehicleStatus.available,
      ),
      customerName: json['customer_name'],
      rentalStart: json['rental_start'] != null
          ? DateTime.parse(json['rental_start'])
          : null,
      rentalEnd: json['rental_end'] != null
          ? DateTime.parse(json['rental_end'])
          : null,
    );
  }
}
