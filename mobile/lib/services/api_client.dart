import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'session_store.dart';

/// Konfigurasi alamat server Laravel.
///
/// Default `127.0.0.1` = host machine dari HP fisik via `adb reverse tcp:8000 tcp:8000`.
/// Untuk emulator: override lewat `--dart-define=API_BASE_URL=http://10.0.2.2:8000/api`.
class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:8000/api',
  );
}

/// Error khusus dari API (memuat pesan dari backend).
class ApiException implements Exception {
  final int statusCode;
  final String message;
  final Map<String, dynamic>? errors;

  const ApiException(this.statusCode, this.message, [this.errors]);

  @override
  String toString() => message;
}

/// Client HTTP dengan autentikasi Bearer token untuk app supir.
class ApiClient {
  ApiClient._();

  static const Duration _timeout = Duration(seconds: 30);

  static Map<String, String> _headers({bool json = true}) {
    return {
      'Accept': 'application/json',
      if (json) 'Content-Type': 'application/json',
    };
  }

  /// Ambil token saat ini dari session store (tanpa cache).
  static Future<String?> _token() => SessionStore.getToken();

  static Uri _uri(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  /// Parsing body error dari Laravel (ValidationException, dsb).
  static ApiException _toException(http.Response res) {
    String message = 'Terjadi kesalahan (${res.statusCode}).';
    Map<String, dynamic>? errors;
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) {
        if (decoded['message'] is String) {
          message = decoded['message'] as String;
        }
        if (decoded['errors'] is Map<String, dynamic>) {
          errors = decoded['errors'] as Map<String, dynamic>;
          if (errors.isNotEmpty) {
            final firstValue = errors.values.first;
            if (firstValue is List && firstValue.isNotEmpty) {
              message = firstValue.first.toString();
            }
          }
        }
      }
    } catch (_) {
      // abaikan, pakai pesan default
    }
    return ApiException(res.statusCode, message, errors);
  }

  static Future<dynamic> get(String path) async {
    final token = await _token();
    final res = await http
        .get(
          _uri(path),
          headers: {
            ..._headers(),
            if (token != null) 'Authorization': 'Bearer $token',
          },
        )
        .timeout(_timeout);

    if (res.statusCode == 401) await _handleUnauthorized();

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _toException(res);
    }
    return jsonDecode(res.body);
  }

  static Future<dynamic> post(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final token = await _token();
    final res = await http
        .post(
          _uri(path),
          headers: {
            ..._headers(),
            if (token != null) 'Authorization': 'Bearer $token',
          },
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(_timeout);

    if (res.statusCode == 401) await _handleUnauthorized();

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _toException(res);
    }
    return jsonDecode(res.body);
  }

  static Future<dynamic> patch(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final token = await _token();
    final res = await http
        .patch(
          _uri(path),
          headers: {
            ..._headers(),
            if (token != null) 'Authorization': 'Bearer $token',
          },
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(_timeout);

    if (res.statusCode == 401) await _handleUnauthorized();

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _toException(res);
    }
    return jsonDecode(res.body);
  }

  /// Upload multipart untuk foto/video inspeksi tugas.
  /// `fields` = data item, `files` = map nama-file → path lokal.
  static Future<dynamic> uploadMultipart(
    String path, {
    required Map<String, String> fields,
    required Map<String, String> files,
  }) async {
    final token = await _token();
    final request = http.MultipartRequest('POST', _uri(path));

    request.headers.addAll({
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    });
    request.fields.addAll(fields);

    for (final entry in files.entries) {
      final file = File(entry.value);
      if (await file.exists()) {
        request.files.add(await http.MultipartFile.fromPath(
          entry.key,
          file.path,
        ));
      }
    }

    final streamed = await request.send().timeout(const Duration(seconds: 120));
    final res = await http.Response.fromStream(streamed);

    if (res.statusCode == 401) await _handleUnauthorized();

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw _toException(res);
    }
    return jsonDecode(res.body);
  }

  /// Saat token tidak valid, bersihkan sesi.
  static Future<void> _handleUnauthorized() async {
    await SessionStore.clear();
  }
}