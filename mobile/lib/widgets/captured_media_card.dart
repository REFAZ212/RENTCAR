import 'dart:io';

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../models/gps_location.dart';

class CapturedMediaCard extends StatelessWidget {
  final bool isPhoto;
  final String filePath;
  final GpsLocation gps;
  final String label;
  final Duration? videoDuration;
  final VoidCallback onView;
  final VoidCallback onRetake;

  const CapturedMediaCard({
    super.key,
    required this.isPhoto,
    required this.filePath,
    required this.gps,
    required this.label,
    this.videoDuration,
    required this.onView,
    required this.onRetake,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.successLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.success.withAlpha(70)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildThumbnail(),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      isPhoto
                          ? Icons.photo_camera_outlined
                          : Icons.videocam_outlined,
                      size: 15,
                      color: AppColors.success,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const Spacer(),
                    if (!isPhoto)
                      Text(
                        _formatDuration(videoDuration ?? Duration.zero),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.success,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                const Row(
                  children: [
                    Icon(Icons.check_circle,
                        size: 13, color: AppColors.success),
                    SizedBox(width: 4),
                    Text(
                      '✓ Tersimpan',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.success,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.schedule_outlined,
                        size: 12, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      '${gps.humanDate} • ${gps.humanTime}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    const Icon(Icons.gps_fixed,
                        size: 12, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        '${gps.coordinatesLabel} (${gps.accuracyLabel})',
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.textSecondary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onView,
                        icon: const Icon(Icons.visibility_outlined, size: 16),
                        label: const Text('Lihat'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onRetake,
                        icon: const Icon(Icons.refresh, size: 16),
                        label: Text(
                          isPhoto ? 'Ambil Ulang' : 'Rekam Ulang',
                          style: const TextStyle(fontSize: 12),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.warning,
                          side: const BorderSide(color: AppColors.warning),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildThumbnail() {
    final placeholder = Container(
      width: 72,
      height: 72,
      decoration: BoxDecoration(
        color: isPhoto ? AppColors.primary50 : AppColors.infoLight,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(
        isPhoto ? Icons.photo : Icons.movie_outlined,
        color: isPhoto ? AppColors.primary : AppColors.info,
        size: 28,
      ),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(
        width: 72,
        height: 72,
        child: isPhoto
            ? Image.file(
                File(filePath),
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => placeholder,
              )
            : Stack(
                fit: StackFit.expand,
                children: [
                  Image.file(
                    File(filePath),
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => placeholder,
                  ),
                  Container(
                    color: Colors.black38,
                    child: const Icon(Icons.play_circle_outline,
                        color: Colors.white, size: 28),
                  ),
                ],
              ),
      ),
    );
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes.toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}
