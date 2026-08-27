import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../models/inspection_model.dart';

class StepDataUmum extends StatelessWidget {
  final InspectionModel inspection;

  const StepDataUmum({super.key, required this.inspection});

  @override
  Widget build(BuildContext context) {
    final info = inspection.vehicleInfo;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primary50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline,
                    color: AppColors.primary, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Data kendaraan diambil dari booking. Tidak perlu mengetik ulang.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.primary.withAlpha(200),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _buildSection('Data Kendaraan', [
            _buildInfoRow(
                'Merk', info?.brand ?? inspection.vehicleName.split(' ').first),
            _buildInfoRow(
                'Tipe',
                info?.type ??
                    (inspection.vehicleName.split(' ').length > 1
                        ? inspection.vehicleName.split(' ').sublist(1).join(' ')
                        : '')),
            _buildInfoRow('Nomor Polisi', inspection.plateNumber),
          ]),
          const SizedBox(height: 12),
          _buildSection('Data Customer', [
            _buildInfoRow('Nama Customer',
                info?.customerName ?? inspection.customerName ?? '-'),
            _buildInfoRow('Booking',
                info?.bookingCode ?? '#${inspection.bookingId ?? "-"}'),
            if (info?.purpose != null)
              _buildInfoRow('Tujuan Sewa', info!.purpose!),
          ]),
          const SizedBox(height: 12),
          _buildSection('Jadwal Sewa', [
            if (info?.rentalStart != null)
              _buildInfoRow('Tanggal Mulai', _formatDate(info!.rentalStart!)),
            if (info?.rentalEnd != null)
              _buildInfoRow('Tanggal Selesai', _formatDate(info!.rentalEnd!)),
            if (info?.startTime != null)
              _buildInfoRow('Jam Mulai', info!.startTime!),
            if (info?.endTime != null)
              _buildInfoRow('Jam Selesai', info!.endTime!),
            if (info?.rentalRate != null)
              _buildInfoRow('Tarif Sewa', info!.rentalRateLabel),
          ]),
          const SizedBox(height: 12),
          _buildSection('Inspeksi', [
            _buildInfoRow('Jenis Inspeksi', inspection.typeLabel),
            _buildInfoRow('Tanggal Inspeksi', _formatDate(inspection.date)),
            _buildInfoRow('Waktu', _formatTime(inspection.date)),
            _buildInfoRow('Petugas', inspection.officerName ?? '-'),
          ]),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
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
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
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
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime d) {
    final months = [
      '',
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember'
    ];
    return '${d.day} ${months[d.month]} ${d.year}';
  }

  String _formatTime(DateTime d) {
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }
}
