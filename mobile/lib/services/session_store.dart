import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/driver_model.dart';

/// Penyimpanan sesi login supir (token + data supir) di SharedPreferences.
class SessionStore {
  SessionStore._();

  static const String _tokenKey = 'driver_token_v1';
  static const String _driverKey = 'driver_data_v1';

  static Future<void> saveSession(
      {required String token, required DriverModel driver}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_driverKey, jsonEncode(driver.toJson()));
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<DriverModel?> getDriver() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_driverKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      return DriverModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  static Future<void> updateDriver(DriverModel driver) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_driverKey, jsonEncode(driver.toJson()));
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_driverKey);
  }

  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
