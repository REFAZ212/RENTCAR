import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../models/inspection_comparison_model.dart';

class ComparisonCard extends StatelessWidget {
  final InspectionComparison comparison;
  final VoidCallback? onTap;

  const ComparisonCard({
    super.key,
    required this.comparison,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final hasChange = comparison.hasChange;
    final isNew = comparison.comparisonStatus == ComparisonStatus.newDamage;

    Color statusColor;
    String statusLabel;
    IconData statusIcon;

    if (isNew) {
      statusColor = AppColors.error;
      statusLabel = 'PERUBAHAN BARU';
      statusIcon = Icons.cancel_outlined;
    } else if (hasChange) {
      statusColor = AppColors.warning;
      statusLabel = 'PERUBAHAN DITEMUKAN';
      statusIcon = Icons.warning_amber_outlined;
    } else {
      statusColor = AppColors.success;
      statusLabel = 'TIDAK BERUBAH';
      statusIcon = Icons.check_circle_outline;
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: hasChange ? statusColor.withAlpha(60) : AppColors.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    comparison.itemName,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Icon(statusIcon, size: 16, color: statusColor),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildConditionBox(
                    'SEBELUM',
                    comparison.beforeStatus,
                    AppColors.info,
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    'VS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHint,
                    ),
                  ),
                ),
                Expanded(
                  child: _buildConditionBox(
                    'SESUDAH',
                    comparison.afterStatus,
                    hasChange ? AppColors.warning : AppColors.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withAlpha(20),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                statusLabel,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: statusColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConditionBox(String label, String condition, Color color) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withAlpha(10),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withAlpha(40)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            condition,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
