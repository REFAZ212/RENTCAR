import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/inspection_model.dart';

class InspectionStorage {
  InspectionStorage._();

  static const String _key = 'inspection_store_v1';

  static Future<List<InspectionModel>> loadAll() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key);
      if (raw == null || raw.isEmpty) return [];
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => InspectionModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> saveAll(List<InspectionModel> inspections) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = jsonEncode(inspections.map((i) => i.toJson()).toList());
      await prefs.setString(_key, raw);
    } catch (_) {}
  }

  static Future<void> upsert(InspectionModel inspection) async {
    final all = await loadAll();
    final index = all.indexWhere((i) => i.id == inspection.id);
    if (index != -1) {
      all[index] = inspection;
    } else {
      all.add(inspection);
    }
    await saveAll(all);
  }

  static Future<void> delete(int id) async {
    final all = await loadAll();
    all.removeWhere((i) => i.id == id);
    await saveAll(all);
  }
}