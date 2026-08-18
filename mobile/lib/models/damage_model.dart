import 'inspection_item_model.dart';

class Damage {
  final String id;
  final String inspectionId;
  final String area;
  final DamageType type;
  final String description;
  final List<String> photoIds;
  final bool isNewDamage;
  final String? beforeCondition;
  final String? afterCondition;

  const Damage({
    required this.id,
    required this.inspectionId,
    required this.area,
    required this.type,
    required this.description,
    this.photoIds = const [],
    this.isNewDamage = false,
    this.beforeCondition,
    this.afterCondition,
  });

  String get typeLabel {
    switch (type) {
      case DamageType.scratch:
        return 'Lecet';
      case DamageType.dent:
        return 'Penyok';
      case DamageType.crack:
        return 'Retak';
      case DamageType.broken:
        return 'Pecah';
      case DamageType.paintPeeling:
        return 'Cat Terkelupas';
      case DamageType.lightBroken:
        return 'Lampu Rusak';
      case DamageType.glassBroken:
        return 'Kaca Rusak';
      case DamageType.tireBroken:
        return 'Ban Rusak';
      case DamageType.other:
        return 'Lainnya';
    }
  }

  Damage copyWith({
    String? id,
    String? inspectionId,
    String? area,
    DamageType? type,
    String? description,
    List<String>? photoIds,
    bool? isNewDamage,
    String? beforeCondition,
    String? afterCondition,
  }) {
    return Damage(
      id: id ?? this.id,
      inspectionId: inspectionId ?? this.inspectionId,
      area: area ?? this.area,
      type: type ?? this.type,
      description: description ?? this.description,
      photoIds: photoIds ?? this.photoIds,
      isNewDamage: isNewDamage ?? this.isNewDamage,
      beforeCondition: beforeCondition ?? this.beforeCondition,
      afterCondition: afterCondition ?? this.afterCondition,
    );
  }

  factory Damage.fromJson(Map<String, dynamic> json) {
    return Damage(
      id: json['id'] ?? '',
      inspectionId: json['inspection_id'] ?? '',
      area: json['area'] ?? '',
      type: DamageType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => DamageType.other,
      ),
      description: json['description'] ?? '',
      photoIds: List<String>.from(json['photo_ids'] ?? []),
      isNewDamage: json['is_new_damage'] ?? false,
      beforeCondition: json['before_condition'],
      afterCondition: json['after_condition'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'inspection_id': inspectionId,
      'area': area,
      'type': type.name,
      'description': description,
      'photo_ids': photoIds,
      'is_new_damage': isNewDamage,
      'before_condition': beforeCondition,
      'after_condition': afterCondition,
    };
  }
}
