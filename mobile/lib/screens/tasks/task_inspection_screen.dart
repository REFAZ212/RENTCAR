import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../models/driver_task.dart';
import '../../models/gps_location.dart';
import '../../models/media_capture_result.dart';
import '../../services/location_service.dart';
import '../../services/task_service.dart';
import '../../widgets/fuel_gauge.dart';
import '../inspection/camera/photo_capture_screen.dart';
import '../inspection/camera/video_capture_screen.dart';

/// Formulir inspeksi kendaraan untuk lifecycle tugas (before/after).
class TaskInspectionScreen extends StatefulWidget {
  final DriverTask task;
  final TaskInspectionType type;

  const TaskInspectionScreen({
    super.key,
    required this.task,
    required this.type,
  });

  @override
  State<TaskInspectionScreen> createState() => _TaskInspectionScreenState();
}

class _TaskInspectionScreenState extends State<TaskInspectionScreen> {
  String _fuelLevel = '1/2';
  String _kondisiBody = 'baik';
  String _kondisiInterior = 'baik';
  String _kondisiBan = 'baik';
  String _kondisiAc = 'baik';
  String _kondisiLampu = 'baik';

  int? _odometer;
  bool _adaDamagenya = false;
  final _deskripsiController = TextEditingController();
  final _catatanController = TextEditingController();
  double? _biayaKerusakan;

  final List<String> _fotoPaths = [];
  final List<String> _videoPaths = [];
  GpsLocation? _gps;

  bool _submitting = false;
  String? _error;

  bool get _isBefore => widget.type == TaskInspectionType.before;

  @override
  void initState() {
    super.initState();
    final existing =
        _isBefore ? widget.task.inspectionBefore : widget.task.inspectionAfter;
    if (existing.id != 0) {
      _fuelLevel = _mapBackendFuel(existing.fuelLevel) ?? _fuelLevel;
      _kondisiBody = existing.kondisiBody ?? _kondisiBody;
      _kondisiInterior = existing.kondisiInterior ?? _kondisiInterior;
      _kondisiBan = existing.kondisiBan ?? _kondisiBan;
      _kondisiAc = existing.kondisiAc ?? _kondisiAc;
      _kondisiLampu = existing.kondisiLampu ?? _kondisiLampu;
      _odometer = existing.odometer;
      _adaDamagenya = existing.adaDamagenya;
      _deskripsiController.text = existing.deskripsiKondisi ?? '';
      _catatanController.text = existing.catatan ?? '';
      _biayaKerusakan = existing.biayaKerusakan;
    }
    _loadGps();
  }

  Future<void> _loadGps() async {
    final gps = await LocationService.getCurrentLocation(waitForAccuracy: true);
    if (!mounted) return;
    setState(() => _gps = gps);
  }

  /// Petakan level bensin backend → level FuelGauge (full,3/4,1/2,1/4,empty).
  String? _mapBackendFuel(String? level) {
    switch (level) {
      case 'full':
        return 'full';
      case '7/8':
      case '3/4':
        return '3/4';
      case '5/8':
      case '1/2':
        return '1/2';
      case '3/8':
      case '1/4':
        return '1/4';
      case '1/8':
      case 'kosong':
        return 'empty';
      default:
        return null;
    }
  }

  String _fuelToBackend(String level) {
    switch (level) {
      case 'full':
        return 'full';
      case '3/4':
        return '3/4';
      case '1/2':
        return '1/2';
      case '1/4':
        return '1/4';
      case 'empty':
        return 'kosong';
      default:
        return level;
    }
  }

  @override
  void dispose() {
    _deskripsiController.dispose();
    _catatanController.dispose();
    super.dispose();
  }

  Future<void> _capturePhoto() async {
    final existing =
        _isBefore ? widget.task.inspectionBefore : widget.task.inspectionAfter;
    final result = await Navigator.of(context).push<PhotoCaptureResult>(
      MaterialPageRoute(
        builder: (_) => PhotoCaptureScreen(
          inspectionCode: widget.task.kodeTask,
          taskCode: widget.task.kodeTask,
          taskId: widget.task.id,
          vehicleName: widget.task.kendaraan.namaKendaraan,
          licensePlate: widget.task.kendaraan.platNomor,
          vehicleColor: widget.task.kendaraan.warna,
          inspectionType: _isBefore ? 'Inspeksi Awal' : 'Inspeksi Akhir',
          inspectionId: existing.id != 0 ? '${existing.id}' : null,
        ),
      ),
    );
    if (result != null && mounted) {
      setState(() => _fotoPaths.add(result.photoPath));
    }
  }

  Future<void> _captureVideo() async {
    final result = await Navigator.of(context).push<VideoCaptureResult>(
      MaterialPageRoute(
        builder: (_) => VideoCaptureScreen(
          inspectionCode: widget.task.kodeTask,
          taskCode: widget.task.kodeTask,
          taskId: widget.task.id,
          vehicleName: widget.task.kendaraan.namaKendaraan,
          licensePlate: widget.task.kendaraan.platNomor,
          inspectionType: _isBefore ? 'Inspeksi Awal' : 'Inspeksi Akhir',
        ),
      ),
    );
    if (result != null && mounted) {
      setState(() => _videoPaths.add(result.videoPath));
    }
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final gps = _gps;
      final updated = await TaskService.submitInspection(
        widget.task.id,
        type: widget.type,
        odometer: _odometer,
        fuelLevel: _fuelToBackend(_fuelLevel),
        kondisiBody: _kondisiBody,
        kondisiInterior: _kondisiInterior,
        kondisiBan: _kondisiBan,
        kondisiAc: _kondisiAc,
        kondisiLampu: _kondisiLampu,
        adaDamagenya: _adaDamagenya,
        deskripsiKondisi: _deskripsiController.text.trim().isEmpty
            ? null
            : _deskripsiController.text.trim(),
        catatan: _catatanController.text.trim().isEmpty
            ? null
            : _catatanController.text.trim(),
        biayaKerusakan: _biayaKerusakan,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        accuracy: gps?.accuracy,
        location: gps?.address,
        capturedAt: DateTime.now().toIso8601String(),
        fotoPaths: _fotoPaths,
        videoPaths: _videoPaths,
      );
      if (!mounted) return;
      Navigator.of(context).pop(updated);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(_isBefore ? 'Inspeksi Awal' : 'Inspeksi Akhir'),
      ),
      body: _buildBody(),
      bottomNavigationBar: _buildSubmitBar(),
    );
  }

  Widget _buildBody() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      children: [
        _buildVehicleInfo(),
        const SizedBox(height: 16),
        _buildFuelCard(),
        const SizedBox(height: 16),
        _buildOdometerCard(),
        const SizedBox(height: 16),
        _buildKondisiCard(),
        const SizedBox(height: 16),
        _buildMediaCard(),
        const SizedBox(height: 16),
        _buildKerusakanCard(),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.error.withAlpha(15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.error.withAlpha(60)),
            ),
            child: Text(
              _error!,
              style: const TextStyle(fontSize: 12, color: AppColors.error),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildVehicleInfo() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withAlpha(60)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.task.kodeTask,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${widget.task.kendaraan.displayName} • ${widget.task.customer.namaLengkap ?? '-'}',
            style:
                const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.gps_fixed_rounded,
                  size: 13, color: AppColors.primary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  _gps != null
                      ? '${_gps!.coordinatesLabel} ±${_gps!.accuracyLabel}'
                      : 'Mencari lokasi GPS…',
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFuelCard() {
    return _SectionCard(
      title: 'Level Bensin',
      icon: Icons.local_gas_station_outlined,
      child: FuelGauge(
        level: _fuelLevel,
        liter: _odometer?.toDouble(),
        onLevelChanged: (v) => setState(() => _fuelLevel = v),
        onLiterChanged: (v) => setState(() => _odometer = v.toInt()),
      ),
    );
  }

  Widget _buildOdometerCard() {
    return _SectionCard(
      title: 'Odometer',
      icon: Icons.speed_rounded,
      child: TextFormField(
        initialValue: _odometer?.toString() ?? '',
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(
          hintText: 'Contoh: 24500',
          suffixText: 'km',
          border: OutlineInputBorder(),
          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
        onChanged: (v) => setState(() => _odometer = int.tryParse(v.trim())),
      ),
    );
  }

  Widget _buildKondisiCard() {
    return _SectionCard(
      title: 'Kondisi Kendaraan',
      icon: Icons.badge_outlined,
      child: Column(
        children: [
          _ConditionDropdown(
            label: 'Kondisi Body',
            value: _kondisiBody,
            options: const [
              ('baik', 'Baik'),
              ('lecet_ringan', 'Lecet Ringan'),
              ('lecet_parah', 'Lecet Parah'),
              ('penyok', 'Penyok'),
              ('retak', 'Retak'),
            ],
            onChanged: (v) => setState(() => _kondisiBody = v),
          ),
          const SizedBox(height: 12),
          _ConditionDropdown(
            label: 'Kondisi Interior',
            value: _kondisiInterior,
            options: const [
              ('baik', 'Baik'),
              ('kotor_ringan', 'Kotor Ringan'),
              ('kotor_banyak', 'Kotor Banyak'),
              ('rusak', 'Rusak'),
            ],
            onChanged: (v) => setState(() => _kondisiInterior = v),
          ),
          const SizedBox(height: 12),
          _ConditionDropdown(
            label: 'Kondisi Ban',
            value: _kondisiBan,
            options: const [
              ('baik', 'Baik'),
              ('tipis', 'Tipis'),
              ('gundul', 'Gundul'),
              ('kosong', 'Kosong'),
            ],
            onChanged: (v) => setState(() => _kondisiBan = v),
          ),
          const SizedBox(height: 12),
          _ConditionDropdown(
            label: 'Kondisi AC',
            value: _kondisiAc,
            options: const [
              ('baik', 'Baik'),
              ('tidak_baik', 'Tidak Baik'),
            ],
            onChanged: (v) => setState(() => _kondisiAc = v),
          ),
          const SizedBox(height: 12),
          _ConditionDropdown(
            label: 'Kondisi Lampu',
            value: _kondisiLampu,
            options: const [
              ('baik', 'Baik'),
              ('tidak_baik', 'Tidak Baik'),
            ],
            onChanged: (v) => setState(() => _kondisiLampu = v),
          ),
        ],
      ),
    );
  }

  Widget _buildMediaCard() {
    return _SectionCard(
      title: 'Dokumentasi',
      icon: Icons.photo_camera_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _capturePhoto,
                  icon: const Icon(Icons.photo_camera_outlined, size: 18),
                  label: const Text('Foto Kendaraan'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _captureVideo,
                  icon: const Icon(Icons.videocam_outlined, size: 18),
                  label: const Text('Rekam Video'),
                ),
              ),
            ],
          ),
          if (_fotoPaths.isNotEmpty || _videoPaths.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final path in _fotoPaths)
                  _MediaThumb(path: path, isVideo: false),
                for (final path in _videoPaths)
                  _MediaThumb(path: path, isVideo: true),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildKerusakanCard() {
    return _SectionCard(
      title: 'Kerusakan / Catatan',
      icon: Icons.report_problem_outlined,
      child: Column(
        children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'Ada kerusakan',
              style: TextStyle(fontSize: 13, color: AppColors.textPrimary),
            ),
            value: _adaDamagenya,
            thumbColor: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.selected)) {
                return AppColors.error;
              }
              return null;
            }),
            onChanged: (v) => setState(() => _adaDamagenya = v),
          ),
          if (_adaDamagenya) ...[
            TextFormField(
              controller: _deskripsiController,
              decoration: const InputDecoration(
                hintText: 'Deskripsi kondisi kerusakan',
                border: OutlineInputBorder(),
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            TextFormField(
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                hintText: 'Biaya perbaikan (Rp)',
                border: OutlineInputBorder(),
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              onChanged: (v) =>
                  setState(() => _biayaKerusakan = double.tryParse(v)),
            ),
          ],
          const SizedBox(height: 12),
          TextFormField(
            controller: _catatanController,
            maxLines: 2,
            decoration: const InputDecoration(
              hintText: 'Catatan tambahan',
              border: OutlineInputBorder(),
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitBar() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.icon(
            onPressed: _submitting ? null : _submit,
            icon: _submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send_rounded, size: 18),
            label: Text(
              _submitting ? 'Menyimpan…' : 'Simpan Inspeksi',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
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
          Row(
            children: [
              Icon(icon, size: 16, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _ConditionDropdown extends StatelessWidget {
  final String label;
  final String value;
  final List<(String, String)> options;
  final ValueChanged<String> onChanged;
  const _ConditionDropdown({
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      value: value,
      decoration: InputDecoration(
        labelText: label,
        labelStyle:
            const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        border: const OutlineInputBorder(),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      items: options
          .map((o) => DropdownMenuItem(value: o.$1, child: Text(o.$2)))
          .toList(),
      onChanged: (v) {
        if (v != null) onChanged(v);
      },
    );
  }
}

class _MediaThumb extends StatelessWidget {
  final String path;
  final bool isVideo;
  const _MediaThumb({required this.path, required this.isVideo});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Icon(
        isVideo ? Icons.videocam_rounded : Icons.photo_rounded,
        size: 20,
        color: AppColors.primary,
      ),
    );
  }
}
