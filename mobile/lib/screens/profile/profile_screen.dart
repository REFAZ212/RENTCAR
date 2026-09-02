import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/mock_data.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = MockData.currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Profil')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Text(
                      user.initials,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  user.name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  user.email,
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    user.roleLabel,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _buildSection([
            _MenuItem(icon: Icons.person_outline_rounded, title: 'Edit Profil'),
            _MenuItem(icon: Icons.lock_outline_rounded, title: 'Ubah Password'),
            _MenuItem(
                icon: Icons.notifications_outlined,
                title: 'Pengaturan Notifikasi'),
          ]),
          const SizedBox(height: 16),
          _buildSection([
            _MenuItem(icon: Icons.help_outline_rounded, title: 'Bantuan'),
            _MenuItem(
                icon: Icons.info_outline_rounded, title: 'Tentang Aplikasi'),
          ]),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (_) => false,
                );
              },
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: const Text('Keluar'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: const BorderSide(color: AppColors.error),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(List<_MenuItem> items) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            ListTile(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              leading:
                  Icon(items[i].icon, size: 20, color: AppColors.textSecondary),
              title: Text(
                items[i].title,
                style:
                    const TextStyle(fontSize: 14, color: AppColors.textPrimary),
              ),
              trailing: const Icon(Icons.chevron_right_rounded,
                  size: 18, color: AppColors.textHint),
              onTap: () {},
            ),
            if (i < items.length - 1)
              const Divider(height: 1, indent: 52, color: AppColors.divider),
          ],
        ],
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String title;
  const _MenuItem({required this.icon, required this.title});
}
