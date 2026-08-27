enum TaskStatus { notStarted, inProgress, done, late }

enum TaskPriority { normal, important, urgent }

enum TaskType {
  inspectionBefore,
  inspectionAfter,
  deliverVehicle,
  pickupVehicle,
  checkCleanliness,
  checkFuel,
  deliverToCustomer,
  pickupFromCustomer,
}

class TaskModel {
  final int id;
  final String title;
  final String? vehicleName;
  final String? plateNumber;
  final String? customerName;
  final DateTime? dueTime;
  final String? location;
  final TaskStatus status;
  final TaskPriority priority;
  final TaskType type;
  final String? notes;
  final int? inspectionId;

  const TaskModel({
    required this.id,
    required this.title,
    this.vehicleName,
    this.plateNumber,
    this.customerName,
    this.dueTime,
    this.location,
    this.status = TaskStatus.notStarted,
    this.priority = TaskPriority.normal,
    required this.type,
    this.notes,
    this.inspectionId,
  });

  String get statusLabel {
    switch (status) {
      case TaskStatus.notStarted:
        return 'Belum Dikerjakan';
      case TaskStatus.inProgress:
        return 'Sedang Dikerjakan';
      case TaskStatus.done:
        return 'Selesai';
      case TaskStatus.late:
        return 'Terlambat';
    }
  }

  String get priorityLabel {
    switch (priority) {
      case TaskPriority.normal:
        return 'Normal';
      case TaskPriority.important:
        return 'Penting';
      case TaskPriority.urgent:
        return 'Mendesak';
    }
  }

  String get typeLabel {
    switch (type) {
      case TaskType.inspectionBefore:
        return 'Inspeksi Sebelum Sewa';
      case TaskType.inspectionAfter:
        return 'Inspeksi Sesudah Sewa';
      case TaskType.deliverVehicle:
        return 'Antar Kendaraan';
      case TaskType.pickupVehicle:
        return 'Jemput Kendaraan';
      case TaskType.checkCleanliness:
        return 'Cek Kebersihan';
      case TaskType.checkFuel:
        return 'Cek Bensin';
      case TaskType.deliverToCustomer:
        return 'Antar ke Customer';
      case TaskType.pickupFromCustomer:
        return 'Ambil dari Customer';
    }
  }

  bool get isDone => status == TaskStatus.done;
  bool get isUrgent => priority == TaskPriority.urgent;

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      vehicleName: json['vehicle_name'],
      plateNumber: json['plate_number'],
      customerName: json['customer_name'],
      dueTime:
          json['due_time'] != null ? DateTime.parse(json['due_time']) : null,
      location: json['location'],
      status: TaskStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => TaskStatus.notStarted,
      ),
      priority: TaskPriority.values.firstWhere(
        (e) => e.name == json['priority'],
        orElse: () => TaskPriority.normal,
      ),
      type: TaskType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => TaskType.inspectionBefore,
      ),
      notes: json['notes'],
      inspectionId: json['inspection_id'],
    );
  }
}
