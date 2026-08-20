import '../services/session_store.dart';

/// Status ketersediaan supir di server.
enum DriverStatus { available, busy, offline, unknown }

/// Model supir (SupirCalo) dari backend.
class DriverModel {
  final int id;
  final String jenis;
  final String nama;
  final String email;
  final String? noHp;
  final String? alamat;
  final String? status;
  final String driverStatus;
  final String? noSim;
  final String? foto;
  final String? tarifPerHari;
  final String? komisi;
  final String? catatan;
  final String? fcmToken;
  final int? totalTasks;

  const DriverModel({
    required this.id,
    this.jenis = 'supir',
    required this.nama,
    required this.email,
    this.noHp,
    this.alamat,
    this.status,
    this.driverStatus = 'offline',
    this.noSim,
    this.foto,
    this.tarifPerHari,
    this.komisi,
    this.catatan,
    this.fcmToken,
    this.totalTasks,
  });

  DriverStatus get statusEnum {
    switch (driverStatus) {
      case 'available':
        return DriverStatus.available;
      case 'busy':
        return DriverStatus.busy;
      case 'offline':
        return DriverStatus.offline;
      default:
        return DriverStatus.unknown;
    }
  }

  String get statusLabel {
    switch (statusEnum) {
      case DriverStatus.available:
        return 'Tersedia';
      case DriverStatus.busy:
        return 'Sedang Tugas';
      case DriverStatus.offline:
        return 'Offline';
      case DriverStatus.unknown:
        return driverStatus;
    }
  }

  String get initials {
    final parts = nama.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return nama.isNotEmpty ? nama[0].toUpperCase() : '?';
  }

  DriverModel copyWith({
    String? driverStatus,
    String? fcmToken,
  }) {
    return DriverModel(
      id: id,
      jenis: jenis,
      nama: nama,
      email: email,
      noHp: noHp,
      alamat: alamat,
      status: status,
      driverStatus: driverStatus ?? this.driverStatus,
      noSim: noSim,
      foto: foto,
      tarifPerHari: tarifPerHari,
      komisi: komisi,
      catatan: catatan,
      fcmToken: fcmToken ?? this.fcmToken,
      totalTasks: totalTasks,
    );
  }

  Future<void> persist() => SessionStore.updateDriver(this);

  factory DriverModel.fromJson(Map<String, dynamic> json) {
    return DriverModel(
      id: json['id'] ?? 0,
      jenis: json['jenis'] ?? 'supir',
      nama: json['nama'] ?? '',
      email: json['email'] ?? '',
      noHp: json['no_hp'],
      alamat: json['alamat'],
      status: json['status'],
      driverStatus: json['driver_status'] ?? 'offline',
      noSim: json['no_sim'],
      foto: json['foto'],
      tarifPerHari: json['tarif_per_hari'],
      komisi: json['komisi'],
      catatan: json['catatan'],
      fcmToken: json['fcm_token'],
      totalTasks: json['driver_tasks_count'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'jenis': jenis,
        'nama': nama,
        'email': email,
        'no_hp': noHp,
        'alamat': alamat,
        'status': status,
        'driver_status': driverStatus,
        'no_sim': noSim,
        'foto': foto,
        'tarif_per_hari': tarifPerHari,
        'komisi': komisi,
        'catatan': catatan,
        'fcm_token': fcmToken,
        'driver_tasks_count': totalTasks,
      };
}