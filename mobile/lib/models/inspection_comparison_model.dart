enum ComparisonStatus { unchanged, changed, newDamage }

class InspectionComparison {
  final String itemId;
  final String itemName;
  final String category;
  final String beforeStatus;
  final String afterStatus;
  final ComparisonStatus comparisonStatus;
  final String? beforePhotoId;
  final String? afterPhotoId;
  final String? note;

  const InspectionComparison({
    required this.itemId,
    required this.itemName,
    required this.category,
    required this.beforeStatus,
    required this.afterStatus,
    required this.comparisonStatus,
    this.beforePhotoId,
    this.afterPhotoId,
    this.note,
  });

  String get statusLabel {
    switch (comparisonStatus) {
      case ComparisonStatus.unchanged:
        return 'Tidak Berubah';
      case ComparisonStatus.changed:
        return 'Perubahan Ditemukan';
      case ComparisonStatus.newDamage:
        return 'Kerusakan Baru';
    }
  }

  bool get hasChange => comparisonStatus != ComparisonStatus.unchanged;

  factory InspectionComparison.fromJson(Map<String, dynamic> json) {
    return InspectionComparison(
      itemId: json['item_id'] ?? '',
      itemName: json['item_name'] ?? '',
      category: json['category'] ?? '',
      beforeStatus: json['before_status'] ?? '',
      afterStatus: json['after_status'] ?? '',
      comparisonStatus: ComparisonStatus.values.firstWhere(
        (e) => e.name == json['comparison_status'],
        orElse: () => ComparisonStatus.unchanged,
      ),
      beforePhotoId: json['before_photo_id'],
      afterPhotoId: json['after_photo_id'],
      note: json['note'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'item_id': itemId,
      'item_name': itemName,
      'category': category,
      'before_status': beforeStatus,
      'after_status': afterStatus,
      'comparison_status': comparisonStatus.name,
      'before_photo_id': beforePhotoId,
      'after_photo_id': afterPhotoId,
      'note': note,
    };
  }
}
