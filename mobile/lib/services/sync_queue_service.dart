import 'dart:convert';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/media_capture_result.dart';

class SyncQueueService {
  SyncQueueService._();

  static const String _queueKey = 'sync_queue_v1';

  /// Endpoint backend untuk sinkronisasi dokumentasi inspeksi.
  /// Sesuaikan dengan alamat server Laravel.
  static const String syncEndpoint = 'http://127.0.0.1:8000/api/mobile/sync-media';

  static const int maxPendingSeconds = 10;

  static Future<bool> isOnline() async {
    try {
      final results = await Connectivity().checkConnectivity();
      return results.any((r) =>
          r == ConnectivityResult.mobile || r == ConnectivityResult.wifi);
    } catch (_) {
      return true;
    }
  }

  static Future<void> enqueuePhoto(PhotoCaptureResult photo) async {
    await _push({
      'type': 'photo',
      'id': photo.id,
      'inspection_id': photo.inspectionId,
      'file_path': photo.photoPath,
      'category': photo.category,
      'latitude': photo.gps.latitude,
      'longitude': photo.gps.longitude,
      'accuracy': photo.gps.accuracy,
      'captured_at': photo.capturedAt,
      'timezone': photo.timezone,
    });
  }

  static Future<void> enqueueVideo(VideoCaptureResult video) async {
    await _push({
      'type': 'video',
      'id': video.id,
      'inspection_id': video.inspectionId,
      'file_path': video.videoPath,
      'latitude': video.gps.latitude,
      'longitude': video.gps.longitude,
      'accuracy': video.gps.accuracy,
      'recorded_at': video.recordedAt,
      'timezone': video.timezone,
      'duration': video.duration.inSeconds,
    });
  }

  static Future<List<Map<String, dynamic>>> getPending() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_queueKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      return (jsonDecode(raw) as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<int> getPendingCount() async {
    return (await getPending()).length;
  }

  static Future<void> _push(Map<String, dynamic> item) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getPending();
    queue.add(item);
    await prefs.setString(_queueKey, jsonEncode(queue));
  }

  static Future<void> removeById(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getPending();
    queue.removeWhere((e) => e['id'] == id);
    await prefs.setString(_queueKey, jsonEncode(queue));
  }

  /// Mencoba mengirim semua dokumentasi pending ke backend.
  /// File lokal tidak dihapus sebelum server menerima data.
  static Future<int> syncPending() async {
    if (!await isOnline()) return 0;

    final queue = await getPending();
    var syncedCount = 0;

    for (final item in queue) {
      final ok = await _uploadItem(item);
      if (ok) {
        await removeById(item['id'] as String);
        syncedCount++;
      }
    }

    return syncedCount;
  }

  static Future<bool> _uploadItem(Map<String, dynamic> item) async {
    try {
      final filePath = item['file_path'] as String? ?? '';
      final file = File(filePath);
      final exists = await file.exists();

      final request = http.MultipartRequest('POST', Uri.parse(syncEndpoint));

      request.fields['type'] = item['type'] ?? '';
      request.fields['inspection_id'] = item['inspection_id'] ?? '';
      request.fields['id'] = item['id'] ?? '';
      request.fields['category'] = item['category'] ?? '';
      request.fields['latitude'] = '${item['latitude'] ?? 0}';
      request.fields['longitude'] = '${item['longitude'] ?? 0}';
      request.fields['accuracy'] = '${item['accuracy'] ?? 0}';
      request.fields['timezone'] = item['timezone'] ?? 'Asia/Jakarta';
      request.fields['duration'] = '${item['duration'] ?? 0}';
      request.fields['captured_at'] = item['captured_at'] ?? item['recorded_at'] ?? '';

      if (exists) {
        request.files.add(await http.MultipartFile.fromPath(
          'file',
          filePath,
        ));
      }

      final streamed = await request.send().timeout(
            const Duration(seconds: maxPendingSeconds),
          );
      final response = await http.Response.fromStream(streamed);

      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (_) {
      return false;
    }
  }
}