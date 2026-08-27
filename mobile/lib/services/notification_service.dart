import '../models/notification_model.dart';
import 'api_client.dart';

/// Notifikasi untuk supir (mobile app).
class NotificationService {
  NotificationService._();

  static Future<List<AppNotification>> list({int perPage = 20}) async {
    final data = await ApiClient.get('/mobile/notifications?per_page=$perPage')
        as Map<String, dynamic>;
    final raw = data['data'] as List<dynamic>? ?? [];
    return raw
        .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<int> unreadCount() async {
    final data = await ApiClient.get('/mobile/notifications/unread-count')
        as Map<String, dynamic>;
    return (data['count'] as num?)?.toInt() ?? 0;
  }

  static Future<void> markAsRead(int id) async {
    await ApiClient.patch('/mobile/notifications/$id/read');
  }
}
