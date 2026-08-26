import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../models/inspection_model.dart';
import '../../../models/inspection_item_model.dart';

class StepReview extends StatelessWidget {
  final InspectionModel inspection;
  final List<InspectionItem> completenessItems;
  final String fuelLevel;
  final double? fuelLiter;
  final double? odometerValue;
  final bool hasMainPhoto;
  final bool hasOverviewVideo;
  final bool hasGps;
  final VoidCallback onComplete;
  final ValueChanged<int> onGoToStep;

  const StepReview({
    super.key,
    required this.inspection,
    required this.completenessItems,
    required this.fuelLevel,
    this.fuelLiter,
    this.odometerValue,
    this.hasMainPhoto = false,
    this.hasOverviewVideo = false,
    this.hasGps = false,
    required this.onComplete,
    required this.onGoToStep,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildValidationStatus(),
          const SizedBox(height: 14),
          _buildGeneralDataSummary(),
          const SizedBox(height: 10),
          _buildCompletenessSummary(),
          const SizedBox(height: 10),
          _buildFuelSummary(),
          const SizedBox(height: 10),
          _buildOdometerSummary(),
          const SizedBox(height: 10),
          _buildDocumentationSummary(),
          const SizedBox(height: 10),
          _buildDamageSummary(),
          const SizedBox(height: 20),
          _buildActionButtons(context),
        ],
      ),
    );
  }

  Widget _buildValidationStatus() {
    final issues = _getValidationIssues();
    final isValid = issues.isEmpty;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isValid ? AppColors.successLight : AppColors.warningLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isValid ? AppColors.success : AppColors.warning,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isValid ? Icons.check_circle : Icons.warning_amber,
                color: isValid ? AppColors.success : AppColors.warning,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isValid
                      ? 'Inspeksi siap diselesaikan'
                      : '${issues.length} data belum lengkap',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isValid ? AppColors.success : AppColors.warning,
                  ),
                ),
              ),
            ],
          ),
          if (!isValid) ...[
            const SizedBox(height: 8),
            ...issues.map((issue) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: GestureDetector(
                    onTap: () => onGoToStep(issue.stepIndex),
                    child: Row(
                      children: [
                        const Icon(Icons.chevron_right,
                            size: 14, color: AppColors.warning),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            issue.message,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.warning,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildGeneralDataSummary() {
    return _buildSummaryCard(
      'Data Umum',
      Icons.person_outline,
      AppColors.success,
      'Lengkap',
      () => onGoToStep(0),
    );
  }

  Widget _buildCompletenessSummary() {
    final okCount = completenessItems.where((i) => i.isOk).length;
    return _buildSummaryCard(
      'Kelengkapan',
      Icons.checklist_outlined,
      AppColors.success,
      '$okCount / ${completenessItems.length}',
      () => onGoToStep(1),
    );
  }

  Widget _buildFuelSummary() {
    final levelLabel = _getFuelLevelLabel(fuelLevel);
    return _buildSummaryCard(
      'Bensin',
      Icons.local_gas_station_outlined,
      AppColors.success,
      '$levelLabel${fuelLiter != null ? ' ${fuelLiter!.toStringAsFixed(0)} L' : ''}',
      () => onGoToStep(2),
    );
  }

  Widget _buildOdometerSummary() {
    final displayValue = odometerValue != null
        ? '${odometerValue!.toStringAsFixed(0).replaceAll(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), '.')} KM'
        : '-';
    return _buildSummaryCard(
      'Odometer',
      Icons.speed_outlined,
      odometerValue != null ? AppColors.success : AppColors.warning,
      displayValue,
      () => onGoToStep(3),
    );
  }

  Widget _buildDocumentationSummary() {
    final complete = hasMainPhoto && hasOverviewVideo && hasGps;
    return _buildSummaryCard(
      'Dokumentasi',
      Icons.camera_alt_outlined,
      complete ? AppColors.success : AppColors.warning,
      complete ? 'Lengkap' : 'Belum Lengkap',
      () => onGoToStep(3),
    );
  }

  Widget _buildDamageSummary() {
    final damages = inspection.damages;
    return _buildSummaryCard(
      'Kerusakan',
      Icons.warning_amber_outlined,
      damages.isNotEmpty ? AppColors.error : AppColors.success,
      damages.isNotEmpty ? '${damages.length} ditemukan' : 'Tidak ada',
      null,
    );
  }

  Widget _buildSummaryCard(
    String title,
    IconData icon,
    Color color,
    String value,
    VoidCallback? onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withAlpha(20),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(icon, size: 16, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
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
            if (onTap != null) ...[
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right,
                  size: 16, color: AppColors.textHint),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: () => onGoToStep(0),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child:
                const Text('Kembali Periksa', style: TextStyle(fontSize: 14)),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton(
            onPressed: onComplete,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: const Text('Selesaikan Inspeksi',
                style: TextStyle(fontSize: 14)),
          ),
        ),
      ],
    );
  }

  String _getFuelLevelLabel(String level) {
    switch (level) {
      case 'full':
        return 'FULL';
      case '3/4':
        return '3/4';
      case '1/2':
        return '1/2';
      case '1/4':
        return '1/4';
      case 'empty':
        return 'EMPTY';
      default:
        return level;
    }
  }

  List<_ValidationIssue> _getValidationIssues() {
    final issues = <_ValidationIssue>[];

    if (odometerValue == null) {
      issues.add(const _ValidationIssue('Odometer belum diisi', 3));
    }

    if (!hasMainPhoto) {
      issues.add(const _ValidationIssue('Foto kendaraan belum diambil', 3));
    }
    if (!hasOverviewVideo) {
      issues.add(const _ValidationIssue('Video kendaraan belum direkam', 3));
    }
    if (!hasGps) {
      issues.add(const _ValidationIssue('Lokasi GPS belum valid', 3));
    }

    return issues;
  }
}

class _ValidationIssue {
  final String message;
  final int stepIndex;

  const _ValidationIssue(this.message, this.stepIndex);
}
