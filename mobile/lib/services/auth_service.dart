import '../models/driver_model.dart';
import 'api_client.dart';
import 'session_store.dart';

/// Autentikasi & profil supir terhadap backend Laravel.
class AuthService {
  AuthService._();

  /// Login supir via `POST /api/supir/login`.
  /// Menyimpan token + data supir ke SessionStore.
  static Future<DriverModel> login({
    required String email,
    required String password,
  }) async {
    final data = await ApiClient.post('/supir/login', body: {
      'email': email,
      'password': password,
    }) as Map<String, dynamic>;

    final token = data['token'] as String? ?? '';
    final supir = DriverModel.fromJson(data['supir'] as Map<String, dynamic>);

    await SessionStore.saveSession(token: token, driver: supir);
    return supir;
  }

  /// Ambil profil terbaru dari server (`GET /api/supir/me`).
  static Future<DriverModel> me() async {
    final data = await ApiClient.get('/supir/me') as Map<String, dynamic>;
    final driver = DriverModel.fromJson(data);
    final existing = await SessionStore.getDriver();
    if (existing != null) {
      driver
          .copyWith(
            fcmToken: driver.fcmToken ?? existing.fcmToken,
          )
          .persist();
    } else {
      driver.persist();
    }
    return driver;
  }

  /// Logout: update status offline + hapus token di server & lokal.
  static Future<void> logout() async {
    try {
      await ApiClient.post('/supir/logout');
    } catch (_) {
      // tetap lanjut membersihkan sesi lokal
    } finally {
      await SessionStore.clear();
    }
  }

  /// Daftarkan FCM token + sekaligus set driver_status.
  static Future<void> updateFcmToken(String token,
      {String? driverStatus}) async {
    await ApiClient.post('/supir/fcm-token', body: {
      'fcm_token': token,
      if (driverStatus != null) 'driver_status': driverStatus,
    });
  }

  /// Ubah status ketersediaan (available / offline).
  static Future<DriverStatus> updateDriverStatus(DriverStatus status) async {
    final data = await ApiClient.patch('/supir/driver-status', body: {
      'driver_status':
          status == DriverStatus.available ? 'available' : 'offline',
    }) as Map<String, dynamic>;

    final newStatus = data['driver_status'] as String? ?? 'offline';
    final driver = await SessionStore.getDriver();
    if (driver != null) {
      driver.copyWith(driverStatus: newStatus).persist();
    }
    return _fromString(newStatus);
  }

  static DriverStatus _fromString(String value) {
    switch (value) {
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
}
