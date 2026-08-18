import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class InspectionStatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  final Color? backgroundColor;
  final double fontSize;
  final bool small;

  const InspectionStatusBadge({
    super.key,
    required this.label,
    required this.color,
    this.backgroundColor,
    this.fontSize = 11,
    this.small = false,
  });

  factory InspectionStatusBadge.beforeRental() {
    return InspectionStatusBadge(
      label: 'Sebelum Sewa',
      color: AppColors.primary,
      backgroundColor: AppColors.primary50,
    );
  }

  factory InspectionStatusBadge.afterRental() {
    return InspectionStatusBadge(
      label: 'Sesudah Sewa',
      color: AppColors.warning,
      backgroundColor: AppColors.warningLight,
    );
  }

  factory InspectionStatusBadge.draft() {
    return InspectionStatusBadge(
      label: 'Belum Dimulai',
      color: AppColors.textSecondary,
      backgroundColor: AppColors.textSecondary.withAlpha(20),
    );
  }

  factory InspectionStatusBadge.inProgress() {
    return InspectionStatusBadge(
      label: 'Berlangsung',
      color: AppColors.warning,
      backgroundColor: AppColors.warningLight,
    );
  }

  factory InspectionStatusBadge.completed() {
    return InspectionStatusBadge(
      label: 'Selesai',
      color: AppColors.success,
      backgroundColor: AppColors.successLight,
    );
  }

  factory InspectionStatusBadge.syncPending() {
    return InspectionStatusBadge(
      label: 'Menunggu Sync',
      color: AppColors.info,
      backgroundColor: AppColors.infoLight,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: small
          ? const EdgeInsets.symmetric(horizontal: 6, vertical: 2)
          : const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: backgroundColor ?? color.withAlpha(20),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
