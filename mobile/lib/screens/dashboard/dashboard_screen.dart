import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/mock_data.dart';
import '../../models/vehicle_model.dart';
import '../../models/task_model.dart';
import '../../models/driver_model.dart';
import '../../services/session_store.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  DriverModel? _driver;
  bool _isLoading = true;

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Selamat pagi,';
    if (h < 17) return 'Selamat siang,';
    return 'Selamat malam,';
  }

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

  @override
  Widget build(BuildContext context) {
    final name = _driver?.nama ?? 'Supir';

    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _buildHeader(context, name)),
            SliverToBoxAdapter(child: _buildSummaryCard()),
            SliverToBoxAdapter(child: _buildPromoBanner()),
            SliverToBoxAdapter(
              child: _buildSectionHeader(
                title: 'Kendaraan Ditugaskan',
                onSeeAll: () {},
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _buildVehicleCard(MockData.vehicles[i]),
                  ),
                  childCount: MockData.vehicles.length,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: _buildSectionHeader(
                title: 'Tugas Hari Ini',
                onSeeAll: () {},
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _buildTaskRow(MockData.tasks[i]),
                  ),
                  childCount: MockData.tasks.length,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------- Header ----------

  Widget _buildHeader(BuildContext context, String name) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 48),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.primaryDark],
        ),
      ),
      child: ClipRect(
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            // Decorative background circles
            Positioned(
              right: -30,
              top: -40,
              child: Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withAlpha(18), width: 1),
                ),
              ),
            ),
            Positioned(
              right: 10,
              top: -10,
              child: Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withAlpha(14), width: 1),
                ),
              ),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Avatar
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(38),
                    shape: BoxShape.circle,
                    border:
                        Border.all(color: Colors.white.withAlpha(60), width: 1.5),
                  ),
                  child: Center(
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _greeting(),
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withAlpha(200),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 21,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 9, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(40),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.verified_rounded,
                                size: 12, color: Colors.white),
                            SizedBox(width: 4),
                            Text(
                              'Supir',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(30),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        padding: EdgeInsets.zero,
                        onPressed: () {},
                        icon: const Icon(
                          Icons.notifications_outlined,
                          size: 20,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    if (MockData.unreadNotifications > 0)
                      Positioned(
                        right: 2,
                        top: 2,
                        child: Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            color: AppColors.error,
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: AppColors.primary, width: 1.5),
                          ),
                          child: Center(
                            child: Text(
                              '${MockData.unreadNotifications}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ---------- Summary card (Ringkasan) ----------

  Widget _buildSummaryCard() {
    final items = [
      _StatItem(
        'Tugas Baru',
        '${MockData.todayTasks}',
        Icons.assignment_rounded,
        AppColors.primary,
        AppColors.primary50,
      ),
      _StatItem(
        'Tugas Selesai',
        '${MockData.todayInspections}',
        Icons.check_circle_rounded,
        AppColors.success,
        AppColors.successLight,
      ),
      _StatItem(
        'Perlu Perhatian',
        '${MockData.pendingInspections}',
        Icons.assignment_late_rounded,
        AppColors.warning,
        AppColors.warningLight,
      ),
      _StatItem(
        'Notifikasi',
        '${MockData.unreadNotifications}',
        Icons.notifications_active_rounded,
        AppColors.info,
        AppColors.infoLight,
      ),
    ];

    return Transform.translate(
      offset: const Offset(0, -28),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(18),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: const [
                    Icon(Icons.grid_view_rounded,
                        size: 18, color: AppColors.primary),
                    SizedBox(width: 8),
                    Text(
                      'Ringkasan',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary50,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Icon(Icons.calendar_today_rounded,
                          size: 13, color: AppColors.primary),
                      SizedBox(width: 5),
                      Text(
                        'Hari ini',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                      SizedBox(width: 2),
                      Icon(Icons.keyboard_arrow_down_rounded,
                          size: 15, color: AppColors.primary),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (int i = 0; i < items.length; i++) ...[
                  if (i > 0) const SizedBox(width: 8),
                  Expanded(child: _buildStatColumn(items[i])),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn(_StatItem item) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
      decoration: BoxDecoration(
        color: item.bgColor,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.surface,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(15),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Center(
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: item.color,
                  shape: BoxShape.circle,
                ),
                child: Icon(item.icon, size: 14, color: Colors.white),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item.value,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            item.label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 9.5,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            width: 20,
            height: 3,
            decoration: BoxDecoration(
              color: item.color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ),
    );
  }

  // ---------- Promo banner ----------

  Widget _buildPromoBanner() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
      child: Container(
        height: 150,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.primaryDark, AppColors.primary],
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withAlpha(60),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Decorative circles
            Positioned(
              right: -20,
              bottom: -30,
              child: Container(
                width: 130,
                height: 130,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border:
                      Border.all(color: Colors.white.withAlpha(20), width: 1),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 16, 16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Jalankan tugasmu\ndengan aman & profesional',
                          style: TextStyle(
                            fontSize: 15.5,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '"',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: Colors.white.withAlpha(140),
                                height: 1,
                              ),
                            ),
                            const SizedBox(width: 2),
                            Expanded(
                              child: Text(
                                'Keselamatan adalah prioritas, kepuasan pelanggan adalah tujuan.',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.white.withAlpha(210),
                                  fontWeight: FontWeight.w500,
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Replace this Icon with Image.asset('assets/images/car_banner.png')
                  // once a transparent PNG/SVG of the car is added to the project.
                  Icon(
                    Icons.directions_car_filled_rounded,
                    size: 84,
                    color: Colors.white.withAlpha(235),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------- Section header ----------

  Widget _buildSectionHeader({
    required String title,
    required VoidCallback onSeeAll,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 12, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              letterSpacing: -0.2,
            ),
          ),
          TextButton(
            onPressed: onSeeAll,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              visualDensity: VisualDensity.compact,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Text(
                  'Lihat Semua',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                SizedBox(width: 2),
                Icon(Icons.arrow_forward_ios_rounded, size: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ---------- Vehicle card ----------

  Widget _buildVehicleCard(VehicleModel v) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(12),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: v.isRented ? AppColors.primary50 : AppColors.successLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.directions_car_rounded,
              color: v.isRented ? AppColors.primary : AppColors.success,
              size: 26,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  v.displayName,
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    const Icon(Icons.confirmation_number_outlined,
                        size: 13, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      v.plateNumber,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                // NOTE: add `color` and `year` fields to VehicleModel to enable
                // this subtitle line (e.g. "Putih • 2018"), then uncomment:
                //
                // const SizedBox(height: 2),
                // Text(
                //   '${v.color} • ${v.year}',
                //   style: const TextStyle(
                //     fontSize: 11.5,
                //     color: AppColors.textSecondary,
                //   ),
                // ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color:
                  v.isRented ? AppColors.warningLight : AppColors.successLight,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: v.isRented ? AppColors.warning : AppColors.success,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  v.statusLabel,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: v.isRented ? AppColors.warning : AppColors.success,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right_rounded,
              size: 20, color: AppColors.textSecondary),
        ],
      ),
    );
  }

  // ---------- Task row ----------

  Widget _buildTaskRow(TaskModel t) {
    final statusColor = t.isDone
        ? AppColors.success
        : t.status == TaskStatus.late
            ? AppColors.error
            : AppColors.textSecondary;

    final accentColor = t.isUrgent
        ? AppColors.error
        : t.status == TaskStatus.done
            ? AppColors.success
            : AppColors.primary;

    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: accentColor.withAlpha(20),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(
              t.isDone
                  ? Icons.check_circle_rounded
                  : t.isUrgent
                      ? Icons.priority_high_rounded
                      : Icons.schedule_rounded,
              size: 18,
              color: accentColor,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t.title,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  '${t.vehicleName} • ${t.plateNumber}',
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withAlpha(20),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              t.statusLabel,
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                color: statusColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final Color bgColor;
  const _StatItem(this.label, this.value, this.icon, this.color, this.bgColor);
}