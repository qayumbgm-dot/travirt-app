import 'package:flutter/material.dart';
import '../../../app/theme/colors.dart';
import '../../../app/theme/typography.dart';
import '../../../app/theme/spacing.dart';
import 'travirt_button.dart';

enum EmptyStateType { empty, error, offline, noResults, comingSoon }

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.type,
    this.title,
    this.message,
    this.actionLabel,
    this.onAction,
  });

  final EmptyStateType type;
  final String? title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final config = _config[type]!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Spacing.xl3),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(config.icon, size: 64, color: config.color),
            const SizedBox(height: Spacing.lg),
            Text(
              title ?? config.title,
              style: AppTypography.headingMd,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Spacing.sm),
            Text(
              message ?? config.message,
              style: AppTypography.bodyMd,
              textAlign: TextAlign.center,
            ),
            if (onAction != null) ...[
              const SizedBox(height: Spacing.xl2),
              TravirtButton(
                label: actionLabel ?? config.actionLabel,
                variant: ButtonVariant.outline,
                onPressed: onAction,
              ),
            ],
          ],
        ),
      ),
    );
  }

  static const _config = {
    EmptyStateType.empty: _Cfg(
      icon: Icons.inbox_outlined,
      color: AppColors.muted,
      title: 'Nothing here yet',
      message: 'Your data will appear here once available.',
      actionLabel: 'Refresh',
    ),
    EmptyStateType.error: _Cfg(
      icon: Icons.error_outline,
      color: AppColors.danger,
      title: 'Something went wrong',
      message: 'An error occurred. Please try again.',
      actionLabel: 'Retry',
    ),
    EmptyStateType.offline: _Cfg(
      icon: Icons.wifi_off,
      color: AppColors.muted,
      title: 'No connection',
      message: 'Check your internet connection and try again.',
      actionLabel: 'Retry',
    ),
    EmptyStateType.noResults: _Cfg(
      icon: Icons.search_off,
      color: AppColors.muted,
      title: 'No results',
      message: 'Try a different search term.',
      actionLabel: 'Clear',
    ),
    EmptyStateType.comingSoon: _Cfg(
      icon: Icons.construction_outlined,
      color: AppColors.warning,
      title: 'Coming soon',
      message: 'This feature is under development.',
      actionLabel: 'Go back',
    ),
  };
}

class _Cfg {
  const _Cfg({
    required this.icon,
    required this.color,
    required this.title,
    required this.message,
    required this.actionLabel,
  });
  final IconData icon;
  final Color color;
  final String title;
  final String message;
  final String actionLabel;
}
