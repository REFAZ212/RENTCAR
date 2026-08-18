import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../models/inspection_model.dart';

class InspectionSummary extends StatelessWidget {
  final InspectionModel inspection;
  final int? totalItems;
  final int? unchangedItems;
  final int? changedItems;
  final int? newDamageCount;

  const InspectionSummary({
    super.key,
    required this.inspection,
    this.totalItems,
    this.unchangedItems,
    this.changedItems,
    this.newDamageCount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Ringkasan Inspeksi',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 14),
          _buildSummaryRow(
            'Data Umum',
            Icons.person_outline,
            AppColors.success,
            'Lengkap',
          ),
          _buildSummaryRow(
            'Kelengkapan',
            Icons.checklist_outlined,
            AppColors.success,
            '${inspection.items.where((i) => i.category == 'completeness' && i.isOk).length} / ${inspection.items.where((i) => i.category == 'completeness').length}',
          ),
          _buildSummaryRow(
            'Bensin',
            Icons.local_gas_station_outlined,
            AppColors.success,
            inspection.fuelInfo != null
                ? '${inspection.fuelInfo!.levelLabel} ${inspection.fuelInfo!.liter != null ? '${inspection.fuelInfo!.liter!.toStringAsFixed(0)} L' : ''}'
                : '-',
          ),
          _buildSummaryRow(
            'Odometer',
            Icons.speed_outlined,
            AppColors.success,
            inspection.odometerInfo?.displayValue ?? '-',
          ),
          _buildSummaryRow(
            'Dokumentasi',
            Icons.camera_alt_outlined,
            AppColors.success,
            '${inspection.photos.length} Foto  |  ${inspection.videos.length} Video',
          ),
          if (inspection.damages.isNotEmpty)
            _buildSummaryRow(
              'Kerusakan',
              Icons.warning_amber_outlined,
              AppColors.error,
              '${inspection.damages.length} ditemukan',
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(
    String label,
    IconData icon,
    Color color,
    String value,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: color.withAlpha(20),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              value,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
