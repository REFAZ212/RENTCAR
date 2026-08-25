import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:share_plus/share_plus.dart';
import 'package:video_player/video_player.dart';

import '../../../core/constants/app_colors.dart';
import '../../../models/gps_location.dart';
import '../../../widgets/location_map_view.dart';

class InspectionMediaViewerScreen extends StatefulWidget {
  final bool isPhoto;
  final String filePath;
  final String inspectionCode;
  final GpsLocation gps;
  final Duration? videoDuration;
  final String? watermarkedPath;

  const InspectionMediaViewerScreen({
    super.key,
    required this.isPhoto,
    required this.filePath,
    required this.inspectionCode,
    required this.gps,
    this.videoDuration,
    this.watermarkedPath,
  });

  @override
  State<InspectionMediaViewerScreen> createState() =>
      _InspectionMediaViewerScreenState();
}

class _InspectionMediaViewerScreenState
    extends State<InspectionMediaViewerScreen> {
  VideoPlayerController? _videoController;
  bool _videoReady = false;

  @override
  void initState() {
    super.initState();
    if (!widget.isPhoto) {
      _initVideo();
    }
  }

  Future<void> _initVideo() async {
    final controller = VideoPlayerController.file(File(widget.filePath));
    _videoController = controller;
    await controller.initialize();
    await controller.setLooping(true);
    await controller.play();
    if (mounted) setState(() => _videoReady = true);
  }

  Future<void> _downloadMedia() async {
    final path = widget.isPhoto
        ? (widget.watermarkedPath ?? widget.filePath)
        : widget.filePath;

    if (!File(path).existsSync()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('File tidak ditemukan di perangkat.')),
      );
      return;
    }

    try {
      await Share.shareXFiles(
        [
          XFile(
            path,
            mimeType: widget.isPhoto ? 'image/jpeg' : 'video/mp4',
            name: p.basename(path),
          ),
        ],
        subject:
            '${widget.isPhoto ? 'Foto' : 'Video'} Inspeksi ${widget.inspectionCode}',
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal membagikan file.')),
        );
      }
    }
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
        title: Text(widget.isPhoto ? 'Foto Inspeksi' : 'Video Inspeksi'),
        backgroundColor: AppColors.background,
        actions: [
          IconButton(
            icon: const Icon(Icons.download_outlined),
            tooltip: 'Unduh / Simpan',
            onPressed: _downloadMedia,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildMedia(),
            const SizedBox(height: 14),
            _buildInfoCard(),
            const SizedBox(height: 14),
            _buildMapCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildMedia() {
    if (widget.isPhoto) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Image.file(
          File(widget.filePath),
          fit: BoxFit.cover,
          width: double.infinity,
          errorBuilder: (_, __, ___) => Container(
            height: 260,
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
        height: 260,
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Container(
        height: 260,
        color: Colors.black,
        child: Stack(
          alignment: Alignment.center,
          children: [
            VideoPlayer(_videoController!),
            GestureDetector(
              onTap: () {
                final c = _videoController!;
                if (c.value.isPlaying) {
                  c.pause();
                } else {
                  c.play();
                }
                setState(() {});
              },
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.black45,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _videoController!.value.isPlaying
                      ? Icons.pause
                      : Icons.play_arrow,
                  color: Colors.white,
                  size: 38,
                ),
              ),
            ),
            if (widget.videoDuration != null)
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
                    _formatDuration(widget.videoDuration!),
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
    );
  }

  Widget _buildInfoCard() {
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
            'METADATA',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
              color: AppColors.textHint,
            ),
          ),
          const SizedBox(height: 10),
          _row('ID Inspeksi', widget.inspectionCode),
          _row('Waktu', '${widget.gps.humanDate} • ${widget.gps.humanTime}'),
          _row('Latitude', widget.gps.latitude.toStringAsFixed(6)),
          _row('Longitude', widget.gps.longitude.toStringAsFixed(6)),
          _row('Akurasi', widget.gps.accuracyLabel),
          _row('Timezone', widget.gps.timezone),
          _row('Timestamp', widget.gps.timestampWithTimezone),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 95,
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
            ],
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes.toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}