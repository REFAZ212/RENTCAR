import 'dart:io';
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:path/path.dart' as p;

import '../models/gps_location.dart';

class WatermarkService {
  WatermarkService._();

  /// Menambahkan overlay informasi pada foto inspeksi.
  /// Mengembalikan path file baru (watermark disimpan terpisah).
  static Future<String> applyPhotoWatermark({
    required String sourcePath,
    required String inspectionCode,
    required GpsLocation gps,
  }) async {
    final original = img.decodeImage(await File(sourcePath).readAsBytes());
    if (original == null) return sourcePath;

    final watermarked = _drawOverlay(
      original,
      inspectionCode: inspectionCode,
      gps: gps,
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
  }) {
    final font = img.arial24;
    final smallFont = img.arial24;

    // Ukuran semi-transparan background overlay
    const overlayHeight = 118;
    const padLeft = 14;

    final line1 = 'UDIN RENTCAR  •  INSPEKSI KENDARAAN';
    final line2 = '${gps.humanDate}  ${gps.humanTime}';
    final line3 = '📍 ${gps.address ?? 'Tasikmalaya, Jawa Barat'}';
    final line4 = 'Lat: ${gps.latitude.toStringAsFixed(6)}  Long: ${gps.longitude.toStringAsFixed(6)}';
    final line5 = 'Accuracy: ${gps.accuracyLabel}  •  ID: $inspectionCode';

    img.Image output = img.copyResize(
      image,
      width: image.width,
      height: image.height,
      interpolation: img.Interpolation.linear,
    );

    final yStart = image.height - overlayHeight;

    // Background semi-transparan
    for (int y = yStart; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final pixel = output.getPixel(x, y);
        final r = (pixel.r * 0.15).round();
        final g = (pixel.g * 0.15).round();
        final b = (pixel.b * 0.15).round();
        output.setPixelRgb(x, y, r, g, b);
      }
    }

    // Garis aksen
    final accentColor = img.ColorRgb8(255, 82, 82);
    for (int x = 0; x < image.width; x++) {
      output.setPixelRgb(x, yStart, accentColor.r, accentColor.g, accentColor.b);
      output.setPixelRgb(x, yStart + 1, accentColor.r, accentColor.g, accentColor.b);
    }

    img.drawString(
      output,
      line1,
      font: font,
      x: padLeft,
      y: yStart + 10,
      color: img.ColorRgb8(255, 255, 255),
    );
    img.drawString(
      output,
      line2,
      font: smallFont,
      x: padLeft,
      y: yStart + 38,
      color: img.ColorRgb8(210, 220, 235),
    );
    img.drawString(
      output,
      line3,
      font: smallFont,
      x: padLeft,
      y: yStart + 62,
      color: img.ColorRgb8(210, 220, 235),
    );
    img.drawString(
      output,
      line4,
      font: smallFont,
      x: padLeft,
      y: yStart + 86,
      color: img.ColorRgb8(210, 220, 235),
    );
    img.drawString(
      output,
      line5,
      font: smallFont,
      x: padLeft,
      y: yStart + 110,
      color: img.ColorRgb8(180, 200, 230),
    );

    return output;
  }
}
