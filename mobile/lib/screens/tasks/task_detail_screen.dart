import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../models/driver_task.dart';
import '../../services/location_service.dart';
import '../../services/task_service.dart';
import 'task_inspection_screen.dart';

class TaskDetailScreen extends StatefulWidget {
  final int taskId;
  const TaskDetailScreen({super.key, required this.taskId});

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  DriverTask? _task;
  bool _loading = true;
  bool _acting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final task = await TaskService.show(widget.taskId);
      if (!mounted) return;
      setState(() {
        _task = task;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _run(Future<DriverTask> Function() action) async {
    if (_acting) return;
    setState(() {
      _acting = true;
      _error = null;
    });
    try {
      final updated = await action();
      if (!mounted) return;
      setState(() {
        _task = updated;
        _acting = false;
      });
      _showSnack('Berhasil', AppColors.success);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _acting = false;
        _error = e.toString();
      });
      _showSnack(e.toString(), AppColors.error);
    }
  }

  void _showSnack(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: color),
    );
  }

  Future<dynamic> _getGps() async {
    try {
      if (!await LocationService.isServiceEnabled()) return null;
      if (!await LocationService.ensurePermission()) return null;
      return await LocationService.getCurrentLocation(waitForAccuracy: false);
    } catch (_) {
      return null;
    }
  }

  Future<void> _accept() => _run(() => TaskService.accept(widget.taskId));

  Future<void> _startInspectionBefore() =>
      _run(() => TaskService.startInspectionBefore(widget.taskId));

  Future<void> _complete() => _run(() => TaskService.complete(widget.taskId));

  Future<void> _arrive() async {
    if (_acting) return;
    setState(() {
      _acting = true;
      _error = null;
    });
    try {
      final gps = await _getGps();
      final updated = await TaskService.arrive(
        widget.taskId,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        accuracy: gps?.accuracy,
      );
      if (!mounted) return;
      setState(() {
        _task = updated;
        _acting = false;
      });
      _showSnack('Kendaraan tiba di tujuan', AppColors.success);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _acting = false;
        _error = e.toString();
      });
      _showSnack(e.toString(), AppColors.error);
    }
  }

  Future<void> _openInspection(TaskInspectionType type) async {
    final task = _task;
    if (task == null) return;
    final updated = await Navigator.of(context).push<DriverTask>(
      MaterialPageRoute(
        builder: (_) => TaskInspectionScreen(task: task, type: type),
      ),
    );
    if (updated != null && mounted) {
      setState(() => _task = updated);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: Text(_task?.kodeTask ?? 'Detail Tugas')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null && _task == null) {
      return _ErrorState(message: _error!, onRetry: _load);
    }

    final task = _task!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
      children: [
        _StatusProgress(task: task),
        const SizedBox(height: 16),
        _InfoCard(task: task),
        if (task.inspectionBefore.id != 0) ...[
          const SizedBox(height: 16),
          _InspectionCard(title: 'Inspeksi Awal', inspeksi: task.inspectionBefore),
        ],
        if (task.inspectionAfter.id != 0) ...[
          const SizedBox(height: 16),
          _InspectionCard(title: 'Inspeksi Akhir', inspeksi: task.inspectionAfter),
        ],
        const SizedBox(height: 20),
        _buildActionButton(task),
      ],
    );
  }

  Widget _buildActionButton(DriverTask task) {
    if (_acting) return const Center(child: CircularProgressIndicator());

    _ActionConfig? config;
    switch (task.status) {
      case DriverTaskStatus.available:
        config = _ActionConfig(
          label: 'Ambil Tugas Ini',
          icon: Icons.play_arrow_rounded,
          color: AppColors.success,
          onPressed: _accept,
        );
        break;
      case DriverTaskStatus.accepted:
        config = _ActionConfig(
          label: 'Mulai Inspeksi Awal',
          icon: Icons.document_scanner_outlined,
          color: AppColors.primary,
          onPressed: _startInspectionBefore,
        );
        break;
      case DriverTaskStatus.inspectionBefore:
        config = _ActionConfig(
          label: 'Isi Inspeksi Awal',
          icon: Icons.assignment_turned_in_outlined,
          color: AppColors.primary,
          onPressed: () => _openInspection(TaskInspectionType.before),
        );
        break;
      case DriverTaskStatus.onDelivery:
        config = _ActionConfig(
          label: 'Tiba di Tujuan',
          icon: Icons.flag_rounded,
          color: AppColors.info,
          onPressed: _arrive,
        );
        break;
      case DriverTaskStatus.arrived:
        config = _ActionConfig(
          label: 'Isi Inspeksi Akhir',
          icon: Icons.fact_check_outlined,
          color: AppColors.primary,
          onPressed: () => _openInspection(TaskInspectionType.after),
        );
        break;
      case DriverTaskStatus.inspectionAfter:
        config = _ActionConfig(
          label: 'Selesaikan Tugas',
          icon: Icons.check_circle_outline_rounded,
          color: AppColors.success,
          onPressed: _complete,
        );
        break;
      case DriverTaskStatus.completed:
        return const _FinishedLabel(text: 'Tugas Selesai', color: AppColors.success);
      case DriverTaskStatus.cancelled:
        return const _FinishedLabel(text: 'Tugas Dibatalkan', color: AppColors.error);
      case DriverTaskStatus.pending:
      case DriverTaskStatus.unknown:
        return const SizedBox.shrink();
    }

    return Column(
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: AppColors.error),
            ),
          ),
        _ActionButton(config: config),
      ],
    );
  }
}

class _ActionConfig {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;
  const _ActionConfig({
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
  });
}

class _ActionButton extends StatelessWidget {
  final _ActionConfig config;
  const _ActionButton({required this.config});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: FilledButton.icon(
        onPressed: config.onPressed,
        icon: Icon(config.icon, size: 20),
        label: Text(
          config.label,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
        style: FilledButton.styleFrom(
          backgroundColor: config.color,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}

class _FinishedLabel extends StatelessWidget {
  final String text;
  final Color color;
  const _FinishedLabel({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: Text(
          '✓ $text',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ),
    );
  }
}

class _StatusProgress extends StatelessWidget {
  final DriverTask task;
  const _StatusProgress({required this.task});

  static const _steps = ['Diterima', 'Inspeksi\nAwal', 'Dikirim', 'Sampai', 'Inspeksi\nAkhir', 'Selesai'];

  int get _currentIndex {
    switch (task.status) {
      case DriverTaskStatus.accepted:
        return 0;
      case DriverTaskStatus.inspectionBefore:
        return 1;
      case DriverTaskStatus.onDelivery:
        return 2;
      case DriverTaskStatus.arrived:
        return 3;
      case DriverTaskStatus.inspectionAfter:
        return 4;
      case DriverTaskStatus.completed:
        return 5;
      default:
        return -1;
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = _currentIndex;
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
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: task.isActive ? AppColors.primary : AppColors.success.withAlpha(20),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              task.status.label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: task.isActive ? Colors.white : AppColors.success,
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (current < 0)
            const Text(
              'Menunggu diproses petugas',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            )
          else
            Row(
              children: [
                for (var i = 0; i < _steps.length; i++) ...[
                  _StepDot(index: i, current: current, label: _steps[i]),
                  if (i < _steps.length - 1)
                    Expanded(
                      child: Container(
                        height: 2,
                        color: i < current ? AppColors.primary : AppColors.border,
                      ),
                    ),
                ],
              ],
            ),
        ],
      ),
    );
  }
}

class _StepDot extends StatelessWidget {
  final int index;
  final int current;
  final String label;
  const _StepDot({required this.index, required this.current, required this.label});

  @override
  Widget build(BuildContext context) {
    final done = index < current;
    final active = index == current;
    final color = done || active ? AppColors.primary : AppColors.border;
    return Column(
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: active ? AppColors.primary : AppColors.surface,
            border: Border.all(color: color, width: 2),
          ),
          child: done
              ? const Icon(Icons.check_rounded, size: 14, color: AppColors.primary)
              : active
                  ? const Icon(Icons.circle, size: 10, color: Colors.white)
                  : null,
        ),
        const SizedBox(height: 6),
        Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 9,
            height: 1.1,
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
            color: active ? AppColors.primary : AppColors.textHint,
          ),
        ),
      ],
    );
  }
}

class _InfoCard extends StatelessWidget {
  final DriverTask task;
  const _InfoCard({required this.task});

  @override
  Widget build(BuildContext context) {
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
            'Detail Pengantaran',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 12),
          _InfoTile(icon: Icons.directions_car_outlined, label: 'Kendaraan', value: task.kendaraan.displayName),
          if (task.kendaraan.warna != null) ...[
            const SizedBox(height: 8),
            _InfoTile(icon: Icons.palette_outlined, label: 'Warna', value: task.kendaraan.warna!),
          ],
          if (task.customer.namaLengkap != null) ...[
            const SizedBox(height: 8),
            _InfoTile(icon: Icons.person_outline_rounded, label: 'Customer', value: task.customer.namaLengkap!),
          ],
          if (task.customer.noHp != null) ...[
            const SizedBox(height: 8),
            _InfoTile(icon: Icons.phone_outlined, label: 'No. HP', value: task.customer.noHp!),
          ],
          if (task.orderCode != null) ...[
            const SizedBox(height: 8),
            _InfoTile(icon: Icons.receipt_long_outlined, label: 'Kode Order', value: task.orderCode!),
          ],
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppColors.divider),
          const SizedBox(height: 12),
          _InfoTile(icon: Icons.logout_rounded, label: 'Lokasi Jemput', value: task.pickup.location ?? '-'),
          const SizedBox(height: 8),
          _InfoTile(icon: Icons.location_on_outlined, label: 'Tujuan', value: task.destination.location ?? '-'),
          if (task.deskripsi != null && task.deskripsi!.isNotEmpty) ...[
            const SizedBox(height: 8),
            _InfoTile(icon: Icons.notes_rounded, label: 'Catatan Tugas', value: task.deskripsi!),
          ],
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoTile({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppColors.textHint),
        const SizedBox(width: 8),
        SizedBox(
          width: 96,
          child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textHint)),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
          ),
        ),
      ],
    );
  }
}

class _InspectionCard extends StatelessWidget {
  final String title;
  final DriverTaskInspection inspeksi;
  const _InspectionCard({required this.title, required this.inspeksi});

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
              const Icon(Icons.fact_check_outlined, size: 16, color: AppColors.success),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
              ),
              const Spacer(),
              Text(
                '${inspeksi.fotos.length} foto • ${inspeksi.videos.length} video',
                style: const TextStyle(fontSize: 11, color: AppColors.textHint),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _InspectionRow(label: 'Odometer', value: inspeksi.odometer != null ? '${inspeksi.odometer} km' : '-'),
          const SizedBox(height: 6),
          _InspectionRow(label: 'Bensin', value: inspeksi.fuelLevel ?? '-'),
          const SizedBox(height: 6),
          _InspectionRow(label: 'Body', value: inspeksi.kondisiBody ?? '-'),
          if (inspeksi.deskripsiKondisi != null) ...[
            const SizedBox(height: 6),
            _InspectionRow(label: 'Kondisi', value: inspeksi.deskripsiKondisi!),
          ],
        ],
      ),
    );
  }
}

class _InspectionRow extends StatelessWidget {
  final String label;
  final String value;
  const _InspectionRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 80,
          child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textHint)),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
          ),
        ),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, size: 48, color: AppColors.textHint),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }
}