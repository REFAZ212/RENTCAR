import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../models/media_capture_result.dart';
import '../../../widgets/captured_media_card.dart';
import '../../../widgets/media_capture_button.dart';
import '../../../widgets/odometer_card.dart';
import '../../../widgets/photo_capture_card.dart';

class StepDocumentation extends StatelessWidget {
  final String inspectionCode;
  final PhotoCaptureResult? mainPhoto;
  final VideoCaptureResult? overviewVideo;
  final Map<String, PhotoCaptureResult> additionalPhotos;
  final double? odometerValue;
  final String fuelLevelLabel;

  final VoidCallback onCaptureMainPhoto;
  final VoidCallback onRetakeMainPhoto;
  final VoidCallback onViewMainPhoto;

  final VoidCallback onRecordVideo;
  final VoidCallback onRetakeVideo;
  final VoidCallback onViewVideo;

  final ValueChanged<String> onCaptureAdditionalPhoto;
  final ValueChanged<String> onViewAdditionalPhoto;
  final ValueChanged<String> onRemoveAdditionalPhoto;

  final ValueChanged<double> onOdometerChanged;
  final VoidCallback onOdometerPhotoTap;

  const StepDocumentation({
    super.key,
    required this.inspectionCode,
    this.mainPhoto,
    this.overviewVideo,
    this.additionalPhotos = const {},
    this.odometerValue,
    this.fuelLevelLabel = '-',
    required this.onCaptureMainPhoto,
    required this.onRetakeMainPhoto,
    required this.onViewMainPhoto,
    required this.onRecordVideo,
    required this.onRetakeVideo,
    required this.onViewVideo,
    required this.onCaptureAdditionalPhoto,
    required this.onViewAdditionalPhoto,
    required this.onRemoveAdditionalPhoto,
    required this.onOdometerChanged,
    required this.onOdometerPhotoTap,
  });

  static const _additionalCategories = ['Atap', 'Ban', 'Kerusakan'];

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildProgressHeader(),
          const SizedBox(height: 14),
          _buildMainPhotoSection(),
          const SizedBox(height: 14),
          _buildVideoSection(),
          const SizedBox(height: 14),
          _buildOdometerSection(),
          const SizedBox(height: 14),
          _buildAdditionalPhotos(),
          const SizedBox(height: 14),
          _buildFuelPhotoSection(),
        ],
      ),
    );
  }

  Widget _buildProgressHeader() {
    final mainDone = mainPhoto != null;
    final videoDone = overviewVideo != null;
    final count = (mainDone ? 1 : 0) + (videoDone ? 1 : 0);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: count == 2 ? AppColors.successLight : AppColors.warningLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: count == 2 ? AppColors.success : AppColors.warning,
        ),
      ),
      child: Row(
        children: [
          Icon(
            count == 2 ? Icons.check_circle : Icons.camera_alt_outlined,
            color: count == 2 ? AppColors.success : AppColors.warning,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Dokumentasi Wajib',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  count == 2
                      ? 'Foto & video tersimpan'
                      : '$count / 2 dokumentasi (foto & video)',
                  style: TextStyle(
                    fontSize: 12,
                    color: count == 2 ? AppColors.success : AppColors.warning,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainPhotoSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.photo_camera_outlined,
                  size: 18, color: AppColors.primary),
              SizedBox(width: 8),
              Text(
                'Foto Kendaraan',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(width: 4),
              Text(
                '*',
                style: TextStyle(
                    color: AppColors.error, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Satu foto utama seluruh kendaraan.',
            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 12),
          if (mainPhoto == null)
            MediaCaptureButton(
              isPhoto: true,
              title: 'Ambil Foto Kendaraan',
              subtitle:
                  'Foto akan otomatis menyertakan GPS, waktu, dan akurasi lokasi.',
              onPressed: onCaptureMainPhoto,
            )
          else
            CapturedMediaCard(
              isPhoto: true,
              filePath: mainPhoto!.photoPath,
              gps: mainPhoto!.gps,
              label: 'FOTO KENDARAAN',
              onView: onViewMainPhoto,
              onRetake: onRetakeMainPhoto,
            ),
        ],
      ),
    );
  }

  Widget _buildVideoSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.videocam_outlined, size: 18, color: AppColors.info),
              SizedBox(width: 8),
              Text(
                'Video Keseluruhan',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(width: 4),
              Text(
                '*',
                style: TextStyle(
                    color: AppColors.error, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Rekam video dengan mengelilingi kendaraan (30–60 detik).',
            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 12),
          if (overviewVideo == null)
            MediaCaptureButton(
              isPhoto: false,
              title: 'Rekam Video Kendaraan',
              subtitle:
                  'Kelilingi kendaraan sambil merekam keseluruhan kondisi.',
              onPressed: onRecordVideo,
            )
          else
            CapturedMediaCard(
              isPhoto: false,
              filePath: overviewVideo!.videoPath,
              gps: overviewVideo!.gps,
              label: 'VIDEO KESELURUHAN',
              videoDuration: overviewVideo!.duration,
              onView: onViewVideo,
              onRetake: onRetakeVideo,
            ),
        ],
      ),
    );
  }

  Widget _buildOdometerSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: OdometerCard(
        value: odometerValue,
        onChanged: onOdometerChanged,
        onPhotoTap: onOdometerPhotoTap,
      ),
    );
  }

  Widget _buildAdditionalPhotos() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Foto Tambahan',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ..._additionalCategories.map((category) {
            final photo = additionalPhotos[category];
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: PhotoCaptureCard(
                category: category,
                photoPath: photo?.photoPath,
                onCapture: () => onCaptureAdditionalPhoto(category),
                onDelete: () => onRemoveAdditionalPhoto(category),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildFuelPhotoSection() {
    final fuelPhoto = additionalPhotos['Bensin'];
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.local_gas_station_outlined,
                  size: 18, color: AppColors.warning),
              const SizedBox(width: 8),
              const Text(
                'Foto & Level Bensin',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.warning.withAlpha(20),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Level: $fuelLevelLabel',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.warning,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          PhotoCaptureCard(
            category: 'Fuel Gauge',
            photoPath: fuelPhoto?.photoPath,
            onCapture: () => onCaptureAdditionalPhoto('Bensin'),
            onDelete: () => onRemoveAdditionalPhoto('Bensin'),
          ),
        ],
      ),
    );
  }
}
