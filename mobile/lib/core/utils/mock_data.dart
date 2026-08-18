import '../../models/user_model.dart';
import '../../models/vehicle_model.dart';
import '../../models/inspection_model.dart';
import '../../models/task_model.dart';
import '../../models/notification_model.dart';

class MockData {
  MockData._();

  static final currentUser = UserModel(
    id: 1,
    name: 'Rendi Fauzi',
    email: 'rendi@udin-renctcar.com',
    phone: '081234567890',
    role: UserRole.supir,
  );

  static final vehicles = [
    VehicleModel(
      id: 1,
      brand: 'Toyota',
      type: 'Avanza',
      plateNumber: 'B 1234 ABC',
      year: '2023',
      color: 'Putih',
      status: VehicleStatus.rented,
      customerName: 'Budi Santoso',
      rentalStart: DateTime(2026, 8, 13),
      rentalEnd: DateTime(2026, 8, 15),
    ),
    const VehicleModel(
      id: 2,
      brand: 'Honda',
      type: 'Brio',
      plateNumber: 'B 5678 DEF',
      year: '2024',
      color: 'Hitam',
      status: VehicleStatus.available,
    ),
    VehicleModel(
      id: 3,
      brand: 'Toyota',
      type: 'Innova',
      plateNumber: 'B 9012 GHI',
      year: '2022',
      color: 'Silver',
      status: VehicleStatus.rented,
      customerName: 'Andi Wijaya',
      rentalStart: DateTime(2026, 8, 12),
      rentalEnd: DateTime(2026, 8, 14),
    ),
    const VehicleModel(
      id: 4,
      brand: 'Daihatsu',
      type: 'Xenia',
      plateNumber: 'B 3456 JKL',
      year: '2023',
      color: 'Merah',
      status: VehicleStatus.maintenance,
    ),
  ];

  static final inspections = [
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
    ),
  ];

  static final tasks = [
    TaskModel(
      id: 1,
      title: 'Inspeksi Sesudah Sewa',
      vehicleName: 'Toyota Avanza',
      plateNumber: 'B 1234 ABC',
      customerName: 'Budi Santoso',
      dueTime: DateTime(2026, 8, 15, 15, 0),
      location: 'Pool Bandung',
      status: TaskStatus.inProgress,
      priority: TaskPriority.important,
      type: TaskType.inspectionAfter,
    ),
    TaskModel(
      id: 2,
      title: 'Antar Kendaraan ke Customer',
      vehicleName: 'Honda Brio',
      plateNumber: 'B 5678 DEF',
      customerName: 'Siti Rahayu',
      dueTime: DateTime(2026, 8, 15, 10, 0),
      location: 'Jl. Dago No. 15',
      status: TaskStatus.done,
      priority: TaskPriority.normal,
      type: TaskType.deliverToCustomer,
    ),
    TaskModel(
      id: 3,
      title: 'Cek Bensin Toyota Innova',
      vehicleName: 'Toyota Innova',
      plateNumber: 'B 9012 GHI',
      dueTime: DateTime(2026, 8, 15, 16, 0),
      location: 'Pool Bandung',
      status: TaskStatus.notStarted,
      priority: TaskPriority.normal,
      type: TaskType.checkFuel,
    ),
    TaskModel(
      id: 4,
      title: 'Inspeksi Sebelum Sewa',
      vehicleName: 'Daihatsu Xenia',
      plateNumber: 'B 3456 JKL',
      customerName: 'Rudi Hermawan',
      dueTime: DateTime(2026, 8, 16, 8, 0),
      location: 'Pool Bandung',
      status: TaskStatus.notStarted,
      priority: TaskPriority.urgent,
      type: TaskType.inspectionBefore,
    ),
  ];

  static final notifications = [
    AppNotification(
      id: 1,
      title: 'Tugas Baru',
      message:
          'Anda mendapat tugas inspeksi sesudah sewa Toyota Avanza B 1234 ABC',
      type: NotificationType.task,
      createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
    ),
    AppNotification(
      id: 2,
      title: 'Inspeksi Mendatang',
      message: 'Inspeksi setelah sewa dijadwalkan pukul 15:00',
      type: NotificationType.inspection,
      createdAt: DateTime.now().subtract(const Duration(hours: 1)),
    ),
    AppNotification(
      id: 3,
      title: 'Tugas Selesai',
      message: 'Inspeksi sebelum sewa Toyota Avanza telah selesai',
      type: NotificationType.task,
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
      isRead: true,
    ),
    AppNotification(
      id: 4,
      title: 'Pengingat',
      message: 'Jangan lupa melakukan inspeksi sesudah sewa hari ini',
      type: NotificationType.system,
      createdAt: DateTime.now().subtract(const Duration(hours: 5)),
      isRead: true,
    ),
  ];

  static int get todayTasks => tasks.where((t) => !t.isDone).length;
  static int get todayInspections =>
      inspections.where((i) => i.isCompleted).length;
  static int get pendingInspections =>
      inspections.where((i) => !i.isCompleted).length;
  static int get unreadNotifications =>
      notifications.where((n) => !n.isRead).length;
}
