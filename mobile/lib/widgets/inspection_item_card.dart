import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../models/inspection_item_model.dart';

class InspectionItemCard extends StatelessWidget {
  final InspectionItem item;
  final ValueChanged<ItemStatus>? onStatusChanged;
  final ValueChanged<String>? onNoteChanged;
  final VoidCallback? onPhotoTap;
  final bool showDamageOptions;
  final Widget? comparisonWidget;

  const InspectionItemCard({
    super.key,
    required this.item,
    this.onStatusChanged,
    this.onNoteChanged,
    this.onPhotoTap,
    this.showDamageOptions = true,
    this.comparisonWidget,
  });

  @override
  Widget build(BuildContext context) {
    final hasDamage = item.hasDamage;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: hasDamage ? AppColors.error.withAlpha(80) : AppColors.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item.name,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          if (comparisonWidget != null) ...[
            comparisonWidget!,
            const SizedBox(height: 10),
          ],
          _buildStatusSelector(),
          if (hasDamage && showDamageOptions) ...[
            const SizedBox(height: 10),
            _buildDamageTypeSelector(),
            const SizedBox(height: 10),
            _buildDamageDescription(),
          ],
          const SizedBox(height: 10),
          _buildNoteField(),
          const SizedBox(height: 10),
          _buildPhotoButton(),
        ],
      ),
    );
  }

  Widget _buildStatusSelector() {
    return Row(
      children: [
        _StatusOption(
          label: 'Baik',
          icon: Icons.check_circle_outline,
          isSelected: item.isOk,
          onTap: () => onStatusChanged?.call(ItemStatus.ok),
        ),
        const SizedBox(width: 8),
        _StatusOption(
          label: 'Ada Kerusakan',
          icon: Icons.warning_amber_outlined,
          isSelected: item.status == ItemStatus.notOk || item.status == ItemStatus.damaged,
          color: AppColors.error,
          onTap: () => onStatusChanged?.call(ItemStatus.notOk),
        ),
        const SizedBox(width: 8),
        _StatusOption(
          label: 'Perlu Perhatian',
          icon: Icons.info_outline,
          isSelected: item.status == ItemStatus.needsAttention,
          color: AppColors.warning,
          onTap: () => onStatusChanged?.call(ItemStatus.needsAttention),
        ),
      ],
    );
  }

  Widget _buildDamageTypeSelector() {
    final damageTypes = [
      DamageType.scratch,
      DamageType.dent,
      DamageType.crack,
      DamageType.broken,
      DamageType.paintPeeling,
      DamageType.lightBroken,
      DamageType.glassBroken,
      DamageType.tireBroken,
      DamageType.other,
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Jenis Kerusakan:',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: damageTypes.map((type) {
            final isSelected = item.damageType == type;
            return GestureDetector(
              onTap: () {
                // Would need a callback to set damage type
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.errorLight : AppColors.background,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: isSelected ? AppColors.error : AppColors.border,
                  ),
                ),
                child: Text(
                  _getDamageTypeLabel(type),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: isSelected ? AppColors.error : AppColors.textSecondary,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: item.damageDescription,
          decoration: InputDecoration(
            hintText: 'Deskripsi kerusakan...',
            hintStyle: const TextStyle(fontSize: 13),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.border),
            ),
          ),
          maxLines: 2,
          onChanged: onNoteChanged,
        ),
      ],
    );
  }

  Widget _buildDamageDescription() {
    return const SizedBox.shrink();
  }

  Widget _buildNoteField() {
    return TextFormField(
      initialValue: item.note,
      decoration: InputDecoration(
        hintText: 'Catatan...',
        hintStyle: const TextStyle(fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
      ),
      maxLines: 2,
      onChanged: onNoteChanged,
    );
  }

  Widget _buildPhotoButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onPhotoTap,
        icon: const Icon(Icons.camera_alt_outlined, size: 18),
        label: const Text('Ambil Foto'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          padding: const EdgeInsets.symmetric(vertical: 10),
        ),
      ),
    );
  }

  String _getDamageTypeLabel(DamageType type) {
    switch (type) {
      case DamageType.scratch:
        return 'Lecet';
      case DamageType.dent:
        return 'Penyok';
      case DamageType.crack:
        return 'Retak';
      case DamageType.broken:
        return 'Pecah';
      case DamageType.paintPeeling:
        return 'Cat Terkelupas';
      case DamageType.lightBroken:
        return 'Lampu Rusak';
      case DamageType.glassBroken:
        return 'Kaca Rusak';
      case DamageType.tireBroken:
        return 'Ban Rusak';
      case DamageType.other:
        return 'Lainnya';
    }
  }
}

class _StatusOption extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final Color? color;
  final VoidCallback? onTap;

  const _StatusOption({
    required this.label,
    required this.icon,
    this.isSelected = false,
    this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.primary;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? c.withAlpha(20) : AppColors.background,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? c : AppColors.border,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 14,
                color: isSelected ? c : AppColors.textHint,
              ),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    color: isSelected ? c : AppColors.textHint,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
