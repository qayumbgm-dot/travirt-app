import 'package:flutter/material.dart';

/// TraVirt Design Token — Color System
/// Mirrors the desktop Tailwind palette exactly for cross-platform consistency.
abstract final class AppColors {
  // ── Brand ─────────────────────────────────────────────────────────────────
  static const Color primary       = Color(0xFF007BFF);
  static const Color primaryFocus  = Color(0xFF0056B3);
  static const Color primaryMuted  = Color(0x33007BFF); // 20% opacity

  // ── Semantic ──────────────────────────────────────────────────────────────
  static const Color success       = Color(0xFF00C853);
  static const Color successMuted  = Color(0x2200C853);
  static const Color danger        = Color(0xFFFF3D57);
  static const Color dangerMuted   = Color(0x22FF3D57);
  static const Color warning       = Color(0xFFFFC107);
  static const Color warningMuted  = Color(0x22FFC107);
  static const Color info          = Color(0xFF17A2B8);

  // ── Surface / Background ──────────────────────────────────────────────────
  static const Color base          = Color(0xFF0D1117); // deepest bg
  static const Color surface       = Color(0xFF161B22); // card bg
  static const Color overlay       = Color(0xFF21262D); // input / hover
  static const Color overlayLight  = Color(0xFF30363D); // borders

  // ── Text ──────────────────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFFE6EDF3);
  static const Color textSecondary = Color(0xFF8B949E);
  static const Color muted         = Color(0xFF6E7681);

  // ── Glassmorphism ─────────────────────────────────────────────────────────
  static const Color glassFill     = Color(0x1AFFFFFF); // 10%
  static const Color glassBorder   = Color(0x33FFFFFF); // 20%
  static const Color glassBlur     = Color(0x0DFFFFFF); // 5%

  // ── Gradients ─────────────────────────────────────────────────────────────
  static const List<Color> heroGradient = [
    Color(0xFF0D1117),
    Color(0xFF0F1A2E),
    Color(0xFF0D1117),
  ];

  static const List<Color> primaryGradient = [
    Color(0xFF007BFF),
    Color(0xFF0056B3),
  ];

  static const List<Color> successGradient = [
    Color(0xFF00C853),
    Color(0xFF007B2F),
  ];

  static const List<Color> dangerGradient = [
    Color(0xFFFF3D57),
    Color(0xFFB3001B),
  ];

  static const List<Color> goldGradient = [
    Color(0xFFFFD700),
    Color(0xFFB8860B),
  ];

  // ── Chart Colors ──────────────────────────────────────────────────────────
  static const List<Color> chart = [
    Color(0xFF007BFF),
    Color(0xFF00C853),
    Color(0xFFFF3D57),
    Color(0xFFFFC107),
    Color(0xFF9C27B0),
    Color(0xFF00BCD4),
    Color(0xFFFF5722),
    Color(0xFF4CAF50),
  ];
}
