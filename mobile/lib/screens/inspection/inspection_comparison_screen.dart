import 'dart:io';

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../models/gps_location.dart';
import '../../models/inspection_item_model.dart';
import '../../models/inspection_model.dart';
import '../../models/inspection_video_model.dart';
import '../../services/inspection_service.dart';
import 'camera/inspection_media_viewer_screen.dart';

class InspectionComparisonScreen extends StatelessWidget {
  final InspectionModel currentInspection;

  const InspectionComparisonScreen({
    super.key,
    required this.currentInspection,
  });

  @override
  Widget build(BuildContext context) {
    final before = _getBaseline();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Perbandingan Inspeksi'),
        backgroundColor: AppColors.background,
      ),
      body: before == null
          ? const Center(
              child: Text(
                'Inspeksi sebelum sewa tidak ditemukan.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(before),
                  const SizedBox(height: 16),
                  _buildMediaComparison(context, before),
                  const SizedBox(height: 16),
                  _buildInfoComparison(before),
                  const SizedBox(height: 16),
                  _buildChecklistComparison(before),
                ],
              ),
            ),
    );
  }

  InspectionModel? _getBaseline() {
    if (currentInspection.baselineInspectionId != null) {
      return InspectionService.getById(
        currentInspection.baselineInspectionId!,
      );
    }
    if (currentInspection.bookingId != null) {
      return InspectionService.getBaselineForBooking(
        currentInspection.bookingId!,
      );
    }
    return null;
  }

  Widget _buildHeader(InspectionModel before) {
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
          Text(
            currentInspection.vehicleName,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            currentInspection.plateNumber,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _TypeChip(
                label: 'SEBELUM',
                color: AppColors.info,
                date: before.date,
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 10),
                child: Icon(Icons.compare_arrows,
                    size: 18, color: AppColors.textHint),
              ),
              _TypeChip(
                label: 'SESUDAH',
                color: AppColors.warning,
                date: currentInspection.date,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMediaComparison(BuildContext context, InspectionModel before) {
    final beforePhoto = before.photos.isNotEmpty ? before.photos.first : null;
    final afterPhoto = currentInspection.photos.isNotEmpty
        ? currentInspection.photos.first
        : null;
    final beforeVideo = before.videos.isNotEmpty ? before.videos.first : null;
    final afterVideo = currentInspection.videos.isNotEmpty
        ? currentInspection.videos.first
        : null;

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
            'DOKUMENTASI',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
              color: AppColors.textHint,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMediaBox(
                  context,
                  'SEBELUM',
                  AppColors.info,
                  beforePhoto?.filePath,
                  beforeVideo?.filePath,
                  beforePhoto?.latitude,
                  beforePhoto?.longitude,
                  beforePhoto?.accuracy,
                  beforePhoto?.timestamp,
                  beforePhoto?.timezone,
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  'VS',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textHint,
                  ),
                ),
              ),
              Expanded(
                child: _buildMediaBox(
                  context,
                  'SESUDAH',
                  AppColors.warning,
                  afterPhoto?.filePath,
                  afterVideo?.filePath,
                  afterPhoto?.latitude,
                  afterPhoto?.longitude,
                  afterPhoto?.accuracy,
                  afterPhoto?.timestamp,
                  afterPhoto?.timezone,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: beforeVideo == null
                      ? null
                      : () => _openVideo(context, beforeVideo),
                  icon: const Icon(Icons.play_circle_outline, size: 16),
                  label: const Text('Lihat Video Sebelum'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.info,
                    side: const BorderSide(color: AppColors.info),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: afterVideo == null
                      ? null
                      : () => _openVideo(context, afterVideo),
                  icon: const Icon(Icons.play_circle_outline, size: 16),
                  label: const Text('Lihat Video Sesudah'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.warning,
                    side: const BorderSide(color: AppColors.warning),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _openVideo(BuildContext context, InspectionVideo video) {
    final gps = GpsLocation(
      latitude: video.latitude ?? 0,
      longitude: video.longitude ?? 0,
      accuracy: video.accuracy ?? 0,
      capturedAt: video.timestamp,
      timezone: video.timezone ?? 'Asia/Jakarta',
    );
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => InspectionMediaViewerScreen(
          isPhoto: false,
          filePath: video.filePath,
          inspectionCode: video.inspectionId,
          gps: gps,
          videoDuration: video.duration,
        ),
      ),
    );
  }

  Widget _buildMediaBox(
    BuildContext context,
    String label,
    Color color,
    String? photoPath,
    String? videoPath,
    double? lat,
    double? lng,
    double? accuracy,
    DateTime? timestamp,
    String? timezone,
  ) {
    return GestureDetector(
      onTap: photoPath == null || photoPath.isEmpty || lat == null
          ? null
          : () => _viewPhoto(
                context,
                photoPath,
                lat,
                lng,
                accuracy,
                timestamp,
                timezone,
              ),
      child: Container(
        height: 150,
        decoration: BoxDecoration(
          color: color.withAlpha(10),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withAlpha(40)),
        ),
        child: photoPath != null && photoPath.isNotEmpty
            ? Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(9),
                    child: Image.file(
                      File(photoPath),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildPlaceholder(
                        label,
                        color,
                        'Foto tidak tersedia',
                      ),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        label,
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${timestamp?.day ?? '-'}/${timestamp?.month ?? '-'}/${timestamp?.year ?? '-'} '
                        '${timestamp?.hour.toString().padLeft(2, '0') ?? ''}:'
                        '${timestamp?.minute.toString().padLeft(2, '0') ?? ''}',
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              )
            : _buildPlaceholder(label, color, 'Belum ada foto'),
      ),
    );
  }

  Widget _buildPlaceholder(String label, Color color, String message) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        const SizedBox(height: 6),
        Icon(Icons.image_outlined, size: 28, color: color),
        const SizedBox(height: 4),
        Text(
          message,
          style: const TextStyle(fontSize: 9, color: AppColors.textHint),
        ),
      ],
    );
  }

  Widget _buildInfoComparison(InspectionModel before) {
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
            'INFORMASI',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
              color: AppColors.textHint,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _infoBox(
                  'Waktu Sebelum',
                  _formatDateTime(before.date),
                  AppColors.info,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _infoBox(
                  'Waktu Sesudah',
                  _formatDateTime(currentInspection.date),
                  AppColors.warning,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _infoBox(
                  '📍 Lokasi Sebelum',
                  before.location ?? _firstPhotoAddress(before),
                  AppColors.info,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _infoBox(
                  '📍 Lokasi Sesudah',
                  currentInspection.location ??
                      _firstPhotoAddress(currentInspection),
                  AppColors.warning,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _firstPhotoAddress(InspectionModel inspection) {
    if (inspection.photos.isNotEmpty &&
        inspection.photos.first.address != null &&
        inspection.photos.first.address!.isNotEmpty) {
      return inspection.photos.first.address!;
    }
    if (inspection.photos.isNotEmpty &&
        inspection.photos.first.latitude != null) {
      final p = inspection.photos.first;
      return '${p.latitude!.toStringAsFixed(4)}, ${p.longitude!.toStringAsFixed(4)}';
    }
    return 'Tidak tercatat';
  }

  Widget _infoBox(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withAlpha(10),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withAlpha(40)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChecklistComparison(InspectionModel before) {
    final afterItems = currentInspection.items.isNotEmpty
        ? currentInspection.items
        : [
            ...currentInspection.items,
          ];
    final beforeMap = {
      for (final i in before.items) i.name: i.status,
    };

    final items = afterItems.isEmpty ? before.items : afterItems;

    if (items.isEmpty) {
      return const SizedBox.shrink();
    }

    final changed = items.where((i) {
      final beforeStatus = beforeMap[i.name];
      return beforeStatus != null && beforeStatus != i.status;
    }).length;

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
              const Text(
                'PERBANDINGAN CHECKLIST',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                  color: AppColors.textHint,
                ),
              ),
              const Spacer(),
              if (changed > 0)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withAlpha(20),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '$changed perubahan',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.warning,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          ...items.map((item) {
            final beforeStatus = beforeMap[item.name];
            final isSame = beforeStatus == item.status;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(
                    isSame
                        ? Icons.check_circle_outline
                        : Icons.warning_amber_outlined,
                    size: 16,
                    color: isSame ? AppColors.success : AppColors.warning,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      item.name,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  Text(
                    _statusLabel(beforeStatus),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.info,
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 6),
                    child: Icon(Icons.arrow_right_alt,
                        size: 14, color: AppColors.textHint),
                  ),
                  Text(
                    _statusLabel(item.status),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color:
                          isSame ? AppColors.textSecondary : AppColors.warning,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  String _statusLabel(ItemStatus? status) {
    switch (status) {
      case ItemStatus.ok:
        return 'Baik';
      case ItemStatus.damaged:
        return 'Rusak';
      case ItemStatus.missing:
        return 'Tidak Ada';
      case ItemStatus.needsAttention:
        return 'Perlu Perhatian';
      case null:
        return '-';
      default:
        return 'Normal';
    }
  }

  void _viewPhoto(
    BuildContext context,
    String path,
    double? lat,
    double? lng,
    double? accuracy,
    DateTime? timestamp,
    String? timezone,
  ) {
    final gps = GpsLocation(
      latitude: lat ?? 0,
      longitude: lng ?? 0,
      accuracy: accuracy ?? 0,
      capturedAt: timestamp ?? DateTime.now(),
      timezone: timezone ?? 'Asia/Jakarta',
    );
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => InspectionMediaViewerScreen(
          isPhoto: true,
          filePath: path,
          inspectionCode: '',
          gps: gps,
        ),
      ),
    );
  }

  String _formatDateTime(DateTime d) {
    return '${d.day}/${d.month}/${d.year} '
        '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')} WIB';
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final Color color;
  final DateTime date;

  const _TypeChip({
    required this.label,
    required this.color,
    required this.date,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: color.withAlpha(12),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withAlpha(50)),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${date.day}/${date.month}/${date.year}',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')} WIB',
              style:
                  const TextStyle(fontSize: 10, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
