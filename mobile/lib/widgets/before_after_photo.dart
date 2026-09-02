import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class BeforeAfterPhoto extends StatelessWidget {
  final String? beforePhoto;
  final String? afterPhoto;
  final String label;
  final VoidCallback? onCompare;

  const BeforeAfterPhoto({
    super.key,
    this.beforePhoto,
    this.afterPhoto,
    required this.label,
    this.onCompare,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
                child: _buildPhotoBox('SEBELUM', beforePhoto, AppColors.info)),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: Column(
                children: [
                  Text(
                    'VS',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHint,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
                child:
                    _buildPhotoBox('SESUDAH', afterPhoto, AppColors.warning)),
          ],
        ),
        if (onCompare != null) ...[
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: onCompare,
              icon: const Icon(Icons.compare_arrows, size: 16),
              label: const Text('Bandingkan'),
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
        ],
      ],
    );
  }

  Widget _buildPhotoBox(String label, String? photoPath, Color color) {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: color.withAlpha(10),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withAlpha(40)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          const SizedBox(height: 8),
          if (photoPath != null && photoPath.isNotEmpty)
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.network(
                  photoPath,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  errorBuilder: (_, __, ___) => Icon(
                    Icons.image_outlined,
                    size: 28,
                    color: color,
                  ),
                ),
              ),
            )
          else
            Icon(
              Icons.image_outlined,
              size: 28,
              color: color,
            ),
        ],
      ),
    );
  }
}
