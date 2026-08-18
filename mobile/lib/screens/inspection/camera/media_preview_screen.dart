import 'dart:io';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../../core/constants/app_colors.dart';
import '../../../models/gps_location.dart';
import '../../../services/watermark_service.dart';
import '../../../widgets/location_map_view.dart';

class MediaPreviewScreen extends StatefulWidget {
  final bool isPhoto;
  final String filePath;
  final String inspectionCode;
  final GpsLocation gps;
  final DateTime timestamp;
  final Duration? videoDuration;

  const MediaPreviewScreen({
    super.key,
    required this.isPhoto,
    required this.filePath,
    required this.inspectionCode,
    required this.gps,
    required this.timestamp,
    this.videoDuration,
  });

  @override
  State<MediaPreviewScreen> createState() => _MediaPreviewScreenState();
}

class _MediaPreviewScreenState extends State<MediaPreviewScreen> {
  VideoPlayerController? _videoController;
  bool _videoReady = false;
  bool _videoPlaying = false;

  bool _watermarkEnabled = false;
  bool _generatingWatermark = false;
  String? _displayPath;

  @override
  void initState() {
    super.initState();
    _displayPath = widget.filePath;
    if (!widget.isPhoto) {
      _initVideo();
    }
  }

  Future<void> _initVideo() async {
    final controller = VideoPlayerController.file(File(widget.filePath));
    _videoController = controller;
    await controller.initialize();
    if (!mounted) return;
    setState(() => _videoReady = true);
    await controller.setLooping(false);
  }

  Future<void> _togglePlay() async {
    final controller = _videoController;
    if (controller == null || !_videoReady) return;
    if (_videoPlaying) {
      await controller.pause();
    } else {
      await controller.play();
    }
    if (mounted) setState(() => _videoPlaying = controller.value.isPlaying);
  }

  Future<void> _toggleWatermark() async {
    if (_generatingWatermark) return;

    if (_watermarkEnabled) {
      setState(() {
        _watermarkEnabled = false;
        _displayPath = widget.filePath;
      });
      return;
    }

    setState(() => _generatingWatermark = true);
    final watermarkedPath = await WatermarkService.applyPhotoWatermark(
      sourcePath: widget.filePath,
      inspectionCode: widget.inspectionCode,
      gps: widget.gps,
    );
    if (!mounted) return;
    setState(() {
      _watermarkEnabled = true;
      _displayPath = watermarkedPath;
      _generatingWatermark = false;
    });
  }

  String get _durationLabel {
    final d = widget.videoDuration ?? Duration.zero;
    final m = d.inMinutes.toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(widget.isPhoto ? 'Preview Foto' : 'Preview Video'),
        backgroundColor: AppColors.background,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildMedia(),
            const SizedBox(height: 14),
            _buildMetadataCard(),
            const SizedBox(height: 14),
            _buildMapCard(),
            if (widget.isPhoto) ...[
              const SizedBox(height: 14),
              _buildWatermarkCard(),
            ],
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildMedia() {
    if (widget.isPhoto) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Image.file(
          File(_displayPath!),
          fit: BoxFit.cover,
          width: double.infinity,
          height: 300,
          errorBuilder: (_, __, ___) => Container(
            height: 300,
            color: AppColors.border,
            child: const Center(
              child: Icon(Icons.broken_image_outlined,
                  size: 48, color: AppColors.textHint),
            ),
          ),
        ),
      );
    }

    if (!_videoReady) {
      return Container(
        height: 300,
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: GestureDetector(
        onTap: _togglePlay,
        child: Container(
          height: 300,
          color: Colors.black,
          child: Stack(
            alignment: Alignment.center,
            children: [
              VideoPlayer(_videoController!),
              if (!_videoPlaying)
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: Colors.black45,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.play_arrow,
                      size: 40, color: Colors.white),
                ),
              Positioned(
                bottom: 8,
                right: 10,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _durationLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetadataCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'METADATA DOKUMENTASI',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
              color: AppColors.textHint,
            ),
          ),
          const SizedBox(height: 10),
          _row(Icons.assignment_outlined, 'ID Inspeksi', widget.inspectionCode),
          _row(Icons.calendar_today_outlined, 'Tanggal', widget.gps.humanDate),
          _row(Icons.schedule_outlined, 'Waktu', widget.gps.humanTime),
          _row(Icons.my_location_outlined, 'Latitude',
              widget.gps.latitude.toStringAsFixed(6)),
          _row(Icons.my_location_outlined, 'Longitude',
              widget.gps.longitude.toStringAsFixed(6)),
          _row(Icons.gps_fixed, 'Akurasi', widget.gps.accuracyLabel),
          _row(Icons.language, 'Timezone', widget.gps.timezone),
          _row(Icons.public, 'Timestamp', widget.gps.timestampWithTimezone),
        ],
      ),
    );
  }

  Widget _row(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 15, color: AppColors.textHint),
          const SizedBox(width: 8),
          SizedBox(
            width: 90,
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

  Widget _buildMapCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'LOKASI INSPEKSI',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
              color: AppColors.textHint,
            ),
          ),
          const SizedBox(height: 10),
          LocationMapView(gps: widget.gps),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.location_on_outlined,
                  size: 15, color: AppColors.textSecondary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  widget.gps.address ?? 'Tasikmalaya, Jawa Barat',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Text(
                'Akurasi ${widget.gps.accuracyLabel}',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWatermarkCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.water_drop_outlined, color: AppColors.primary),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tambah Watermark',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Overlay informasi inspeksi pada foto (foto asli tetap tersimpan)',
                  style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          if (_generatingWatermark)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Switch(
              value: _watermarkEnabled,
              onChanged: (_) => _toggleWatermark(),
              activeThumbColor: AppColors.primary,
            ),
        ],
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      color: AppColors.surface,
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(false),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.error,
                  side: const BorderSide(color: AppColors.error),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: Text(
                  widget.isPhoto ? 'Ambil Ulang' : 'Rekam Ulang',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: Text(
                  widget.isPhoto ? 'Gunakan Foto' : 'Gunakan Video',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}