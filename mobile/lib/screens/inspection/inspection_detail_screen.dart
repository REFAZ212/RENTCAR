import 'dart:io';

import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../models/gps_location.dart';
import '../../models/inspection_model.dart';
import '../../widgets/inspection_status_badge.dart';
import 'camera/inspection_media_viewer_screen.dart';
import 'inspection_comparison_screen.dart';
import 'inspection_stepper_screen.dart';

class InspectionDetailScreen extends StatelessWidget {
  final InspectionModel inspection;

  const InspectionDetailScreen({super.key, required this.inspection});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Detail Inspeksi'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildVehicleHeader(),
            const SizedBox(height: 16),
            _buildInfoCard(),
            const SizedBox(height: 16),
            _buildInspectorInfo(),
            if (inspection.isAfterRental && inspection.baselineInspectionId != null) ...[
              const SizedBox(height: 16),
              _buildBaselineInfo(context),
            ],
            if (inspection.photos.isNotEmpty || inspection.videos.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildMediaSection(context),
            ],
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomAction(context),
    );
  }

  Widget _buildVehicleHeader() {
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
          Row(
            children: [
              if (inspection.type == InspectionType.beforeRental)
                InspectionStatusBadge.beforeRental()
              else
                InspectionStatusBadge.afterRental(),
              const Spacer(),
              _buildStatusBadge(),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            inspection.vehicleName,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            inspection.plateNumber,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    final info = inspection.vehicleInfo;
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
            'Informasi',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          _buildInfoRow('Customer', info?.customerName ?? inspection.customerName ?? '-'),
          _buildInfoRow('Booking', info?.bookingCode ?? '#${inspection.bookingId ?? "-"}'),
          _buildInfoRow('Jenis Inspeksi', inspection.typeLabel),
          _buildInfoRow('Tanggal', _formatDate(inspection.date)),
          _buildInfoRow('Waktu', _formatTime(inspection.date)),
          if (info?.purpose != null) _buildInfoRow('Tujuan', info!.purpose!),
          if (info?.startTime != null) _buildInfoRow('Jam Mulai', info!.startTime!),
          if (info?.endTime != null) _buildInfoRow('Jam Selesai', info!.endTime!),
          if (info?.rentalRate != null) _buildInfoRow('Tarif', info!.rentalRateLabel),
        ],
      ),
    );
  }

  Widget _buildInspectorInfo() {
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
            'Petugas',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary50,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.person,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    inspection.officerName ?? '-',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const Text(
                    'Petugas Lapangan',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBaselineInfo(BuildContext context) {
    return GestureDetector(
      onTap: inspection.isAfterRental && inspection.baselineInspectionId != null
          ? () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => InspectionComparisonScreen(
                    currentInspection: inspection,
                  ),
                ),
              );
            }
          : null,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.infoLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.info.withAlpha(60)),
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline, color: AppColors.info, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Inspeksi Sebelum Sewa',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.info,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Baseline: Inspeksi #${inspection.baselineInspectionId}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.compare_arrows, size: 20, color: AppColors.info),
          ],
        ),
      ),
    );
  }

  Widget _buildMediaSection(BuildContext context) {
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
            'Dokumentasi',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          if (inspection.photos.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: inspection.photos.map((p) {
                return GestureDetector(
                  onTap: () => _viewMedia(context, p, null),
                  child: _mediaThumb(
                    isPhoto: true,
                    path: p.filePath,
                    label: p.categoryLabel,
                  ),
                );
              }).toList(),
            ),
          if (inspection.videos.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: inspection.videos.map((v) {
                return GestureDetector(
                  onTap: () => _viewMedia(context, null, v),
                  child: _mediaThumb(
                    isPhoto: false,
                    path: v.filePath,
                    label: '${v.durationLabel} • Video',
                  ),
                );
              }).toList(),
            ),
          ],
          if (inspection.isSyncPending) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.warningLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.cloud_off_outlined,
                      size: 16, color: AppColors.warning),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Disimpan offline. Menunggu sinkronisasi.',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.warning,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _mediaThumb({
    required bool isPhoto,
    required String path,
    required String label,
  }) {
    final file = File(path);
    return Container(
      width: 84,
      height: 84,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (file.existsSync())
            Image.file(
              file,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _mediaPlaceholder(isPhoto),
            )
          else
            _mediaPlaceholder(isPhoto),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              color: Colors.black54,
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 8,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _mediaPlaceholder(bool isPhoto) {
    return Container(
      color: isPhoto ? AppColors.primary50 : AppColors.infoLight,
      child: Icon(
        isPhoto ? Icons.photo : Icons.movie_outlined,
        color: isPhoto ? AppColors.primary : AppColors.info,
        size: 26,
      ),
    );
  }

  void _viewMedia(
    BuildContext context,
    dynamic photo,
    dynamic video,
  ) {
    if (photo != null) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => InspectionMediaViewerScreen(
            isPhoto: true,
            filePath: photo.filePath,
            inspectionCode: photo.inspectionId,
            gps: GpsLocation(
              latitude: photo.latitude ?? 0,
              longitude: photo.longitude ?? 0,
              accuracy: photo.accuracy ?? 0,
              capturedAt: photo.timestamp,
              timezone: photo.timezone ?? 'Asia/Jakarta',
              address: photo.address,
            ),
          ),
        ),
      );
    } else if (video != null) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => InspectionMediaViewerScreen(
            isPhoto: false,
            filePath: video.filePath,
            inspectionCode: video.inspectionId,
            gps: GpsLocation(
              latitude: video.latitude ?? 0,
              longitude: video.longitude ?? 0,
              accuracy: video.accuracy ?? 0,
              capturedAt: video.timestamp,
              timezone: video.timezone ?? 'Asia/Jakarta',
            ),
            videoDuration: video.duration,
          ),
        ),
      );
    }
  }

  Widget _buildStatusBadge() {
    if (inspection.isCompleted) {
      return InspectionStatusBadge.completed();
    } else if (inspection.isInProgress) {
      return InspectionStatusBadge.inProgress();
    }
    return InspectionStatusBadge.draft();
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomAction(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      color: AppColors.surface,
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => InspectionStepperScreen(inspection: inspection),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              inspection.canStart
                  ? 'Mulai Inspeksi'
                  : inspection.isInProgress
                      ? 'Lanjutkan Inspeksi'
                      : 'Lihat Hasil',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime d) {
    final months = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return '${d.day} ${months[d.month]} ${d.year}';
  }

  String _formatTime(DateTime d) {
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }
}
