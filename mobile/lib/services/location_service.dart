import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

import '../models/gps_location.dart';

class LocationService {
  LocationService._();

  static const double acceptableAccuracy = 20.0;
  static const int maxAttempts = 5;
  static const Duration waitBetweenAttempts = Duration(seconds: 3);

  static Future<bool> isServiceEnabled() async {
    try {
      return await Geolocator.isLocationServiceEnabled();
    } catch (_) {
      return false;
    }
  }

  static Future<bool> ensurePermission() async {
    bool serviceEnabled = await isServiceEnabled();
    if (!serviceEnabled) return false;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      return false;
    }
    return permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;
  }

  static Future<GpsLocation?> getCurrentLocation(
      {bool waitForAccuracy = true}) async {
    if (!await ensurePermission()) return null;

    try {
      GpsLocation? best;

      for (int i = 0; i < maxAttempts; i++) {
        Position position;
        try {
          position = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.best,
              distanceFilter: 0,
              timeLimit: Duration(seconds: 15),
            ),
          );
        } catch (_) {
          final lastKnown = await Geolocator.getLastKnownPosition();
          if (lastKnown == null) {
            if (i < maxAttempts - 1) {
              await Future.delayed(waitBetweenAttempts);
              continue;
            }
            return null;
          }
          position = lastKnown;
        }

        final gps = GpsLocation(
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          capturedAt: DateTime.now(),
          timezone: _timezoneName(),
        );

        if (best == null || gps.accuracy < best.accuracy) {
          best = gps;
        }

        if (gps.isAccurate || !waitForAccuracy) {
          return best;
        }

        if (i < maxAttempts - 1) {
          await Future.delayed(waitBetweenAttempts);
        }
      }

      return best;
    } catch (_) {
      return null;
    }
  }

  static Future<GpsLocation> enrichAddress(GpsLocation location) async {
    if (location.address != null) return location;
    try {
      final placemarks = await placemarkFromCoordinates(
        location.latitude,
        location.longitude,
      );
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final parts = <String>[
          if (p.subLocality != null && p.subLocality!.isNotEmpty)
            p.subLocality!,
          if (p.locality != null && p.locality!.isNotEmpty) p.locality!,
          if (p.subAdministrativeArea != null &&
              p.subAdministrativeArea!.isNotEmpty)
            p.subAdministrativeArea!,
          if (p.administrativeArea != null && p.administrativeArea!.isNotEmpty)
            p.administrativeArea!,
        ];
        return location.copyWith(
          address: parts.isNotEmpty ? parts.join(', ') : null,
        );
      }
    } catch (_) {}
    return location;
  }

  static String _timezoneName() {
    try {
      final offset = DateTime.now().timeZoneOffset;
      // Jakarta = +07:00 -> WIB
      if (offset.inHours == 7) return 'Asia/Jakarta';
      if (offset.inHours == 8) return 'Asia/Makassar';
      if (offset.inHours == 9) return 'Asia/Jayapura';
    } catch (_) {}
    return 'Asia/Jakarta';
  }
}
