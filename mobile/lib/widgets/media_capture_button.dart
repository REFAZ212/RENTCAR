import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

class MediaCaptureButton extends StatelessWidget {
  final bool isPhoto;
  final String title;
  final String subtitle;
  final VoidCallback onPressed;

  const MediaCaptureButton({
    super.key,
    required this.isPhoto,
    required this.title,
    required this.subtitle,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final isVideo = !isPhoto;
    final color = isVideo ? AppColors.info : AppColors.primary;

    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: color.withAlpha(12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withAlpha(50)),
        ),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isVideo ? Icons.videocam : Icons.photo_camera,
                color: Colors.white,
                size: 26,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onPressed,
              icon: Icon(
                isVideo ? Icons.fiber_manual_record : Icons.camera_alt_outlined,
                size: 16,
                color: isVideo ? AppColors.error : color,
              ),
              label: Text(isVideo ? 'Rekam Video' : 'Ambil Foto'),
              style: OutlinedButton.styleFrom(
                foregroundColor: color,
                side: BorderSide(color: color),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                padding:
                    const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
