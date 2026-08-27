import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../models/damage_model.dart';

class DamageCard extends StatelessWidget {
  final Damage damage;
  final VoidCallback? onTap;
  final bool showComparison;

  const DamageCard({
    super.key,
    required this.damage,
    this.onTap,
    this.showComparison = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.error.withAlpha(60)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.errorLight,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Icon(
                    Icons.warning_amber_rounded,
                    size: 14,
                    color: AppColors.error,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    damage.area,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.errorLight,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    damage.typeLabel,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
            if (damage.description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                damage.description,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
            if (showComparison && damage.isNewDamage) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'KERUSAKAN BARU',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppColors.error,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
