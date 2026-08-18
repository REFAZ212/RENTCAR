import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class FuelGauge extends StatelessWidget {
  final String level;
  final double? liter;
  final ValueChanged<String>? onLevelChanged;
  final ValueChanged<double>? onLiterChanged;

  const FuelGauge({
    super.key,
    required this.level,
    this.liter,
    this.onLevelChanged,
    this.onLiterChanged,
  });

  double get _fillRatio {
    switch (level) {
      case 'full':
        return 1.0;
      case '3/4':
        return 0.75;
      case '1/2':
        return 0.5;
      case '1/4':
        return 0.25;
      case 'empty':
        return 0.0;
      default:
        return 0.5;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Level Bensin',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 12),
        _buildFuelBar(),
        const SizedBox(height: 12),
        _buildLevelSelector(),
        const SizedBox(height: 12),
        _buildLiterInput(),
      ],
    );
  }

  Widget _buildFuelBar() {
    return Container(
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Stack(
        children: [
          FractionallySizedBox(
            widthFactor: _fillRatio,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withAlpha(180),
                    AppColors.primary,
                  ],
                ),
                borderRadius: BorderRadius.circular(7),
              ),
            ),
          ),
          Center(
            child: Text(
              _getLevelLabel(),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: _fillRatio > 0.5 ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLevelSelector() {
    final levels = [
      ('EMPTY', 'empty', '░░░░░░░░░░'),
      ('1/4', '1/4', '██░░░░░░░░'),
      ('1/2', '1/2', '█████░░░░░'),
      ('3/4', '3/4', '███████░░░'),
      ('FULL', 'full', '██████████'),
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: levels.map((l) {
        final isSelected = level == l.$2;
        return GestureDetector(
          onTap: () => onLevelChanged?.call(l.$2),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primary : AppColors.background,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isSelected ? AppColors.primary : AppColors.border,
              ),
            ),
            child: Column(
              children: [
                Text(
                  l.$3,
                  style: TextStyle(
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  l.$1,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildLiterInput() {
    return Row(
      children: [
        const Text(
          'Liter:',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(width: 12),
        SizedBox(
          width: 100,
          child: TextFormField(
            initialValue: liter?.toStringAsFixed(0) ?? '',
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              hintText: '0',
              suffixText: 'L',
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.border),
              ),
            ),
            onChanged: (v) {
              final parsed = double.tryParse(v);
              if (parsed != null) onLiterChanged?.call(parsed);
            },
          ),
        ),
      ],
    );
  }

  String _getLevelLabel() {
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
}
