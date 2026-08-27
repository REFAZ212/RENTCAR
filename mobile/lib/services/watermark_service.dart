import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:path/path.dart' as p;

import '../models/gps_location.dart';

/// Satu baris info di panel bawah (ikon + label + value).
class _InfoRow {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(this.icon, this.label, this.value);
}

class WatermarkService {
  WatermarkService._();

  static ui.Image? _cachedLogo;

  static Future<ui.Image?> _loadLogo() async {
    if (_cachedLogo != null) return _cachedLogo;
    try {
      final byteData =
          await rootBundle.load('assets/images/logoudinrentcar.png');
      final logo = await _decodeUiImage(byteData.buffer.asUint8List());
      _cachedLogo = logo;
      return logo;
    } catch (_) {
      return null;
    }
  }

  static Future<ui.Image> _decodeUiImage(Uint8List bytes) async {
    final codec = await ui.instantiateImageCodec(bytes);
    final frame = await codec.getNextFrame();
    return frame.image;
  }

  /// Menambahkan overlay informasi pada foto inspeksi:
  /// - Logo di pojok kanan atas (rasio asli dipertahankan)
  /// - Panel gelap di bawah foto berisi judul + baris info berikon
  ///   (Lokasi, Tanggal, Waktu, Petugas) dipisah garis tipis.
  /// Mengembalikan path file baru (watermark disimpan terpisah).
  static Future<String> applyPhotoWatermark({
    required String sourcePath,
    required String inspectionCode,
    required GpsLocation gps,
    // Nama petugas diambil dari akun user yang sedang login di aplikasi
    // (mis. AuthService.currentUser.name), bukan input manual/opsional.
    required String staffName,
  }) async {
    final sourceBytes = await File(sourcePath).readAsBytes();
    final photo = await _decodeUiImage(sourceBytes);
    final logo = await _loadLogo();

    final rows = <_InfoRow>[
      _InfoRow(Icons.location_on, 'Lokasi',
          gps.address ?? 'Tasikmalaya, Jawa Barat'),
      _InfoRow(Icons.calendar_today, 'Tanggal', gps.humanDate),
      _InfoRow(Icons.access_time, 'Waktu', gps.humanTime),
      _InfoRow(
        Icons.my_location,
        'Koordinat',
        'Lat: ${gps.latitude.toStringAsFixed(6)}  '
            'Long: ${gps.longitude.toStringAsFixed(6)}',
      ),
      _InfoRow(Icons.gps_fixed, 'Akurasi', gps.accuracyLabel),
      _InfoRow(Icons.confirmation_number, 'ID Inspeksi', inspectionCode),
      _InfoRow(Icons.person, 'Petugas', staffName),
    ];

    final outputImage = await _compose(
      photo: photo,
      logo: logo,
      rows: rows,
    );

    // Konversi hasil canvas -> bytes RGBA -> re-encode JPEG via package:image
    final byteData =
        await outputImage.toByteData(format: ui.ImageByteFormat.rawRgba);
    final rgba = byteData!.buffer.asUint8List();

    final finalImage = img.Image.fromBytes(
      width: outputImage.width,
      height: outputImage.height,
      bytes: rgba.buffer,
      numChannels: 4,
      order: img.ChannelOrder.rgba,
    );

    final jpgBytes = Uint8List.fromList(
      img.encodeJpg(finalImage, quality: 92),
    );

    final dir = p.dirname(sourcePath);
    final base = p.basenameWithoutExtension(sourcePath);
    final outputPath = p.join(dir, '${base}_watermarked.jpg');
    await File(outputPath).writeAsBytes(jpgBytes, flush: true);

    photo.dispose();
    outputImage.dispose();

    return outputPath;
  }

  static Future<ui.Image> _compose({
    required ui.Image photo,
    required ui.Image? logo,
    required List<_InfoRow> rows,
  }) async {
    final width = photo.width.toDouble();
    final height = photo.height.toDouble();

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, Rect.fromLTWH(0, 0, width, height));

    // 1. Gambar foto asli sebagai dasar
    canvas.drawImage(photo, Offset.zero, Paint());

    // --- Ukuran dasar, diskalakan relatif terhadap lebar foto ---
    final hPad = width * 0.06;
    final titleSize = (width * 0.028).clamp(20.0, 40.0);
    final labelSize = (width * 0.019).clamp(13.0, 24.0);
    final valueSize = (width * 0.0225).clamp(15.0, 28.0);
    final rowIconSize = (width * 0.026).clamp(18.0, 32.0);
    final headerIconSize = (width * 0.03).clamp(22.0, 38.0);
    final rowGap = height * 0.014; // jarak vertikal antar elemen dalam 1 row
    final dividerGapTop = height * 0.012;
    final dividerGapBottom = height * 0.012;

    // --- Hitung tinggi tiap baris info (label + value + padding) dulu,
    //     supaya tinggi panel bisa dihitung total ---
    final headerBlockHeight =
        headerIconSize + dividerGapTop + dividerGapBottom + 4;

    double rowsHeight = 0;
    final rowTextPainters = <MapEntry<TextPainter, TextPainter>>[];
    final maxTextWidth = width - hPad - (hPad + rowIconSize + width * 0.02);

    for (final row in rows) {
      final labelTp = _buildParagraph(
        row.label,
        fontSize: labelSize,
        color: Colors.white70,
        weight: FontWeight.w400,
        maxWidth: maxTextWidth,
      );
      final valueTp = _buildParagraph(
        row.value,
        fontSize: valueSize,
        color: Colors.white,
        weight: FontWeight.w600,
        maxWidth: maxTextWidth,
      );
      rowTextPainters.add(MapEntry(labelTp, valueTp));
      final rowContentHeight = labelTp.height + valueTp.height + 4;
      rowsHeight += rowContentHeight + dividerGapBottom;
    }

    final panelHeight =
        (headerBlockHeight + rowsHeight + height * 0.03).clamp(
      height * 0.30,
      height * 0.68,
    );
    final panelTop = height - panelHeight;

    // 2. Gradasi gelap solid di bawah foto (transisi cepat lalu pekat)
    final gradientPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset(0, panelTop),
        Offset(0, height),
        [
          Colors.black.withOpacity(0.0),
          Colors.black.withOpacity(0.55),
          Colors.black.withOpacity(0.90),
          Colors.black.withOpacity(0.92),
        ],
        [0.0, 0.18, 0.55, 1.0],
      );
    canvas.drawRect(Rect.fromLTWH(0, panelTop, width, panelHeight),
        gradientPaint);

    // 3. Logo di pojok kanan atas, rasio asli dipertahankan
    if (logo != null) {
      final logoTargetHeight = (height * 0.075).clamp(50.0, 130.0);
      final scale = logoTargetHeight / logo.height;
      final logoTargetWidth = logo.width * scale;
      final logoRight = width - width * 0.04;
      final logoLeft = logoRight - logoTargetWidth;
      final logoTop = height * 0.045;

      final src =
          Rect.fromLTWH(0, 0, logo.width.toDouble(), logo.height.toDouble());
      final dst = Rect.fromLTWH(
          logoLeft, logoTop, logoTargetWidth, logoTargetHeight);
      canvas.drawImageRect(logo, src, dst, Paint());
    }

    // 4. Judul dengan ikon kamera
    double cursorY = panelTop + height * 0.02;
    final contentLeft = hPad;
    final contentRight = width - hPad;

    _drawIcon(canvas, Icons.camera_alt, Offset(contentLeft, cursorY),
        headerIconSize, Colors.white);
    final titleTp = _buildParagraph(
      'UDIN RENTCAR INSPEKSI',
      fontSize: titleSize,
      color: Colors.white,
      weight: FontWeight.w800,
      maxWidth: contentRight - (contentLeft + headerIconSize + width * 0.02),
    );
    titleTp.paint(
      canvas,
      Offset(
        contentLeft + headerIconSize + width * 0.02,
        cursorY + (headerIconSize - titleTp.height) / 2,
      ),
    );

    cursorY += headerIconSize + dividerGapTop;
    _drawDivider(canvas, contentLeft, contentRight, cursorY);
    cursorY += dividerGapBottom;

    // 5. Baris info: ikon + (label di atas, value di bawah)
    final textLeft = contentLeft + rowIconSize + width * 0.02;
    for (var i = 0; i < rows.length; i++) {
      final row = rows[i];
      final labelTp = rowTextPainters[i].key;
      final valueTp = rowTextPainters[i].value;
      final blockHeight = labelTp.height + valueTp.height + 4;

      // Ikon disejajarkan vertikal di tengah blok label+value
      _drawIcon(
        canvas,
        row.icon,
        Offset(contentLeft, cursorY + (blockHeight - rowIconSize) / 2),
        rowIconSize,
        Colors.white,
      );

      labelTp.paint(canvas, Offset(textLeft, cursorY));
      valueTp.paint(canvas, Offset(textLeft, cursorY + labelTp.height + 4));

      cursorY += blockHeight + dividerGapBottom;
      if (i != rows.length - 1 || true) {
        // Termasuk baris terakhir, mengikuti referensi (garis di bawah Petugas)
        _drawDivider(canvas, contentLeft, contentRight, cursorY - rowGap * 0.2);
      }
    }

    final picture = recorder.endRecording();
    return picture.toImage(photo.width, photo.height);
  }

  static TextPainter _buildParagraph(
    String text, {
    required double fontSize,
    required Color color,
    required FontWeight weight,
    required double maxWidth,
  }) {
    final tp = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontSize: fontSize,
          color: color,
          fontWeight: weight,
          height: 1.15,
        ),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 2,
      ellipsis: '…',
    );
    tp.layout(maxWidth: maxWidth);
    return tp;
  }

  static void _drawIcon(
    Canvas canvas,
    IconData icon,
    Offset topLeft,
    double size,
    Color color,
  ) {
    final tp = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(icon.codePoint),
        style: TextStyle(
          fontSize: size,
          fontFamily: icon.fontFamily,
          package: icon.fontPackage,
          color: color,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    tp.layout();
    tp.paint(canvas, topLeft);
  }

  static void _drawDivider(
    Canvas canvas,
    double left,
    double right,
    double y,
  ) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.35)
      ..strokeWidth = 1.2;
    canvas.drawLine(Offset(left, y), Offset(right, y), paint);
  }
}