import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/constants/app_colors.dart';
import '../../../models/gps_location.dart';
import '../../../models/media_capture_result.dart';
import '../../../services/camera_service.dart';
import '../../../services/location_service.dart';
import '../../../widgets/gps_status_indicator.dart';
import 'media_preview_screen.dart';

class PhotoCaptureScreen extends StatefulWidget {
  final String inspectionCode;

  const PhotoCaptureScreen({super.key, required this.inspectionCode});

  @override
  State<PhotoCaptureScreen> createState() => _PhotoCaptureScreenState();
}

class _PhotoCaptureScreenState extends State<PhotoCaptureScreen> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  int _cameraIndex = 0;
  bool _isBackCamera = true;
  bool _isInitializing = true;
  String? _cameraError;
  bool _permissionDenied = false;

  GpsLocation? _gps;
  GpsStatus _gpsStatus = GpsStatus.searching;
  Timer? _gpsTimer;
  Timer? _clockTimer;
  DateTime _now = DateTime.now();

  bool _capturing = false;

  @override
  void initState() {
    super.initState();
    _startClock();
    _startGps();
    _initCamera();
  }

  Future<void> _initCamera() async {
    setState(() {
      _isInitializing = true;
      _cameraError = null;
      _permissionDenied = false;
    });

    try {
      if (!await CameraService.ensureCameraPermission()) {
        setState(() {
          _permissionDenied = true;
          _isInitializing = false;
        });
        return;
      }

      final cameras = await CameraService.getAvailableCameras();
      _cameras = cameras;
      _cameraIndex = 0;
      _isBackCamera = true;

      await _openCamera(cameras[_cameraIndex]);
    } catch (e) {
      setState(() {
        _cameraError = 'Kamera tidak dapat digunakan.\nPeriksa permission kamera.';
        _isInitializing = false;
      });
    }
  }

  Future<void> _openCamera(CameraDescription camera) async {
    final old = _controller;
    _controller = null;
    if (old != null) {
      await old.dispose();
    }

    final controller = CameraController(
      camera,
      ResolutionPreset.high,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );
    _controller = controller;

    try {
      await controller.initialize();
      if (!mounted) return;
      setState(() => _isInitializing = false);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _cameraError = 'Kamera tidak dapat digunakan.\nPeriksa permission kamera.';
        _isInitializing = false;
      });
    }
  }

  Future<void> _flipCamera() async {
    if (_cameras == null || _cameras!.length < 2) return;
    final next = _isBackCamera ? 1 : 0;
    setState(() {
      _cameraIndex = next;
      _isBackCamera = !_isBackCamera;
      _isInitializing = true;
    });
    await _openCamera(_cameras![next]);
  }

  Future<void> _startGps() async {
    setState(() => _gpsStatus = GpsStatus.searching);

    // Update status GPS setiap 5 detik selama di halaman kamera
    _gpsTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      await _refreshGps();
    });
    await _refreshGps();
  }

  Future<void> _refreshGps() async {
    if (!mounted) return;
    final enabled = await LocationService.isServiceEnabled();
    if (!enabled) {
      setState(() => _gpsStatus = GpsStatus.error);
      return;
    }
    final permission = await LocationService.ensurePermission();
    if (!permission) {
      setState(() => _gpsStatus = GpsStatus.denied);
      return;
    }

    final loc = await LocationService.getCurrentLocation(
      waitForAccuracy: false,
    );
    if (!mounted) return;
    if (loc != null) {
      setState(() {
        _gps = loc;
        _gpsStatus =
            loc.isAccurate ? GpsStatus.accurate : GpsStatus.weak;
      });
    }
  }

  void _startClock() {
    _now = DateTime.now();
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _capturing) {
      return;
    }

    setState(() => _capturing = true);

    // 1. Ambil waktu (otomatis, sebelum & sesudah capture)
    final capturedAt = DateTime.now();
    final timezone = _timezoneName();

    // 2. Ambil GPS yang akurat
    GpsLocation? gps;
    if (_gps != null && _gps!.isAccurate) {
      gps = await LocationService.enrichAddress(_gps!);
    } else {
      final fresh = await LocationService.getCurrentLocation(
        waitForAccuracy: true,
      );
      if (fresh != null) {
        gps = await LocationService.enrichAddress(fresh);
      } else {
        gps = _gps;
      }
    }

    if (gps == null) {
      if (mounted) {
        setState(() => _capturing = false);
        _showGpsRequiredDialog();
      }
      return;
    }

    if (gps.accuracy > 20.0) {
      if (mounted) {
        setState(() => _capturing = false);
        _showLowAccuracyWarning(gps);
      }
      return;
    }

    final GpsLocation capturedGps = gps;

    // 3. Ambil foto
    try {
      final dir = await getApplicationDocumentsDirectory();
      final photosDir = Directory(p.join(dir.path, 'inspeksi', 'foto'));
      await photosDir.create(recursive: true);
      final stamp = capturedAt.millisecondsSinceEpoch;
      final path = p.join(photosDir.path, 'INS-$stamp.jpg');

      final XFile file = await controller.takePicture();
      await File(file.path).copy(path);

      final result = PhotoCaptureResult(
        id: 'photo_${DateTime.now().microsecondsSinceEpoch}',
        inspectionId: widget.inspectionCode,
        photoPath: path,
        gps: capturedGps,
        capturedAt: capturedAt.toIso8601String(),
        timezone: timezone,
      );

      if (!mounted) return;

      // 4. Tampilkan preview foto + metadata
      final confirmed = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => MediaPreviewScreen(
            isPhoto: true,
            filePath: path,
            inspectionCode: widget.inspectionCode,
            gps: capturedGps,
            timestamp: capturedAt,
          ),
        ),
      );

      if (!mounted) return;
      if (confirmed == true) {
        Navigator.of(context).pop(result);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Gagal mengambil foto. Coba lagi.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  void _showGpsRequiredDialog() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Lokasi GPS Diperlukan'),
        content: const Text(
          'Aktifkan GPS dan izinkan akses lokasi untuk melanjutkan inspeksi.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showLowAccuracyWarning(GpsLocation gps) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Akurasi Lokasi Rendah'),
        content: Text(
          'Lokasi belum cukup akurat.\nAkurasi saat ini ${gps.accuracyLabel}.\nSilakan tunggu beberapa detik lalu coba lagi.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  String _timezoneName() {
    final offset = DateTime.now().timeZoneOffset;
    if (offset.inHours == 7) return 'Asia/Jakarta';
    if (offset.inHours == 8) return 'Asia/Makassar';
    if (offset.inHours == 9) return 'Asia/Jayapura';
    return 'Asia/Jakarta';
  }

  String _formatClock(DateTime t) {
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    final s = t.second.toString().padLeft(2, '0');
    return '$h:$m:$s WIB';
  }

  @override
  void dispose() {
    _gpsTimer?.cancel();
    _clockTimer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Ambil Foto Kendaraan'),
        actions: [
          if (_cameras != null && _cameras!.length > 1)
            IconButton(
              onPressed: _flipCamera,
              icon: const Icon(Icons.cameraswitch_outlined),
              tooltip: 'Ganti Kamera',
            ),
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildBody() {
    if (_permissionDenied) {
      return _buildPermissionDenied();
    }
    if (_cameraError != null) {
      return _buildCameraError();
    }
    if (_isInitializing || _controller == null || !_controller!.value.isInitialized) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: Colors.white),
            SizedBox(height: 16),
            Text('⟳ Membuka kamera...',
                style: TextStyle(color: Colors.white70, fontSize: 14)),
          ],
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        CameraPreview(_controller!),
        _buildTopOverlay(),
        _buildTimestampOverlay(),
      ],
    );
  }

  Widget _buildTopOverlay() {
    return Positioned(
      top: 12,
      left: 12,
      right: 12,
      child: Row(
        children: [
          GpsStatusIndicator(status: _gpsStatus, location: _gps),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black54,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                const Icon(Icons.videocam_outlined, size: 14, color: Colors.white70),
                const SizedBox(width: 6),
                Text(
                  _controller!.description.lensDirection ==
                          CameraLensDirection.front
                      ? 'Depan'
                      : 'Belakang',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimestampOverlay() {
    final address = _gps?.address ?? 'Tasikmalaya, Jawa Barat';
    return Positioned(
      bottom: 16,
      left: 12,
      right: 12,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.black.withAlpha(130),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Icon(Icons.calendar_today_outlined, size: 13, color: Colors.white70),
                const SizedBox(width: 6),
                Text(
                  _formatDate(_now),
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
                const SizedBox(width: 12),
                const Icon(Icons.schedule_outlined, size: 13, color: Colors.white70),
                const SizedBox(width: 6),
                Text(
                  _formatClock(_now),
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 13, color: Colors.white70),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '📍 $address',
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionDenied() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.no_photography_outlined,
                size: 64, color: Colors.white38),
            const SizedBox(height: 20),
            const Text(
              'Camera permission diperlukan untuk melakukan inspeksi.',
              style: TextStyle(color: Colors.white, fontSize: 15),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Aktifkan izin kamera pada pengaturan untuk mengambil foto.',
              style: TextStyle(color: Colors.white60, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () async {
                await CameraService.ensureCameraPermission();
                if (mounted) _initCamera();
              },
              icon: const Icon(Icons.camera_alt_outlined),
              label: const Text('IZINKAN AKSES KAMERA'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Batal',
                  style: TextStyle(color: Colors.white54)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.white38),
            const SizedBox(height: 20),
            const Text(
              'Kamera tidak dapat digunakan.\nPeriksa permission kamera.',
              style: TextStyle(color: Colors.white, fontSize: 15),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _initCamera,
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    if (_permissionDenied || _cameraError != null) {
      return const SizedBox.shrink();
    }

    return Container(
      color: Colors.black,
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'AMBIL FOTO',
              style: TextStyle(
                color: _isInitializing ? Colors.white30 : Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 10),
            GestureDetector(
              onTap: _isInitializing ? null : _capture,
              child: Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  border: Border.all(color: Colors.white38, width: 4),
                ),
                child: _capturing
                    ? const Padding(
                        padding: EdgeInsets.all(22),
                        child: CircularProgressIndicator(
                          strokeWidth: 3,
                          color: AppColors.primary,
                        ),
                      )
                    : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime t) {
    const months = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return '${t.day} ${months[t.month]} ${t.year}';
  }
}