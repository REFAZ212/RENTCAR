import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../models/inspection_model.dart';
import '../../models/inspection_item_model.dart';
import '../../models/gps_location.dart';
import '../../models/inspection_photo_model.dart';
import '../../models/inspection_video_model.dart';
import '../../models/media_capture_result.dart';
import '../../services/inspection_service.dart';
import '../../services/sync_queue_service.dart';
import '../../widgets/inspection_progress.dart';
import 'camera/inspection_media_viewer_screen.dart';
import 'camera/photo_capture_screen.dart';
import 'camera/video_capture_screen.dart';
import 'inspection_comparison_screen.dart';
import 'steps/step_data_umum.dart';
import 'steps/step_completeness.dart';
import 'steps/step_fuel.dart';
import 'steps/step_documentation.dart';
import 'steps/step_review.dart';

class InspectionStepperScreen extends StatefulWidget {
  final InspectionModel inspection;

  const InspectionStepperScreen({super.key, required this.inspection});

  @override
  State<InspectionStepperScreen> createState() =>
      _InspectionStepperScreenState();
}

class _InspectionStepperScreenState extends State<InspectionStepperScreen> {
  int _currentStep = 0;
  late InspectionModel _inspection;
  late List<InspectionItem> _completenessItems;
  String _fuelLevel = '1/2';
  double? _fuelLiter;
  double? _odometerValue;

  PhotoCaptureResult? _mainPhoto;
  VideoCaptureResult? _overviewVideo;
  final Map<String, PhotoCaptureResult> _additionalPhotos = {};

  String get _inspectionCode =>
      'INS-${_inspection.id.toString().padLeft(3, '0')}';

  static const _stepNames = [
    AppStrings.stepGeneral,
    AppStrings.stepCompleteness,
    AppStrings.stepFuel,
    AppStrings.stepDocumentation,
    AppStrings.stepReview,
  ];

  @override
  void initState() {
    super.initState();
    _inspection = widget.inspection;
    _completenessItems = List.from(
      _inspection.items.where((i) => i.category == 'completeness').isNotEmpty
          ? _inspection.items.where((i) => i.category == 'completeness')
          : _getDefaultCompletenessItems(),
    );
    _fuelLevel = _inspection.fuelInfo?.level ?? '1/2';
    _fuelLiter = _inspection.fuelInfo?.liter;
    _odometerValue = _inspection.odometerInfo?.value;

    _loadSavedMedia();
  }

  void _loadSavedMedia() {
    final photos = _inspection.photos;
    for (final p in photos) {
      final result = PhotoCaptureResult(
        id: p.id,
        inspectionId: p.inspectionId,
        photoPath: p.filePath,
        gps: p.latitude != null && p.longitude != null
            ? GpsLocation(
                latitude: p.latitude!,
                longitude: p.longitude!,
                accuracy: p.accuracy ?? 0,
                capturedAt: p.timestamp,
                timezone: p.timezone ?? 'Asia/Jakarta',
                address: p.address,
              )
            : GpsLocation(
                latitude: 0,
                longitude: 0,
                accuracy: 0,
                capturedAt: p.timestamp,
              ),
        capturedAt: p.timestamp.toIso8601String(),
        timezone: p.timezone ?? 'Asia/Jakarta',
        category: p.category.name,
      );
      if (p.category == PhotoCategory.front) {
        _mainPhoto = result;
      } else {
        _additionalPhotos[p.categoryLabel] = result;
      }
    }

    final videos = _inspection.videos;
    if (videos.isNotEmpty) {
      final v = videos.first;
      _overviewVideo = VideoCaptureResult(
        id: v.id,
        inspectionId: v.inspectionId,
        videoPath: v.filePath,
        gps: v.latitude != null && v.longitude != null
            ? GpsLocation(
                latitude: v.latitude!,
                longitude: v.longitude!,
                accuracy: v.accuracy ?? 0,
                capturedAt: v.timestamp,
                timezone: v.timezone ?? 'Asia/Jakarta',
              )
            : GpsLocation(
                latitude: 0,
                longitude: 0,
                accuracy: 0,
                capturedAt: v.timestamp,
              ),
        recordedAt: v.timestamp.toIso8601String(),
        timezone: v.timezone ?? 'Asia/Jakarta',
        duration: v.duration,
      );
    }
  }

  Future<void> _persistInspection() async {
    final photos = <InspectionPhoto>[];
    if (_mainPhoto != null) {
      photos.add(_toInspectionPhoto(_mainPhoto!, PhotoCategory.front));
    }
    _additionalPhotos.forEach((label, photo) {
      photos.add(_toInspectionPhoto(photo, _categoryFromLabel(label)));
    });

    final videos = <InspectionVideo>[];
    if (_overviewVideo != null) {
      videos.add(_toInspectionVideo(_overviewVideo!));
    }

    final updated = _inspection.copyWith(
      status: InspectionStatus.inProgress,
      photos: photos,
      videos: videos,
      photoCount: photos.length,
      videoCount: videos.length,
      odometerInfo: OdometerData(
        value: _odometerValue,
        photoId: _additionalPhotos['Bensin']?.id,
      ),
      fuelInfo: FuelData(level: _fuelLevel, liter: _fuelLiter),
    );
    _inspection = updated;
    await InspectionService.update(updated);
  }

  InspectionPhoto _toInspectionPhoto(
    PhotoCaptureResult photo,
    PhotoCategory category,
  ) {
    return InspectionPhoto(
      id: photo.id,
      inspectionId: photo.inspectionId,
      category: category,
      filePath: photo.photoPath,
      timestamp: DateTime.tryParse(photo.capturedAt) ?? DateTime.now(),
      latitude: photo.gps.latitude,
      longitude: photo.gps.longitude,
      accuracy: photo.gps.accuracy,
      timezone: photo.timezone,
      address: photo.gps.address,
    );
  }

  InspectionVideo _toInspectionVideo(VideoCaptureResult video) {
    return InspectionVideo(
      id: video.id,
      inspectionId: video.inspectionId,
      filePath: video.videoPath,
      timestamp: DateTime.tryParse(video.recordedAt) ?? DateTime.now(),
      duration: video.duration,
      latitude: video.gps.latitude,
      longitude: video.gps.longitude,
      accuracy: video.gps.accuracy,
      timezone: video.timezone,
    );
  }

  PhotoCategory _categoryFromLabel(String label) {
    switch (label) {
      case 'Depan':
        return PhotoCategory.front;
      case 'Atap':
        return PhotoCategory.roof;
      case 'Ban':
        return PhotoCategory.tire;
      case 'Kerusakan':
        return PhotoCategory.damage;
      case 'Bensin':
        return PhotoCategory.fuel;
      default:
        return PhotoCategory.other;
    }
  }

  List<InspectionItem> _getDefaultCompletenessItems() {
    return [
      InspectionItem(
          id: 'comp_0',
          inspectionId: _inspection.id.toString(),
          category: 'completeness',
          name: 'Kunci'),
      InspectionItem(
          id: 'comp_1',
          inspectionId: _inspection.id.toString(),
          category: 'completeness',
          name: 'STNK'),
      InspectionItem(
          id: 'comp_2',
          inspectionId: _inspection.id.toString(),
          category: 'completeness',
          name: 'Ban Serep'),
      InspectionItem(
          id: 'comp_3',
          inspectionId: _inspection.id.toString(),
          category: 'completeness',
          name: 'Dongkrak'),
      InspectionItem(
          id: 'comp_4',
          inspectionId: _inspection.id.toString(),
          category: 'completeness',
          name: 'Kunci Roda'),
      InspectionItem(
          id: 'comp_5',
          inspectionId: _inspection.id.toString(),
          category: 'completeness',
          name: 'AC'),
    ];
  }

  void _nextStep() {
    if (_currentStep < _stepNames.length - 1) {
      setState(() => _currentStep++);
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
    }
  }

  void _goToStep(int step) {
    if (step >= 0 && step < _stepNames.length) {
      setState(() => _currentStep = step);
    }
  }

  void _updateCompletenessItem(int index, InspectionItem updated) {
    setState(() => _completenessItems[index] = updated);
  }

  Future<void> _captureMainPhoto() async {
    final result = await Navigator.of(context).push<PhotoCaptureResult>(
      MaterialPageRoute(
        builder: (_) => PhotoCaptureScreen(inspectionCode: _inspectionCode),
      ),
    );
    if (result == null || !mounted) return;
    setState(() => _mainPhoto = result);
    await SyncQueueService.enqueuePhoto(result);
    await _persistInspection();
  }

  Future<void> _captureAdditionalPhoto(String category) async {
    final result = await Navigator.of(context).push<PhotoCaptureResult>(
      MaterialPageRoute(
        builder: (_) => PhotoCaptureScreen(inspectionCode: _inspectionCode),
      ),
    );
    if (result == null || !mounted) return;
    setState(() => _additionalPhotos[category] = result);
    await SyncQueueService.enqueuePhoto(result);
    await _persistInspection();
  }

  Future<void> _recordVideo() async {
    final result = await Navigator.of(context).push<VideoCaptureResult>(
      MaterialPageRoute(
        builder: (_) => VideoCaptureScreen(inspectionCode: _inspectionCode),
      ),
    );
    if (result == null || !mounted) return;
    setState(() => _overviewVideo = result);
    await SyncQueueService.enqueueVideo(result);
    await _persistInspection();
  }

  void _viewMainPhoto() {
    if (_mainPhoto == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => InspectionMediaViewerScreen(
          isPhoto: true,
          filePath: _mainPhoto!.photoPath,
          inspectionCode: _inspectionCode,
          gps: _mainPhoto!.gps,
          watermarkedPath: _mainPhoto!.watermarkedPath,
        ),
      ),
    );
  }

  void _viewVideo() {
    if (_overviewVideo == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => InspectionMediaViewerScreen(
          isPhoto: false,
          filePath: _overviewVideo!.videoPath,
          inspectionCode: _inspectionCode,
          gps: _overviewVideo!.gps,
          videoDuration: _overviewVideo!.duration,
        ),
      ),
    );
  }

  void _viewAdditionalPhoto(String category) {
    final photo = _additionalPhotos[category];
    if (photo == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => InspectionMediaViewerScreen(
          isPhoto: true,
          filePath: photo.photoPath,
          inspectionCode: _inspectionCode,
          gps: photo.gps,
          watermarkedPath: photo.watermarkedPath,
        ),
      ),
    );
  }

  void _openComparison() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => InspectionComparisonScreen(
          currentInspection: _inspection,
        ),
      ),
    );
  }

  Future<void> _completeInspection() async {
    final missing = _getIncompleteDocumentation();
    if (missing.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Inspeksi belum lengkap.\n${missing.join('\n')}'),
          backgroundColor: AppColors.warning,
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    await _persistInspection();

    final completed = _inspection.copyWith(
      status: InspectionStatus.syncPending,
      items: [
        ..._completenessItems,
      ],
    );
    await InspectionService.update(completed);
    _inspection = completed;

    // Coba sinkronisasi online; jika offline status tetap "Disimpan offline"
    final online = await SyncQueueService.isOnline();
    if (!mounted) return;

    if (online) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sinkronisasi inspeksi...'),
          backgroundColor: AppColors.info,
          duration: Duration(seconds: 2),
        ),
      );
      await SyncQueueService.syncPending();
      final synced = completed.copyWith(status: InspectionStatus.synced);
      await InspectionService.update(synced);
      _inspection = synced;
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Inspeksi disimpan offline. Akan disinkronkan saat internet tersedia.',
          ),
          backgroundColor: AppColors.warning,
          duration: Duration(seconds: 3),
        ),
      );
    }

    if (!mounted) return;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  List<String> _getIncompleteDocumentation() {
    final missing = <String>[];
    if (_mainPhoto == null) missing.add('☐ Foto kendaraan');
    if (_overviewVideo == null) missing.add('☐ Video kendaraan');
    if (_mainPhoto == null || _mainPhoto!.gps.latitude == 0) {
      missing.add('☐ Lokasi GPS');
    }
    return missing;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Inspeksi ${_inspection.typeLabel}',
        ),
        actions: [
          if (_inspection.isAfterRental &&
              _inspection.baselineInspectionId != null)
            IconButton(
              onPressed: _openComparison,
              icon: const Icon(Icons.compare_arrows, size: 22),
              tooltip: 'Mode Perbandingan',
            ),
        ],
      ),
      body: Column(
        children: [
          InspectionProgress(
            currentStep: _currentStep,
            totalSteps: _stepNames.length,
            stepNames: _stepNames,
          ),
          Expanded(
            child: _buildCurrentStep(),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildCurrentStep() {
    switch (_currentStep) {
      case 0:
        return StepDataUmum(inspection: _inspection);
      case 1:
        return StepCompleteness(
          items: _completenessItems,
          onItemChanged: _updateCompletenessItem,
        );
      case 2:
        return StepFuel(
          fuelLevel: _fuelLevel,
          fuelLiter: _fuelLiter,
          onLevelChanged: (v) => setState(() => _fuelLevel = v),
          onLiterChanged: (v) => setState(() => _fuelLiter = v),
        );
      case 3:
        return StepDocumentation(
          inspectionCode: _inspectionCode,
          mainPhoto: _mainPhoto,
          overviewVideo: _overviewVideo,
          additionalPhotos: _additionalPhotos,
          odometerValue: _odometerValue,
          fuelLevelLabel: _getFuelLevelLabel(_fuelLevel),
          onCaptureMainPhoto: _captureMainPhoto,
          onRetakeMainPhoto: _captureMainPhoto,
          onViewMainPhoto: _viewMainPhoto,
          onRecordVideo: _recordVideo,
          onRetakeVideo: _recordVideo,
          onViewVideo: _viewVideo,
          onCaptureAdditionalPhoto: _captureAdditionalPhoto,
          onViewAdditionalPhoto: _viewAdditionalPhoto,
          onRemoveAdditionalPhoto: (category) {
            setState(() => _additionalPhotos.remove(category));
            _persistInspection();
          },
          onOdometerChanged: (v) => setState(() => _odometerValue = v),
          onOdometerPhotoTap: () => _captureAdditionalPhoto('Bensin'),
        );
      case 4:
        return StepReview(
          inspection: _inspection,
          completenessItems: _completenessItems,
          fuelLevel: _fuelLevel,
          fuelLiter: _fuelLiter,
          odometerValue: _odometerValue,
          hasMainPhoto: _mainPhoto != null,
          hasOverviewVideo: _overviewVideo != null,
          hasGps: _mainPhoto != null && _mainPhoto!.gps.latitude != 0,
          onComplete: _completeInspection,
          onGoToStep: _goToStep,
        );
      default:
        return const SizedBox.shrink();
    }
  }

  String _getFuelLevelLabel(String level) {
    switch (level) {
      case 'full':
        return 'FULL';
      case '3/4':
        return '3/4';
      case '1/2':
        return '1/2';
      case '1/4':
        return '1/4';
      case 'empty':
        return 'EMPTY';
      default:
        return level;
    }
  }

  Widget _buildBottomNav() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      color: AppColors.surface,
      child: SafeArea(
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: _previousStep,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child:
                      const Text('Sebelumnya', style: TextStyle(fontSize: 14)),
                ),
              ),
            if (_currentStep > 0) const SizedBox(width: 12),
            if (_currentStep < _stepNames.length - 1)
              Expanded(
                child: ElevatedButton(
                  onPressed: _nextStep,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child:
                      const Text('Selanjutnya', style: TextStyle(fontSize: 14)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
