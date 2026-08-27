import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class InspectionProgress extends StatelessWidget {
  final int currentStep;
  final int totalSteps;
  final List<String> stepNames;

  const InspectionProgress({
    super.key,
    required this.currentStep,
    required this.totalSteps,
    required this.stepNames,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      color: AppColors.surface,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Text(
                'Tahap ${currentStep + 1} dari $totalSteps',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              Text(
                stepNames[currentStep],
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: List.generate(totalSteps, (index) {
              final isCompleted = index < currentStep;
              final isCurrent = index == currentStep;
              return Expanded(
                child: Container(
                  height: 4,
                  margin:
                      EdgeInsets.only(right: index < totalSteps - 1 ? 4 : 0),
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? AppColors.primary
                        : isCurrent
                            ? AppColors.primaryLight
                            : AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(totalSteps, (index) {
                final isCompleted = index < currentStep;
                final isCurrent = index == currentStep;
                return Container(
                  margin:
                      EdgeInsets.only(right: index < totalSteps - 1 ? 16 : 0),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isCompleted
                              ? AppColors.primary
                              : isCurrent
                                  ? AppColors.primary
                                  : AppColors.border,
                        ),
                        child: Center(
                          child: isCompleted
                              ? const Icon(Icons.check,
                                  size: 12, color: Colors.white)
                              : Text(
                                  '${index + 1}',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: isCurrent
                                        ? Colors.white
                                        : AppColors.textHint,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        stepNames[index],
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight:
                              isCurrent ? FontWeight.w600 : FontWeight.w500,
                          color: isCurrent
                              ? AppColors.primary
                              : isCompleted
                                  ? AppColors.textPrimary
                                  : AppColors.textHint,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
