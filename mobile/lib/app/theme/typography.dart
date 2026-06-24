import 'package:flutter/material.dart';
import 'colors.dart';

abstract final class AppTypography {
  // ── Display (Orbitron — brand headings) ───────────────────────────────────
  static const TextStyle displayLg = TextStyle(
    fontFamily: 'Orbitron',
    fontSize: 32,
    fontWeight: FontWeight.w800,
    color: AppColors.textPrimary,
    letterSpacing: 1.5,
    height: 1.2,
  );

  static const TextStyle displayMd = TextStyle(
    fontFamily: 'Orbitron',
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: 1.2,
    height: 1.25,
  );

  static const TextStyle displaySm = TextStyle(
    fontFamily: 'Orbitron',
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    letterSpacing: 0.8,
    height: 1.3,
  );

  // ── Heading (Rajdhani — section titles) ───────────────────────────────────
  static const TextStyle headingXl = TextStyle(
    fontFamily: 'Rajdhani',
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: 0.3,
    height: 1.3,
  );

  static const TextStyle headingLg = TextStyle(
    fontFamily: 'Rajdhani',
    fontSize: 22,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    letterSpacing: 0.2,
    height: 1.35,
  );

  static const TextStyle headingMd = TextStyle(
    fontFamily: 'Rajdhani',
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    height: 1.4,
  );

  static const TextStyle headingSm = TextStyle(
    fontFamily: 'Rajdhani',
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    height: 1.4,
  );

  // ── Body (Exo 2 — content) ────────────────────────────────────────────────
  static const TextStyle bodyLg = TextStyle(
    fontFamily: 'Exo2',
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
    height: 1.6,
  );

  static const TextStyle bodyMd = TextStyle(
    fontFamily: 'Exo2',
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
    height: 1.5,
  );

  static const TextStyle bodySm = TextStyle(
    fontFamily: 'Exo2',
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.muted,
    height: 1.5,
  );

  // ── Label / UI ────────────────────────────────────────────────────────────
  static const TextStyle labelLg = TextStyle(
    fontFamily: 'Exo2',
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    letterSpacing: 0.5,
  );

  static const TextStyle labelMd = TextStyle(
    fontFamily: 'Exo2',
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: AppColors.textSecondary,
    letterSpacing: 0.3,
  );

  static const TextStyle labelSm = TextStyle(
    fontFamily: 'Exo2',
    fontSize: 10,
    fontWeight: FontWeight.w500,
    color: AppColors.muted,
    letterSpacing: 0.5,
    height: 1.4,
  );

  // ── Numeric / Financial ───────────────────────────────────────────────────
  static const TextStyle numericXl = TextStyle(
    fontFamily: 'Orbitron',
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: 0.5,
    fontFeatures: [FontFeature.tabularFigures()],
  );

  static const TextStyle numericLg = TextStyle(
    fontFamily: 'Orbitron',
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    letterSpacing: 0.3,
    fontFeatures: [FontFeature.tabularFigures()],
  );

  static const TextStyle numericMd = TextStyle(
    fontFamily: 'Rajdhani',
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    fontFeatures: [FontFeature.tabularFigures()],
  );

  static const TextStyle numericSm = TextStyle(
    fontFamily: 'Rajdhani',
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: AppColors.textSecondary,
    fontFeatures: [FontFeature.tabularFigures()],
  );
}
