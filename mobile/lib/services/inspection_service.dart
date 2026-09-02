import '../models/inspection_model.dart';
import '../models/inspection_item_model.dart';
import '../models/damage_model.dart';
import 'inspection_storage.dart';

class InspectionService {
  InspectionService._();

  static final List<InspectionModel> _inspections = [];
  static bool _initialized = false;

  static void _ensureInitialized() {
    if (_initialized) return;
    _initialized = true;
    _inspections.addAll(_getMockInspections());
  }

  /// Memuat data inspeksi dari penyimpanan offline.
  /// Dipanggil sekali saat aplikasi dimulai.
  static Future<void> initFromStorage() async {
    final stored = await InspectionStorage.loadAll();
    if (stored.isNotEmpty) {
      _inspections
        ..clear()
        ..addAll(stored);
    } else {
      _inspections.addAll(_getMockInspections());
      await InspectionStorage.saveAll(_inspections);
    }
    _initialized = true;
  }

  static Future<void> _persist() async {
    await InspectionStorage.saveAll(_inspections);
  }

  static List<InspectionModel> getAll() {
    _ensureInitialized();
    return List.unmodifiable(_inspections);
  }

  static List<InspectionModel> getByType(InspectionType type) {
    _ensureInitialized();
    return _inspections.where((i) => i.type == type).toList();
  }

  static List<InspectionModel> getByStatus(InspectionStatus status) {
    _ensureInitialized();
    return _inspections.where((i) => i.status == status).toList();
  }

  static InspectionModel? getById(int id) {
    _ensureInitialized();
    try {
      return _inspections.firstWhere((i) => i.id == id);
    } catch (_) {
      return null;
    }
  }

  static List<InspectionModel> getByBookingId(int bookingId) {
    _ensureInitialized();
    return _inspections.where((i) => i.bookingId == bookingId).toList();
  }

  static InspectionModel? getBaselineForBooking(int bookingId) {
    _ensureInitialized();
    try {
      return _inspections.firstWhere(
        (i) =>
            i.bookingId == bookingId && i.type == InspectionType.beforeRental,
      );
    } catch (_) {
      return null;
    }
  }

  static List<InspectionModel> search(String query) {
    _ensureInitialized();
    final q = query.toLowerCase();
    return _inspections.where((i) {
      return i.vehicleName.toLowerCase().contains(q) ||
          i.plateNumber.toLowerCase().contains(q) ||
          (i.customerName?.toLowerCase().contains(q) ?? false) ||
          i.id.toString().contains(q);
    }).toList();
  }

  static Future<InspectionModel> create(InspectionModel inspection) async {
    _ensureInitialized();
    final newId = _inspections.isEmpty
        ? 1
        : _inspections.map((i) => i.id).reduce((a, b) => a > b ? a : b) + 1;
    final created = inspection.copyWith(id: newId);
    _inspections.add(created);
    await _persist();
    return created;
  }

  static Future<InspectionModel> update(InspectionModel inspection) async {
    _ensureInitialized();
    final index = _inspections.indexWhere((i) => i.id == inspection.id);
    if (index != -1) {
      _inspections[index] = inspection;
      await _persist();
    }
    return inspection;
  }

  static Future<void> delete(int id) async {
    _ensureInitialized();
    _inspections.removeWhere((i) => i.id == id);
    await _persist();
  }

  static List<InspectionItem> getDefaultCompletenessItems(String inspectionId) {
    final items = [
      'Kunci',
      'STNK',
      'Ban Serep',
      'Dongkrak',
      'Kunci Roda',
      'AC',
    ];
    return items.asMap().entries.map((entry) {
      return InspectionItem(
        id: 'comp_${entry.key}_$inspectionId',
        inspectionId: inspectionId,
        category: 'completeness',
        name: entry.value,
        status: ItemStatus.ok,
      );
    }).toList();
  }

  static List<InspectionModel> _getMockInspections() {
    return [
      InspectionModel(
        id: 1,
        vehicleId: 1,
        vehicleName: 'Toyota Avanza',
        plateNumber: 'B 1234 ABC',
        customerName: 'Budi Santoso',
        bookingId: 101,
        type: InspectionType.beforeRental,
        status: InspectionStatus.completed,
        date: DateTime(2026, 8, 13, 8, 30),
        officerName: 'Rendi Fauzi',
        photoCount: 8,
        videoCount: 1,
        damageCount: 0,
        vehicleInfo: const VehicleInfo(
          brand: 'Toyota',
          type: 'Avanza',
          plateNumber: 'B 1234 ABC',
          customerName: 'Budi Santoso',
          bookingCode: '#INV-2026-101',
          purpose: 'Tasikmalaya',
          rentalStart: null,
          rentalEnd: null,
          startTime: '08:00',
          endTime: '17:00',
          rentalRate: 350000,
        ),
        fuelInfo: const FuelData(level: 'full', liter: 45),
        odometerInfo: const OdometerData(value: 124580),
      ),
      InspectionModel(
        id: 2,
        vehicleId: 3,
        vehicleName: 'Toyota Innova',
        plateNumber: 'B 9012 GHI',
        customerName: 'Andi Wijaya',
        bookingId: 102,
        type: InspectionType.beforeRental,
        status: InspectionStatus.completed,
        date: DateTime(2026, 8, 12, 9, 0),
        officerName: 'Rendi Fauzi',
        photoCount: 10,
        videoCount: 1,
        damageCount: 1,
        vehicleInfo: const VehicleInfo(
          brand: 'Toyota',
          type: 'Innova',
          plateNumber: 'B 9012 GHI',
          customerName: 'Andi Wijaya',
          bookingCode: '#INV-2026-102',
          purpose: 'Jakarta',
          startTime: '09:00',
          endTime: '18:00',
          rentalRate: 500000,
        ),
        fuelInfo: const FuelData(level: '3/4', liter: 35),
        odometerInfo: const OdometerData(value: 89200),
        damages: [
          const Damage(
            id: 'dmg_1',
            inspectionId: '2',
            area: 'Sisi Kanan Depan',
            type: DamageType.scratch,
            description: 'Lecet pada bumper kanan',
            isNewDamage: false,
          ),
        ],
      ),
      InspectionModel(
        id: 3,
        vehicleId: 1,
        vehicleName: 'Toyota Avanza',
        plateNumber: 'B 1234 ABC',
        customerName: 'Budi Santoso',
        bookingId: 101,
        type: InspectionType.afterRental,
        status: InspectionStatus.inProgress,
        date: DateTime(2026, 8, 15, 14, 0),
        officerName: 'Rendi Fauzi',
        photoCount: 3,
        baselineInspectionId: 1,
        vehicleInfo: const VehicleInfo(
          brand: 'Toyota',
          type: 'Avanza',
          plateNumber: 'B 1234 ABC',
          customerName: 'Budi Santoso',
          bookingCode: '#INV-2026-101',
          purpose: 'Tasikmalaya',
          startTime: '08:00',
          endTime: '17:00',
          rentalRate: 350000,
        ),
      ),
    ];
  }
}
