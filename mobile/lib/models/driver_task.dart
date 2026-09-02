/// Status lifecycle tugas supir (backend: driver_tasks.status).
enum DriverTaskStatus {
  pending,
  available,
  accepted,
  inspectionBefore,
  onDelivery,
  arrived,
  inspectionAfter,
  completed,
  cancelled,
  unknown;

  static DriverTaskStatus fromApi(String? value) {
    switch (value) {
      case 'pending':
        return DriverTaskStatus.pending;
      case 'available':
        return DriverTaskStatus.available;
      case 'accepted':
        return DriverTaskStatus.accepted;
      case 'inspection_before':
        return DriverTaskStatus.inspectionBefore;
      case 'on_delivery':
        return DriverTaskStatus.onDelivery;
      case 'arrived':
        return DriverTaskStatus.arrived;
      case 'inspection_after':
        return DriverTaskStatus.inspectionAfter;
      case 'completed':
        return DriverTaskStatus.completed;
      case 'cancelled':
        return DriverTaskStatus.cancelled;
      default:
        return DriverTaskStatus.unknown;
    }
  }

  String get label {
    switch (this) {
      case DriverTaskStatus.pending:
        return 'Menunggu';
      case DriverTaskStatus.available:
        return 'Tersedia';
      case DriverTaskStatus.accepted:
        return 'Diterima';
      case DriverTaskStatus.inspectionBefore:
        return 'Inspeksi Awal';
      case DriverTaskStatus.onDelivery:
        return 'Sedang Dikirim';
      case DriverTaskStatus.arrived:
        return 'Sampai Tujuan';
      case DriverTaskStatus.inspectionAfter:
        return 'Inspeksi Akhir';
      case DriverTaskStatus.completed:
        return 'Selesai';
      case DriverTaskStatus.cancelled:
        return 'Dibatalkan';
      case DriverTaskStatus.unknown:
        return 'Unknown';
    }
  }
}

class DriverTaskVehicle {
  final int id;
  final String? namaKendaraan;
  final String? platNomor;
  final String? warna;
  final String? foto;

  const DriverTaskVehicle({
    required this.id,
    this.namaKendaraan,
    this.platNomor,
    this.warna,
    this.foto,
  });

  String get displayName {
    if (namaKendaraan != null && platNomor != null) {
      return '$namaKendaraan • $platNomor';
    }
    return namaKendaraan ?? platNomor ?? 'Kendaraan';
  }

  factory DriverTaskVehicle.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const DriverTaskVehicle(id: 0);
    return DriverTaskVehicle(
      id: json['id'] ?? 0,
      namaKendaraan: json['nama_kendaraan'],
      platNomor: json['plat_nomor'],
      warna: json['warna'],
      foto: json['foto'],
    );
  }
}

class DriverTaskCustomer {
  final String? namaLengkap;
  final String? noHp;

  const DriverTaskCustomer({this.namaLengkap, this.noHp});

  factory DriverTaskCustomer.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const DriverTaskCustomer();
    return DriverTaskCustomer(
      namaLengkap: json['nama_lengkap'],
      noHp: json['no_hp'],
    );
  }
}

class DriverTaskLocation {
  final String? location;
  final double? lat;
  final double? lng;

  const DriverTaskLocation({this.location, this.lat, this.lng});

  factory DriverTaskLocation.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const DriverTaskLocation();
    return DriverTaskLocation(
      location: json['location'],
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
    );
  }
}

class DriverTaskAssignedDriver {
  final int id;
  final String? nama;
  final String? noHp;

  const DriverTaskAssignedDriver({required this.id, this.nama, this.noHp});

  factory DriverTaskAssignedDriver.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const DriverTaskAssignedDriver(id: 0);
    return DriverTaskAssignedDriver(
      id: json['id'] ?? 0,
      nama: json['nama'],
      noHp: json['no_hp'],
    );
  }
}

/// Hasil inspeksi kendaraan (backend: InspeksiKendaraan terkait tugas).
class DriverTaskInspection {
  final int id;
  final String? jenis;
  final int? odometer;
  final String? fuelLevel;
  final String? kondisiBody;
  final String? kondisiInterior;
  final String? kondisiBan;
  final String? kondisiAc;
  final String? kondisiLampu;
  final bool adaDamagenya;
  final String? deskripsiKondisi;
  final String? catatan;
  final double? biayaKerusakan;
  final List<String> fotos;
  final List<String> videos;
  final String? inspeksiOleh;
  final DateTime? createdAt;

  const DriverTaskInspection({
    required this.id,
    this.jenis,
    this.odometer,
    this.fuelLevel,
    this.kondisiBody,
    this.kondisiInterior,
    this.kondisiBan,
    this.kondisiAc,
    this.kondisiLampu,
    this.adaDamagenya = false,
    this.deskripsiKondisi,
    this.catatan,
    this.biayaKerusakan,
    this.fotos = const [],
    this.videos = const [],
    this.inspeksiOleh,
    this.createdAt,
  });

  factory DriverTaskInspection.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const DriverTaskInspection(id: 0);
    return DriverTaskInspection(
      id: json['id'] ?? 0,
      jenis: json['jenis'],
      odometer: json['odometer'],
      fuelLevel: json['fuel_level'],
      kondisiBody: json['kondisi_body'],
      kondisiInterior: json['kondisi_interior'],
      kondisiBan: json['kondisi_ban'],
      kondisiAc: json['kondisi_ac'],
      kondisiLampu: json['kondisi_lampu'],
      adaDamagenya: json['ada_damagenya'] ?? false,
      deskripsiKondisi: json['deskripsi_kondisi'],
      catatan: json['catatan'],
      biayaKerusakan: (json['biaya_kerusakan'] as num?)?.toDouble(),
      fotos: (json['fotos'] as List<dynamic>? ?? []).cast<String>(),
      videos: (json['videos'] as List<dynamic>? ?? []).cast<String>(),
      inspeksiOleh: json['inspeksi_oleh'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
    );
  }
}

class DriverTask {
  final int id;
  final String kodeTask;
  final String? judul;
  final String? deskripsi;
  final int? orderId;
  final String? orderCode;
  final DriverTaskStatus status;
  final String? statusLabel;
  final DriverTaskVehicle kendaraan;
  final DriverTaskCustomer customer;
  final DriverTaskLocation pickup;
  final DriverTaskLocation destination;
  final DriverTaskAssignedDriver assignedDriver;
  final DriverTaskInspection inspectionBefore;
  final DriverTaskInspection inspectionAfter;
  final DateTime? acceptedAt;
  final DateTime? startedDeliveryAt;
  final DateTime? arrivedAt;
  final DateTime? completedAt;
  final DateTime? createdAt;

  const DriverTask({
    required this.id,
    required this.kodeTask,
    this.judul,
    this.deskripsi,
    this.orderId,
    this.orderCode,
    required this.status,
    this.statusLabel,
    this.kendaraan = const DriverTaskVehicle(id: 0),
    this.customer = const DriverTaskCustomer(),
    this.pickup = const DriverTaskLocation(),
    this.destination = const DriverTaskLocation(),
    this.assignedDriver = const DriverTaskAssignedDriver(id: 0),
    this.inspectionBefore = const DriverTaskInspection(id: 0),
    this.inspectionAfter = const DriverTaskInspection(id: 0),
    this.acceptedAt,
    this.startedDeliveryAt,
    this.arrivedAt,
    this.completedAt,
    this.createdAt,
  });

  bool get isActive {
    return status == DriverTaskStatus.accepted ||
        status == DriverTaskStatus.inspectionBefore ||
        status == DriverTaskStatus.onDelivery ||
        status == DriverTaskStatus.arrived ||
        status == DriverTaskStatus.inspectionAfter;
  }

  bool get canAccept => status == DriverTaskStatus.available;
  bool get canStartInspectionBefore => status == DriverTaskStatus.accepted;
  bool get canStartDelivery => status == DriverTaskStatus.inspectionBefore;
  bool get canArrive => status == DriverTaskStatus.onDelivery;
  bool get canStartInspectionAfter => status == DriverTaskStatus.arrived;
  bool get canComplete => status == DriverTaskStatus.inspectionAfter;

  factory DriverTask.fromJson(Map<String, dynamic> json) {
    return DriverTask(
      id: json['id'] ?? 0,
      kodeTask: json['kode_task'] ?? '',
      judul: json['judul'],
      deskripsi: json['deskripsi'],
      orderId: json['order_id'],
      orderCode: json['order_code'],
      status: DriverTaskStatus.fromApi(json['status']),
      statusLabel: json['status_label'],
      kendaraan: DriverTaskVehicle.fromJson(json['kendaraan']),
      customer: DriverTaskCustomer.fromJson(json['customer']),
      pickup: DriverTaskLocation.fromJson(json['pickup']),
      destination: DriverTaskLocation.fromJson(json['destination']),
      assignedDriver:
          DriverTaskAssignedDriver.fromJson(json['assigned_driver']),
      inspectionBefore:
          DriverTaskInspection.fromJson(json['inspection_before']),
      inspectionAfter: DriverTaskInspection.fromJson(json['inspection_after']),
      acceptedAt: _parseDate(json['accepted_at']),
      startedDeliveryAt: _parseDate(json['started_delivery_at']),
      arrivedAt: _parseDate(json['arrived_at']),
      completedAt: _parseDate(json['completed_at']),
      createdAt: _parseDate(json['created_at']),
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }
}
