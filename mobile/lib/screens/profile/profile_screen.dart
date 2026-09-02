import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../models/driver_model.dart';
import '../../services/auth_service.dart';
import '../../services/session_store.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  DriverModel? _driver;
  bool _isLoading = true;
  bool _isLoggingOut = false;

  @override
  void initState() {
    super.initState();
    _loadDriver();
  }

  Future<void> _loadDriver() async {
    final driver = await SessionStore.getDriver();
    if (mounted) {
      setState(() {
        _driver = driver;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleLogout() async {
    setState(() => _isLoggingOut = true);
    try {
      await AuthService.logout();
    } catch (_) {
      // Ignore errors, proceed to clear local session
    }
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Profil')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final name = _driver?.nama ?? 'Supir';
    final email = _driver?.email ?? '';
    final phone = _driver?.noHp ?? '';
    final initials = name.isNotEmpty ? name.split(' ').map((e) => e[0]).take(2).join() : '?';

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
                      initials,
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
                  name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  email,
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary),
                ),
                if (phone.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    phone,
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.textSecondary),
                  ),
                ],
                const SizedBox(height: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Supir',
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
              onPressed: _isLoggingOut ? null : _handleLogout,
              icon: _isLoggingOut
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.logout_rounded, size: 18),
              label: Text(_isLoggingOut ? 'Keluar...' : 'Keluar'),
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
