import 'package:flutter/material.dart';

/// Design tokens shared across the mobile app.
/// Mirrors the web tokens (colors, spacing, radius).
class AppColors {
  // Brand colors
  static const primary = Color(0xFFBC6266);
  static const secondary = Color(0xFFCE8490);
  static const accent = Color(0xFFD27054);

  // Base / text
  static const base = Color(0xFF33312E);
  static const baseMuted = Color(0xFF6F6C67);

  // Neutral backgrounds
  static const neutral = Color(0xFFD3C4B3);
  static const neutralSoft = Color(0xFFE7B9AB);

  // Extra neutrals / grayscale
  static const neutral0 = Color(0xFFFFFFFF);
  static const neutral50 = Color(0xFFFAFAFA);
  static const neutral100 = Color(0xFFF5F5F5);
  static const neutral200 = Color(0xFFE5E5E5);
  static const neutral400 = Color(0xFFA3A3A3);
  static const neutral600 = Color(0xFF525252);
  static const neutral900 = Color(0xFF171717);
}

class AppSpacing {
  static const xs = 4.0;
  static const s = 8.0;
  static const m = 12.0;
  static const l = 16.0;
  static const xl = 24.0;
  static const xxl = 32.0;
}

class AppRadius {
  static const s = 6.0;
  static const m = 10.0;
  static const l = 16.0;
  static const pill = 999.0;
}
