import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../app/theme/colors.dart';
import '../../app/theme/spacing.dart';

class ShimmerBox extends StatelessWidget {
  const ShimmerBox({super.key, this.width, this.height, this.borderRadius});
  final double? width;
  final double? height;
  final double? borderRadius;

  @override
  Widget build(BuildContext context) => Shimmer.fromColors(
        baseColor: AppColors.surface,
        highlightColor: AppColors.overlay,
        child: Container(
          width: width,
          height: height ?? 16,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(borderRadius ?? Radius.sm),
          ),
        ),
      );
}

// Pre-built skeleton card that matches GlassCard height/shape
class ShimmerCard extends StatelessWidget {
  const ShimmerCard({super.key, this.height = 72});
  final double height;

  @override
  Widget build(BuildContext context) => Shimmer.fromColors(
        baseColor: AppColors.surface,
        highlightColor: AppColors.overlay,
        child: Container(
          height: height,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(Radius.md),
          ),
        ),
      );
}

// Skeleton list — N shimmer cards stacked vertically
class ShimmerList extends StatelessWidget {
  const ShimmerList({super.key, this.count = 6, this.cardHeight = 72});
  final int count;
  final double cardHeight;

  @override
  Widget build(BuildContext context) => ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        shrinkWrap: true,
        padding: const EdgeInsets.all(Spacing.xl2),
        itemCount: count,
        separatorBuilder: (_, __) => const SizedBox(height: Spacing.md),
        itemBuilder: (_, __) => ShimmerCard(height: cardHeight),
      );
}
