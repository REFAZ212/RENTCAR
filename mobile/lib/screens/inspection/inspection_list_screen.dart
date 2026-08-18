import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../models/inspection_model.dart';
import '../../services/inspection_service.dart';
import '../../widgets/inspection_status_badge.dart';
import 'inspection_detail_screen.dart';

class InspectionListScreen extends StatefulWidget {
  const InspectionListScreen({super.key});

  @override
  State<InspectionListScreen> createState() => _InspectionListScreenState();
}

class _InspectionListScreenState extends State<InspectionListScreen> {
  int _selectedFilter = 0;
  final _searchController = TextEditingController();
  String _searchQuery = '';

  List<InspectionModel> get _filteredInspections {
    List<InspectionModel> list;
    switch (_selectedFilter) {
      case 1:
        list = InspectionService.getByType(InspectionType.beforeRental);
        break;
      case 2:
        list = InspectionService.getByType(InspectionType.afterRental);
        break;
      default:
        list = InspectionService.getAll();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((i) {
        return i.vehicleName.toLowerCase().contains(q) ||
            i.plateNumber.toLowerCase().contains(q) ||
            (i.customerName?.toLowerCase().contains(q) ?? false) ||
            i.id.toString().contains(q);
      }).toList();
    }
    return list;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inspections = _filteredInspections;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Inspeksi Kendaraan'),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.filter_list_rounded, size: 22),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          _buildFilterChips(),
          Expanded(
            child: inspections.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.assignment_outlined,
                            size: 48, color: AppColors.textHint),
                        SizedBox(height: 12),
                        Text('Belum ada inspeksi',
                            style: TextStyle(color: AppColors.textSecondary)),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
                    itemCount: inspections.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _InspectionCard(
                      inspection: inspections[i],
                      onTap: () => _navigateToDetail(inspections[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Cari kendaraan, plat, customer...',
          prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.textHint),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                  icon: const Icon(Icons.clear, size: 18, color: AppColors.textHint),
                )
              : null,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          filled: true,
          fillColor: AppColors.surface,
        ),
        onChanged: (v) => setState(() => _searchQuery = v),
      ),
    );
  }

  Widget _buildFilterChips() {
    final filters = ['Semua', 'Sebelum Sewa', 'Sesudah Sewa'];
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Row(
        children: List.generate(filters.length, (i) {
          final isSelected = _selectedFilter == i;
          return Padding(
            padding: EdgeInsets.only(right: i < filters.length - 1 ? 8 : 0),
            child: GestureDetector(
              onTap: () => setState(() => _selectedFilter = i),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : AppColors.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected ? AppColors.primary : AppColors.border,
                  ),
                ),
                child: Text(
                  filters[i],
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  void _navigateToDetail(InspectionModel inspection) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => InspectionDetailScreen(inspection: inspection),
      ),
    );
  }
}

class _InspectionCard extends StatelessWidget {
  final InspectionModel inspection;
  final VoidCallback? onTap;

  const _InspectionCard({required this.inspection, this.onTap});

  @override
  Widget build(BuildContext context) {
    final isBefore = inspection.type == InspectionType.beforeRental;

    return GestureDetector(
      onTap: onTap,
      child: Container(
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
                if (isBefore)
                  InspectionStatusBadge.beforeRental()
                else
                  InspectionStatusBadge.afterRental(),
                const Spacer(),
                _buildStatusBadge(),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              inspection.vehicleName,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              inspection.plateNumber,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
            if (inspection.customerName != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.person_outline, size: 13, color: AppColors.textHint),
                  const SizedBox(width: 4),
                  Text(
                    inspection.customerName!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                _InfoChip(
                  icon: Icons.camera_alt_outlined,
                  label: '${inspection.photoCount}',
                ),
                const SizedBox(width: 10),
                _InfoChip(
                  icon: Icons.videocam_outlined,
                  label: '${inspection.videoCount}',
                ),
                if (inspection.damageCount > 0) ...[
                  const SizedBox(width: 10),
                  _InfoChip(
                    icon: Icons.warning_amber_rounded,
                    label: '${inspection.damageCount}',
                    color: AppColors.error,
                  ),
                ],
                const Spacer(),
                Text(
                  _formatDate(inspection.date),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textHint,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: _buildActionButton(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge() {
    if (inspection.isCompleted) {
      return InspectionStatusBadge.completed();
    } else if (inspection.isInProgress) {
      return InspectionStatusBadge.inProgress();
    }
    return InspectionStatusBadge.draft();
  }

  Widget _buildActionButton() {
    if (inspection.isCompleted) {
      return OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          padding: const EdgeInsets.symmetric(vertical: 10),
        ),
        child: const Text('Lihat Hasil', style: TextStyle(fontSize: 13)),
      );
    } else if (inspection.isInProgress) {
      return ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          padding: const EdgeInsets.symmetric(vertical: 10),
        ),
        child: const Text('Lanjutkan Inspeksi', style: TextStyle(fontSize: 13)),
      );
    }
    return ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        padding: const EdgeInsets.symmetric(vertical: 10),
      ),
      child: const Text('Mulai Inspeksi', style: TextStyle(fontSize: 13)),
    );
  }

  String _formatDate(DateTime d) {
    return '${d.day}/${d.month}/${d.year} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  const _InfoChip({required this.icon, required this.label, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.textSecondary;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: c),
        const SizedBox(width: 3),
        Text(
          label,
          style: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w500, color: c),
        ),
      ],
    );
  }
}
