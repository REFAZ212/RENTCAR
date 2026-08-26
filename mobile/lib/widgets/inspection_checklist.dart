import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../models/inspection_item_model.dart';

class InspectionChecklist extends StatelessWidget {
  final String title;
  final List<InspectionItem> items;
  final ValueChanged<InspectionItem>? onItemChanged;
  final bool showStatus;

  const InspectionChecklist({
    super.key,
    required this.title,
    required this.items,
    this.onItemChanged,
    this.showStatus = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        ...items.map((item) => _ChecklistItem(
              item: item,
              onChanged: (status) {
                onItemChanged?.call(item.copyWith(status: status));
              },
            )),
      ],
    );
  }
}

class _ChecklistItem extends StatelessWidget {
  final InspectionItem item;
  final ValueChanged<ItemStatus>? onChanged;

  const _ChecklistItem({required this.item, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              item.name,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          if (showStatus) _buildStatusChip(),
        ],
      ),
    );
  }

  Widget _buildStatusChip() {
    final isOk =
        item.status == ItemStatus.ok || item.status == ItemStatus.normal;
    final isDamaged =
        item.status == ItemStatus.notOk || item.status == ItemStatus.damaged;
    final isMissing = item.status == ItemStatus.missing;

    Color chipColor;
    String chipLabel;
    IconData chipIcon;

    if (isOk) {
      chipColor = AppColors.success;
      chipLabel = 'OK';
      chipIcon = Icons.check_circle_outline;
    } else if (isDamaged) {
      chipColor = AppColors.error;
      chipLabel = 'Rusak';
      chipIcon = Icons.cancel_outlined;
    } else if (isMissing) {
      chipColor = AppColors.warning;
      chipLabel = 'Tidak Ada';
      chipIcon = Icons.remove_circle_outline;
    } else {
      chipColor = AppColors.textSecondary;
      chipLabel = item.statusLabel;
      chipIcon = Icons.help_outline;
    }

    return GestureDetector(
      onTap: () {
        // Cycle through: OK -> Missing -> Damaged -> OK
        ItemStatus nextStatus;
        if (isOk) {
          nextStatus = ItemStatus.missing;
        } else if (isMissing) {
          nextStatus = ItemStatus.damaged;
        } else {
          nextStatus = ItemStatus.ok;
        }
        onChanged?.call(nextStatus);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: chipColor.withAlpha(20),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(chipIcon, size: 14, color: chipColor),
            const SizedBox(width: 4),
            Text(
              chipLabel,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: chipColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool get showStatus => true;
}
