import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/inspection/inspection_list_screen.dart';
import '../screens/tasks/task_list_screen.dart';
import '../screens/profile/profile_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          DashboardScreen(),
          InspectionListScreen(),
          TaskListScreen(),
          ProfileScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.primary50,
        height: 68,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined, size: 24),
            selectedIcon: Icon(Icons.dashboard_rounded,
                size: 24, color: AppColors.primary),
            label: 'Beranda',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined, size: 24),
            selectedIcon: Icon(Icons.assignment_rounded,
                size: 24, color: AppColors.primary),
            label: 'Inspeksi',
          ),
          NavigationDestination(
            icon: Icon(Icons.task_outlined, size: 24),
            selectedIcon:
                Icon(Icons.task_rounded, size: 24, color: AppColors.primary),
            label: 'Tugas',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded, size: 24),
            selectedIcon:
                Icon(Icons.person_rounded, size: 24, color: AppColors.primary),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}
