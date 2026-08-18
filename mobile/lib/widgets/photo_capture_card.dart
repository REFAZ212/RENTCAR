import 'dart:io';

import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class PhotoCaptureCard extends StatelessWidget {
  final String category;
  final String? photoPath;
  final VoidCallback? onCapture;
  final VoidCallback? onDelete;
  final bool isRequired;
  final bool isCompact;

  const PhotoCaptureCard({
    super.key,
    required this.category,
    this.photoPath,
    this.onCapture,
    this.onDelete,
    this.isRequired = false,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    final hasPhoto = photoPath != null && photoPath!.isNotEmpty;

    if (isCompact) {
      return _buildCompact(hasPhoto);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: hasPhoto
              ? AppColors.success.withAlpha(80)
              : isRequired
                  ? AppColors.warning.withAlpha(80)
                  : AppColors.border,
        ),
      ),
      child: Row(
        children: [
          _buildThumbnail(hasPhoto),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      category,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (isRequired) ...[
                      const SizedBox(width: 4),
                      const Text(
                        '*',
                        style: TextStyle(
                          color: AppColors.error,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  hasPhoto ? 'Tersedia' : (isRequired ? 'Wajib' : 'Opsional'),
                  style: TextStyle(
                    fontSize: 11,
                    color: hasPhoto ? AppColors.success : AppColors.textHint,
                  ),
                ),
              ],
            ),
          ),
          if (hasPhoto)
            IconButton(
              onPressed: onDelete,
              icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            )
          else
            IconButton(
              onPressed: onCapture,
              icon: const Icon(Icons.camera_alt_outlined, size: 18, color: AppColors.primary),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
        ],
      ),
    );
  }

  Widget _buildCompact(bool hasPhoto) {
    return GestureDetector(
      onTap: hasPhoto ? null : onCapture,
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          color: hasPhoto ? AppColors.successLight : AppColors.background,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: hasPhoto
                ? AppColors.success
                : isRequired
                    ? AppColors.warning
                    : AppColors.border,
            width: hasPhoto ? 2 : 1,
          ),
          image: hasPhoto
              ? DecorationImage(
                  image: _resolveImage(photoPath!),
                  fit: BoxFit.cover,
                )
              : null,
        ),
        child: hasPhoto
            ? Stack(
                children: [
                  Positioned(
                    top: 4,
                    right: 4,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: AppColors.success,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.check, size: 10, color: Colors.white),
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.camera_alt_outlined,
                    size: 20,
                    color: isRequired ? AppColors.warning : AppColors.textHint,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    category,
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w500,
                      color: isRequired ? AppColors.warning : AppColors.textHint,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildThumbnail(bool hasPhoto) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: hasPhoto ? AppColors.successLight : AppColors.background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: hasPhoto
          ? ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image(
                image: _resolveImage(photoPath!),
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.check_circle,
                  color: AppColors.success,
                  size: 24,
                ),
              ),
            )
          : const Icon(
              Icons.camera_alt_outlined,
              color: AppColors.textHint,
              size: 22,
            ),
    );
  }

  ImageProvider _resolveImage(String path) {
    final file = File(path);
    if (file.existsSync()) {
      return FileImage(file);
    }
    return NetworkImage(path);
  }
}
