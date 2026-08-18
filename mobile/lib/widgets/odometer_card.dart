import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class OdometerCard extends StatelessWidget {
  final double? value;
  final String? photoPath;
  final ValueChanged<double>? onChanged;
  final VoidCallback? onPhotoTap;

  const OdometerCard({
    super.key,
    this.value,
    this.photoPath,
    this.onChanged,
    this.onPhotoTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Kilometer/Odometer',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                initialValue: value?.toStringAsFixed(0) ?? '',
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  hintText: 'Masukkan kilometer',
                  suffixText: 'KM',
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
                onChanged: (v) {
                  final parsed = double.tryParse(v);
                  if (parsed != null) onChanged?.call(parsed);
                },
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: onPhotoTap,
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.primary.withAlpha(80)),
                ),
                child: const Icon(
                  Icons.camera_alt_outlined,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
            ),
          ],
        ),
        if (value != null) ...[
          const SizedBox(height: 8),
          Text(
            '${value!.toStringAsFixed(0).replaceAll(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), '.')} KM',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
            ),
          ),
        ],
      ],
    );
  }
}
