import 'package:flutter/material.dart';

import '../core/constants/app_colors.dart';
import '../models/gps_location.dart';

enum GpsStatus { searching, accurate, weak, error, denied }

class GpsStatusIndicator extends StatelessWidget {
  final GpsStatus status;
  final GpsLocation? location;
  final String? message;

  const GpsStatusIndicator({
    super.key,
    required this.status,
    this.location,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    final (IconData icon, Color color, String label) = switch (status) {
      GpsStatus.accurate => (
          Icons.gps_fixed,
          AppColors.success,
          'Akurat ${location?.accuracyLabel ?? '±5 m'}',
        ),
      GpsStatus.searching => (
          Icons.gps_not_fixed,
          AppColors.info,
          'Mencari lokasi...',
        ),
      GpsStatus.weak => (
          Icons.gps_off,
          AppColors.warning,
          'GPS kurang akurat ${location?.accuracyLabel ?? '±48 m'}',
        ),
      GpsStatus.denied => (
          Icons.location_off_outlined,
          AppColors.error,
          'Izin lokasi ditolak',
        ),
      GpsStatus.error => (
          Icons.location_disabled_outlined,
          AppColors.error,
          'GPS tidak tersedia',
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(24),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(90)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              message ?? label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: color,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
