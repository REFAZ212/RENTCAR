enum ItemStatus { ok, notOk, needsAttention, normal, damaged, missing }

enum ExteriorArea {
  front,
  rear,
  leftSide,
  rightSide,
  roof,
  glass,
  lights,
  tires,
}

enum InteriorArea {
  dashboard,
  frontSeat,
  rearSeat,
  carpet,
  trunk,
  ac,
  audio,
  otherInterior,
}

enum EngineArea {
  engineCondition,
  oil,
  radiatorWater,
  battery,
  leakage,
  visibleComponents,
}

enum CompletenessItem {
  key,
  stnk,
  spareTire,
  jack,
  wheelWrench,
  ac,
}

enum DamageType {
  scratch,
  dent,
  crack,
  broken,
  paintPeeling,
  lightBroken,
  glassBroken,
  tireBroken,
  other,
}

class InspectionItem {
  final String id;
  final String inspectionId;
  final String category;
  final String name;
  final ItemStatus status;
  final String? note;
  final List<String> photoIds;
  final DamageType? damageType;
  final String? damageDescription;

  const InspectionItem({
    required this.id,
    required this.inspectionId,
    required this.category,
    required this.name,
    this.status = ItemStatus.ok,
    this.note,
    this.photoIds = const [],
    this.damageType,
    this.damageDescription,
  });

  bool get isOk => status == ItemStatus.ok || status == ItemStatus.normal;
  bool get hasDamage =>
      status == ItemStatus.notOk ||
      status == ItemStatus.damaged ||
      status == ItemStatus.missing;
  bool get needsNote => hasDamage;

  String get statusLabel {
    switch (status) {
      case ItemStatus.ok:
      case ItemStatus.normal:
        return 'OK';
      case ItemStatus.notOk:
      case ItemStatus.damaged:
        return 'Tidak OK';
      case ItemStatus.needsAttention:
        return 'Perlu Perhatian';
      case ItemStatus.missing:
        return 'Tidak Ada';
    }
  }

  InspectionItem copyWith({
    String? id,
    String? inspectionId,
    String? category,
    String? name,
    ItemStatus? status,
    String? note,
    List<String>? photoIds,
    DamageType? damageType,
    String? damageDescription,
  }) {
    return InspectionItem(
      id: id ?? this.id,
      inspectionId: inspectionId ?? this.inspectionId,
      category: category ?? this.category,
      name: name ?? this.name,
      status: status ?? this.status,
      note: note ?? this.note,
      photoIds: photoIds ?? this.photoIds,
      damageType: damageType ?? this.damageType,
      damageDescription: damageDescription ?? this.damageDescription,
    );
  }

  factory InspectionItem.fromJson(Map<String, dynamic> json) {
    return InspectionItem(
      id: json['id'] ?? '',
      inspectionId: json['inspection_id'] ?? '',
      category: json['category'] ?? '',
      name: json['name'] ?? '',
      status: ItemStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => ItemStatus.ok,
      ),
      note: json['note'],
      photoIds: List<String>.from(json['photo_ids'] ?? []),
      damageType: json['damage_type'] != null
          ? DamageType.values.firstWhere(
              (e) => e.name == json['damage_type'],
              orElse: () => DamageType.other,
            )
          : null,
      damageDescription: json['damage_description'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'inspection_id': inspectionId,
      'category': category,
      'name': name,
      'status': status.name,
      'note': note,
      'photo_ids': photoIds,
      'damage_type': damageType?.name,
      'damage_description': damageDescription,
    };
  }
}
