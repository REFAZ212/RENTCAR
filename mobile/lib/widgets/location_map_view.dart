import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../core/constants/app_colors.dart';
import '../../models/gps_location.dart';

class LocationMapView extends StatelessWidget {
  final GpsLocation gps;
  final double height;

  const LocationMapView({
    super.key,
    required this.gps,
    this.height = 220,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: FlutterMap(
        options: MapOptions(
          initialCenter: LatLng(gps.latitude, gps.longitude),
          initialZoom: 16,
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.all,
          ),
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.example.mobile',
          ),
          MarkerLayer(
            markers: [
              Marker(
                point: LatLng(gps.latitude, gps.longitude),
                width: 44,
                height: 44,
                child: const Icon(
                  Icons.location_on,
                  color: AppColors.error,
                  size: 40,
                  shadows: [Shadow(blurRadius: 8, color: Colors.black38)],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}