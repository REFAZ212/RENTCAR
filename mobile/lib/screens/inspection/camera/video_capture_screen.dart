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

class VideoCaptureScreen extends StatefulWidget {
  final String inspectionCode;
  final String? taskCode;
  final int? taskId;
  final String? vehicleName;
  final String? licensePlate;
  final String? vehicleColor;
  final String? inspectionType;
  final String? inspectionId;

  const VideoCaptureScreen({
    super.key,
    required this.inspectionCode,
    this.taskCode,
    this.taskId,
    this.vehicleName,
    this.licensePlate,
    this.vehicleColor,
    this.inspectionType,
    this.inspectionId,
  });

  @override
  State<VideoCaptureScreen> createState() => _VideoCaptureScreenState();
}

class _VideoCaptureScreenState extends State<VideoCaptureScreen> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  bool _isBackCamera = true;
  bool _isInitializing = true;
  String? _cameraError;
  bool _permissionDenied = false;

  GpsLocation? _gps;
  GpsStatus _gpsStatus = GpsStatus.searching;
  Timer? _gpsTimer;

  bool _isRecording = false;
  Timer? _recordTimer;
  int _elapsedSeconds = 0;

  @override
  void initState() {
    super.initState();
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
      await CameraService.ensureMicrophonePermission();

      final cameras = await CameraService.getAvailableCameras();
      _cameras = cameras;
      _isBackCamera = true;
      await _openCamera(cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      ));
    } catch (e) {
      setState(() {
        _cameraError =
            'Kamera tidak dapat digunakan.\nPeriksa permission kamera.';
        _isInitializing = false;
      });
    }
  }

  Future<void> _openCamera(CameraDescription camera) async {
    final old = _controller;
    _controller = null;
    if (old != null) await old.dispose();

    final controller = CameraController(
      camera,
      ResolutionPreset.high,
      enableAudio: true,
    );
    _controller = controller;

    try {
      await controller.initialize();
      if (!mounted) return;
      setState(() => _isInitializing = false);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _cameraError =
            'Kamera tidak dapat digunakan.\nPeriksa permission kamera.';
        _isInitializing = false;
      });
    }
  }

  Future<void> _flipCamera() async {
    if (_cameras == null || _cameras!.length < 2) return;
    if (_isRecording) return;
    final target = _isBackCamera
        ? _cameras!.firstWhere(
            (c) => c.lensDirection == CameraLensDirection.front,
            orElse: () => _cameras!.first,
          )
        : _cameras!.firstWhere(
            (c) => c.lensDirection == CameraLensDirection.back,
            orElse: () => _cameras!.first,
          );
    setState(() {
      _isBackCamera = !_isBackCamera;
      _isInitializing = true;
    });
    await _openCamera(target);
  }

  Future<void> _startGps() async {
    setState(() => _gpsStatus = GpsStatus.searching);
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
    if (!mounted || loc == null) return;
    setState(() {
      _gps = loc;
      _gpsStatus = loc.isAccurate ? GpsStatus.accurate : GpsStatus.weak;
    });
  }

  Future<void> _startRecording() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;

    final enabled = await LocationService.isServiceEnabled();
    if (!enabled || !await LocationService.ensurePermission()) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Aktifkan GPS dan izinkan akses lokasi untuk merekam video.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return;
    }

    try {
      await controller.startVideoRecording();
      if (!mounted) return;
      setState(() {
        _isRecording = true;
        _elapsedSeconds = 0;
      });
      _recordTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => _elapsedSeconds++);
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Gagal memulai rekaman.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _stopRecording() async {
    final controller = _controller;
    if (controller == null) return;

    _recordTimer?.cancel();
    _recordTimer = null;

    XFile file;
    try {
      file = await controller.stopVideoRecording();
    } catch (_) {
      return;
    }

    final recordedAt = DateTime.now();
    final timezone = _timezoneName();
    final duration = Duration(seconds: _elapsedSeconds);

    GpsLocation? gps;
    if (_gps != null && _gps!.isAccurate) {
      gps = await LocationService.enrichAddress(_gps!);
    } else {
      final fresh = await LocationService.getCurrentLocation(
        waitForAccuracy: true,
      );
      gps = fresh != null ? await LocationService.enrichAddress(fresh) : _gps;
    }

    if (gps == null || gps.accuracy > 20.0) {
      if (mounted) {
        setState(() => _isRecording = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Lokasi belum cukup akurat. Video disimpan tetapi tanpa metadata GPS.\nSilakan ulangi rekaman.',
            ),
            backgroundColor: AppColors.warning,
          ),
        );
      }
      return;
    }

    final GpsLocation capturedGps = gps;

    try {
      final dir = await getApplicationDocumentsDirectory();
      final videosDir = Directory(p.join(dir.path, 'inspeksi', 'video'));
      await videosDir.create(recursive: true);
      final stamp = recordedAt.millisecondsSinceEpoch;
      final destPath = p.join(videosDir.path, 'INS-$stamp.mp4');
      await File(file.path).copy(destPath);

      final result = VideoCaptureResult(
        id: 'video_${DateTime.now().microsecondsSinceEpoch}',
        inspectionId: widget.inspectionCode,
        videoPath: destPath,
        gps: capturedGps,
        recordedAt: recordedAt.toIso8601String(),
        timezone: timezone,
        duration: duration,
      );

      if (!mounted) return;
      setState(() => _isRecording = false);

      final confirmed = await Navigator.of(context).push<Map<String, dynamic>>(
        MaterialPageRoute(
          builder: (_) => MediaPreviewScreen(
            isPhoto: false,
            filePath: destPath,
            inspectionCode: widget.inspectionCode,
            gps: capturedGps,
            timestamp: recordedAt,
            videoDuration: duration,
            taskCode: widget.taskCode,
            taskId: widget.taskId,
            vehicleName: widget.vehicleName,
            licensePlate: widget.licensePlate,
            vehicleColor: widget.vehicleColor,
            inspectionType: widget.inspectionType,
            inspectionId: widget.inspectionId,
          ),
        ),
      );

      if (!mounted) return;
      if (confirmed != null && confirmed['confirmed'] == true) {
        Navigator.of(context).pop(result);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isRecording = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Gagal menyimpan video.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  String _timezoneName() {
    final offset = DateTime.now().timeZoneOffset;
    if (offset.inHours == 7) return 'Asia/Jakarta';
    if (offset.inHours == 8) return 'Asia/Makassar';
    if (offset.inHours == 9) return 'Asia/Jayapura';
    return 'Asia/Jakarta';
  }

  String _formatTimer(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  void dispose() {
    _gpsTimer?.cancel();
    _recordTimer?.cancel();
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
        title: const Text('Rekam Video Kendaraan'),
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
                ),
              ),
            ],
          ),
        ),
      );
    }
    if (_cameraError != null) {
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
                ),
              ),
            ],
          ),
        ),
      );
    }
    if (_isInitializing ||
        _controller == null ||
        !_controller!.value.isInitialized) {
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
        Positioned(
          top: 12,
          left: 12,
          right: 12,
          child: Row(
            children: [
              GpsStatusIndicator(status: _gpsStatus, location: _gps),
            ],
          ),
        ),
        Positioned(
          top: 54,
          left: 12,
          right: 12,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withAlpha(120),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_isRecording) ...[
                  Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(
                      color: AppColors.error,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                ] else
                  const Icon(Icons.videocam_outlined,
                      size: 14, color: Colors.white70),
                const SizedBox(width: 8),
                Text(
                  _formatTimer(_elapsedSeconds),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    fontFeatures: const [FontFeature.tabularFigures()],
                    color: _isRecording ? Colors.white : Colors.white70,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_isRecording)
          Positioned(
            bottom: 16,
            left: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.black.withAlpha(130),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.location_on_outlined,
                      size: 14, color: Colors.white70),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Kelilingi kendaraan secara menyeluruh (30–60 detik)',
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
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
              _isRecording ? 'STOP REKAM' : 'MULAI REKAM',
              style: TextStyle(
                color: _isInitializing ? Colors.white30 : Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 10),
            GestureDetector(
              onTap: _isInitializing
                  ? null
                  : (_isRecording ? _stopRecording : _startRecording),
              child: Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _isRecording ? AppColors.error : Colors.white,
                  border: Border.all(color: Colors.white38, width: 4),
                ),
                child: _isRecording
                    ? Container(
                        width: 26,
                        height: 26,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      )
                    : const Icon(
                        Icons.fiber_manual_record,
                        color: AppColors.error,
                        size: 30,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
