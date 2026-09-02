import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../models/inspection_item_model.dart';
import '../../../widgets/inspection_section.dart';

class StepCompleteness extends StatelessWidget {
  final List<InspectionItem> items;
  final void Function(int index, InspectionItem item) onItemChanged;

  const StepCompleteness({
    super.key,
    required this.items,
    required this.onItemChanged,
  });

  @override
  Widget build(BuildContext context) {
    final completedCount = items.where((i) => i.isOk).length;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.checklist_outlined,
                    color: AppColors.primary, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Kelengkapan: $completedCount / ${items.length}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          InspectionSection(
            title: 'Kelengkapan Kendaraan',
            icon: Icons.checklist_outlined,
            child: Column(
              children: items.asMap().entries.map((entry) {
                final index = entry.key;
                return _CompletenessItem(
                  item: entry.value,
                  onChanged: (status) {
                    onItemChanged(index, entry.value.copyWith(status: status));
                  },
                  onNoteChanged: (note) {
                    onItemChanged(index, entry.value.copyWith(note: note));
                  },
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _CompletenessItem extends StatelessWidget {
  final InspectionItem item;
  final ValueChanged<ItemStatus> onChanged;
  final ValueChanged<String> onNoteChanged;

  const _CompletenessItem({
    required this.item,
    required this.onChanged,
    required this.onNoteChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isOk = item.status == ItemStatus.ok;
    final isMissing = item.status == ItemStatus.missing;
    final isDamaged = item.status == ItemStatus.damaged;
    final hasProblem = isMissing || isDamaged;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: hasProblem
              ? (isDamaged ? AppColors.error : AppColors.warning).withAlpha(60)
              : AppColors.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.name,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildOption('OK', ItemStatus.ok, isOk, AppColors.success),
              const SizedBox(width: 6),
              _buildOption('Tidak Ada', ItemStatus.missing, isMissing,
                  AppColors.warning),
              const SizedBox(width: 6),
              _buildOption(
                  'Rusak', ItemStatus.damaged, isDamaged, AppColors.error),
            ],
          ),
          if (hasProblem) ...[
            const SizedBox(height: 8),
            TextFormField(
              initialValue: item.note,
              decoration: InputDecoration(
                hintText: isDamaged ? 'Deskripsi kerusakan...' : 'Catatan...',
                hintStyle: const TextStyle(fontSize: 12),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
              maxLines: 2,
              onChanged: onNoteChanged,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildOption(
      String label, ItemStatus status, bool isSelected, Color color) {
    return Expanded(
      child: GestureDetector(
        onTap: () => onChanged(status),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: isSelected ? color.withAlpha(20) : AppColors.surface,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: isSelected ? color : AppColors.border,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? color : AppColors.textHint,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
