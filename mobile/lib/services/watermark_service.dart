import 'dart:io';

import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:path/path.dart' as p;

import '../models/gps_location.dart';

class WatermarkService {
  WatermarkService._();

  static img.Image? _cachedLogo;

  static Future<img.Image?> _loadLogo() async {
    if (_cachedLogo != null) return _cachedLogo;
    try {
      final byteData =
          await rootBundle.load('assets/images/udinrentcaricon.png');
      final bytes = byteData.buffer.asUint8List();
      final logo = img.decodeImage(bytes);
      _cachedLogo = logo;
      return logo;
    } catch (_) {
      return null;
    }
  }

  /// Menambahkan overlay informasi pada foto inspeksi.
  /// Mengembalikan path file baru (watermark disimpan terpisah).
  static Future<String> applyPhotoWatermark({
    required String sourcePath,
    required String inspectionCode,
    required GpsLocation gps,
    String? staffName,
  }) async {
    final original = img.decodeImage(await File(sourcePath).readAsBytes());
    if (original == null) return sourcePath;

    final logo = await _loadLogo();
    final watermarked = _drawOverlay(
      original,
      inspectionCode: inspectionCode,
      gps: gps,
      staffName: staffName,
      logo: logo,
    );

    final dir = p.dirname(sourcePath);
    final base = p.basenameWithoutExtension(sourcePath);
    final outputPath = p.join(dir, '${base}_watermarked.jpg');

    final bytes = Uint8List.fromList(
      img.encodeJpg(watermarked, quality: 92),
    );
    await File(outputPath).writeAsBytes(bytes, flush: true);

    return outputPath;
  }

  static img.Image _drawOverlay(
    img.Image image, {
    required String inspectionCode,
    required GpsLocation gps,
    String? staffName,
    img.Image? logo,
  }) {
    // Use larger fonts for high-res images
    final font = image.width > 2000 ? img.arial48 : img.arial24;
    final smallFont = image.width > 2000 ? img.arial24 : img.arial14;

    // Ukuran semi-transparan background overlay - scale with image
    final overlayHeight = (image.height * 0.18).clamp(140.0, 300.0).round();
    final padLeft = (image.width * 0.02).clamp(14.0, 40.0).round();
    final logoSize = (image.height * 0.06).clamp(40.0, 100.0).round();

    final line1 = 'UDIN RENTCAR  •  INSPEKSI KENDARAAN';
    final line2 = '${gps.humanDate}  ${gps.humanTime}';
    final line3 = '📍 ${gps.address ?? 'Tasikmalaya, Jawa Barat'}';
    final line4 =
        'Lat: ${gps.latitude.toStringAsFixed(6)}  Long: ${gps.longitude.toStringAsFixed(6)}';
    final line5 = 'Accuracy: ${gps.accuracyLabel}  •  ID: $inspectionCode';
    final line6 = staffName != null ? 'Petugas: $staffName' : '';

    img.Image output = img.copyResize(
      image,
      width: image.width,
      height: image.height,
      interpolation: img.Interpolation.linear,
    );

    final yStart = image.height - overlayHeight;

    // Background semi-transparan (darker for better contrast)
    for (int y = yStart; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final pixel = output.getPixel(x, y);
        final r = (pixel.r * 0.1).round();
        final g = (pixel.g * 0.1).round();
        final b = (pixel.b * 0.1).round();
        output.setPixelRgb(x, y, r, g, b);
      }
    }

    // Garis aksen (thicker)
    final accentColor = img.ColorRgb8(255, 82, 82);
    for (int x = 0; x < image.width; x++) {
      for (int dy = 0; dy < 3; dy++) {
        output.setPixelRgb(
            x, yStart + dy, accentColor.r, accentColor.g, accentColor.b);
      }
    }

    // Draw logo if available (left side of overlay area)
    if (logo != null) {
      final logoResized =
          img.copyResize(logo, width: logoSize, height: logoSize);
      img.compositeImage(
        output,
        logoResized,
        dstX: padLeft,
        dstY: yStart + (overlayHeight - logoSize) ~/ 2,
      );
    }

    // Adjust text position to make room for logo
    final textStartX = (logo != null ? padLeft + logoSize + 16 : padLeft).round();
    final lineSpacing = image.width > 2000 ? 56 : 28;

    // Draw strings with appropriate fonts
    img.drawString(
      output,
      line1,
      font: font,
      x: textStartX,
      y: yStart + 15,
      color: img.ColorRgb8(255, 255, 255),
    );
    img.drawString(
      output,
      line2,
      font: smallFont,
      x: textStartX,
      y: yStart + 15 + lineSpacing,
      color: img.ColorRgb8(220, 230, 245),
    );
    img.drawString(
      output,
      line3,
      font: smallFont,
      x: textStartX,
      y: yStart + 15 + lineSpacing * 2,
      color: img.ColorRgb8(220, 230, 245),
    );
    img.drawString(
      output,
      line4,
      font: smallFont,
      x: textStartX,
      y: yStart + 15 + lineSpacing * 3,
      color: img.ColorRgb8(220, 230, 245),
    );
    img.drawString(
      output,
      line5,
      font: smallFont,
      x: textStartX,
      y: yStart + 15 + lineSpacing * 4,
      color: img.ColorRgb8(200, 220, 240),
    );
    if (line6.isNotEmpty) {
      img.drawString(
        output,
        line6,
        font: smallFont,
        x: textStartX,
        y: yStart + 15 + lineSpacing * 5,
        color: img.ColorRgb8(200, 230, 210),
      );
    }

    return output;
  }
}
