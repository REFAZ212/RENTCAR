import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/theme/app_theme.dart';
import 'screens/auth/login_screen.dart';
import 'services/inspection_service.dart';
import 'services/sync_queue_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await InspectionService.initFromStorage();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const RentCarApp());
  SyncQueueService.syncPending();
}

class RentCarApp extends StatelessWidget {
  const RentCarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'UDIN RENTCAR',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const LoginScreen(),
    );
  }
}
