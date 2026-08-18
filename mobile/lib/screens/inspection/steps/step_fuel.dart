import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../widgets/fuel_gauge.dart';

class StepFuel extends StatelessWidget {
  final String fuelLevel;
  final double? fuelLiter;
  final ValueChanged<String> onLevelChanged;
  final ValueChanged<double> onLiterChanged;

  const StepFuel({
    super.key,
    required this.fuelLevel,
    this.fuelLiter,
    required this.onLevelChanged,
    required this.onLiterChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Row(
              children: [
                Icon(Icons.local_gas_station_outlined, color: AppColors.primary, size: 18),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Catat level bensin kendaraan saat ini.',
                    style: TextStyle(fontSize: 12, color: AppColors.primary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: FuelGauge(
              level: fuelLevel,
              liter: fuelLiter,
              onLevelChanged: onLevelChanged,
              onLiterChanged: onLiterChanged,
            ),
          ),
        ],
      ),
    );
  }
}
