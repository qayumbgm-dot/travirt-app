import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/theme/colors.dart';
import '../../app/theme/typography.dart';
import '../../app/theme/spacing.dart';
import '../../core/connectivity/connectivity_provider.dart';

class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offline = ref.watch(isOfflineProvider);

    return Column(
      children: [
        AnimatedSize(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          child: offline
              ? Container(
                  width: double.infinity,
                  color: AppColors.danger,
                  padding: const EdgeInsets.symmetric(
                      vertical: Spacing.sm, horizontal: Spacing.lg),
                  child: SafeArea(
                    bottom: false,
                    child: Row(children: [
                      const Icon(Icons.wifi_off_rounded,
                          color: Colors.white, size: 16),
                      const SizedBox(width: Spacing.sm),
                      Text(
                        'No internet connection',
                        style: AppTypography.labelMd
                            .copyWith(color: Colors.white),
                      ),
                    ]),
                  ),
                )
              : const SizedBox.shrink(),
        ),
        Expanded(child: child),
      ],
    );
  }
}
