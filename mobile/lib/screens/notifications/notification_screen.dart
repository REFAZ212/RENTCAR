import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/mock_data.dart';
import '../../models/notification_model.dart';

class NotificationScreen extends StatelessWidget {
  const NotificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final notifications = MockData.notifications;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifikasi'),
        actions: [
          TextButton(
            onPressed: () {},
            child: const Text('Tandai Semua Dibaca'),
          ),
        ],
      ),
      body: notifications.isEmpty
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.notifications_none_rounded,
                      size: 48, color: AppColors.textHint),
                  SizedBox(height: 12),
                  Text('Tidak ada notifikasi',
                      style: TextStyle(color: AppColors.textSecondary)),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: notifications.length,
              separatorBuilder: (_, __) => const Divider(height: 1, indent: 60),
              itemBuilder: (_, i) =>
                  _NotificationTile(notification: notifications[i]),
            ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  const _NotificationTile({required this.notification});

  @override
  Widget build(BuildContext context) {
    final iconData = _iconForType(notification.type);
    final iconColor = _colorForType(notification.type);

    return Container(
      color: notification.isRead ? null : AppColors.primary50.withAlpha(80),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: iconColor.withAlpha(20),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(iconData, size: 20, color: iconColor),
        ),
        title: Text(
          notification.title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            notification.message,
            style:
                const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        trailing: Text(
          notification.timeAgo,
          style: const TextStyle(fontSize: 10, color: AppColors.textHint),
        ),
      ),
    );
  }

  IconData _iconForType(NotificationType type) {
    switch (type) {
      case NotificationType.task:
        return Icons.task_alt_rounded;
      case NotificationType.inspection:
        return Icons.assignment_turned_in_rounded;
      case NotificationType.system:
        return Icons.info_outline_rounded;
    }
  }

  Color _colorForType(NotificationType type) {
    switch (type) {
      case NotificationType.task:
        return AppColors.primary;
      case NotificationType.inspection:
        return AppColors.success;
      case NotificationType.system:
        return AppColors.info;
    }
  }
}
