import '../models/driver_task.dart';
import 'api_client.dart';

/// Jenis inspeksi pada lifecycle tugas.
enum TaskInspectionType { before, after }

/// Interaksi supir dengan tugas (DriverTask) di backend.
class TaskService {
  TaskService._();

  /// Daftar tugas yang tersedia diambil.
  static Future<List<DriverTask>> available() async {
    final data = await ApiClient.get('/mobile/tasks/available')
        as Map<String, dynamic>;
    final raw = data['tasks'] as List<dynamic>? ?? [];
    return raw
        .map((e) => DriverTask.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Tugas aktif milik supir (null bila tidak ada).
  static Future<DriverTask?> myActive() async {
    final data = await ApiClient.get('/mobile/tasks/my-active')
        as Map<String, dynamic>;
    final task = data['task'];
    if (task == null) return null;
    return DriverTask.fromJson(task as Map<String, dynamic>);
  }

  static Future<DriverTask> show(int taskId) async {
    final data = await ApiClient.get('/mobile/tasks/$taskId')
        as Map<String, dynamic>;
    return DriverTask.fromJson(data['task'] as Map<String, dynamic>);
  }

  static Future<DriverTask> accept(int taskId) async {
    final data = await ApiClient.post('/mobile/tasks/$taskId/accept');
    return DriverTask.fromJson((data as Map<String, dynamic>)['task']
        as Map<String, dynamic>);
  }

  /// Mulai inspeksi awal (status → inspection_before).
  static Future<DriverTask> startInspectionBefore(int taskId) async {
    final data = await ApiClient.post('/mobile/tasks/$taskId/start');
    return DriverTask.fromJson((data as Map<String, dynamic>)['task']
        as Map<String, dynamic>);
  }

  /// Mulai pengantaran (status → on_delivery) + simpan GPS.
  static Future<DriverTask> startDelivery(
    int taskId, {
    double? latitude,
    double? longitude,
    double? accuracy,
  }) async {
    final data = await ApiClient.post('/mobile/tasks/$taskId/start-delivery',
        body: {
          'latitude': latitude,
          'longitude': longitude,
          'accuracy': accuracy,
        });
    return DriverTask.fromJson((data as Map<String, dynamic>)['task']
        as Map<String, dynamic>);
  }

  /// Kendaraan tiba di tujuan (status → arrived).
  static Future<DriverTask> arrive(
    int taskId, {
    double? latitude,
    double? longitude,
    double? accuracy,
  }) async {
    final data = await ApiClient.post('/mobile/tasks/$taskId/arrive',
        body: {
          'latitude': latitude,
          'longitude': longitude,
          'accuracy': accuracy,
        });
    return DriverTask.fromJson((data as Map<String, dynamic>)['task']
        as Map<String, dynamic>);
  }

  /// Selesaikan tugas (status → completed, supir kembali available).
  static Future<DriverTask> complete(int taskId) async {
    final data = await ApiClient.post('/mobile/tasks/$taskId/complete');
    return DriverTask.fromJson((data as Map<String, dynamic>)['task']
        as Map<String, dynamic>);
  }

  /// Simpan hasil inspeksi (before/after) dengan foto & video.
  static Future<DriverTask> submitInspection(
    int taskId, {
    required TaskInspectionType type,
    int? odometer,
    required String fuelLevel,
    required String kondisiBody,
    String? kondisiInterior,
    String? kondisiBan,
    String? kondisiAc,
    String? kondisiLampu,
    bool adaDamagenya = false,
    String? deskripsiKondisi,
    String? catatan,
    double? biayaKerusakan,
    double? latitude,
    double? longitude,
    double? accuracy,
    String? location,
    String? capturedAt,
    List<String> fotoPaths = const [],
    List<String> videoPaths = const [],
    bool watermarked = true,
  }) async {
    final path = type == TaskInspectionType.before
        ? '/mobile/tasks/$taskId/inspection/before'
        : '/mobile/tasks/$taskId/inspection/after';

    final fields = <String, String>{
      'fuel_level': fuelLevel,
      'kondisi_body': kondisiBody,
      'ada_damagenya': adaDamagenya ? '1' : '0',
      if (odometer != null) 'odometer': '$odometer',
      if (kondisiInterior != null) 'kondisi_interior': kondisiInterior,
      if (kondisiBan != null) 'kondisi_ban': kondisiBan,
      if (kondisiAc != null) 'kondisi_ac': kondisiAc,
      if (kondisiLampu != null) 'kondisi_lampu': kondisiLampu,
      if (deskripsiKondisi != null) 'deskripsi_kondisi': deskripsiKondisi,
      if (catatan != null) 'catatan': catatan,
      if (biayaKerusakan != null) 'biaya_kerusakan': '$biayaKerusakan',
      if (latitude != null) 'latitude': '$latitude',
      if (longitude != null) 'longitude': '$longitude',
      if (accuracy != null) 'accuracy': '$accuracy',
      if (location != null) 'location': location,
      if (capturedAt != null) 'captured_at': capturedAt,
      'watermarked': watermarked ? '1' : '0',
    };

    final files = <String, String>{};
    for (var i = 0; i < fotoPaths.length; i++) {
      files['fotos[$i]'] = fotoPaths[i];
    }
    for (var i = 0; i < videoPaths.length; i++) {
      files['videos[$i]'] = videoPaths[i];
    }

    final data = await ApiClient.uploadMultipart(path,
        fields: fields, files: files);
    return DriverTask.fromJson((data as Map<String, dynamic>)['task']
        as Map<String, dynamic>);
  }
}