import 'package:flutter/material.dart';
import '../../app/theme/colors.dart';
import '../../app/theme/typography.dart';
import '../../app/theme/spacing.dart';

enum ButtonVariant { filled, outline, ghost, danger }

class TravirtButton extends StatelessWidget {
  const TravirtButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.variant = ButtonVariant.filled,
    this.expand = true,
    this.small = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final ButtonVariant variant;
  final bool expand;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || isLoading;
    final height = small ? 40.0 : 52.0;
    final style = small ? AppTypography.labelMd : AppTypography.labelLg;

    Widget content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading)
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: _fgColor,
            ),
          )
        else if (icon != null)
          Icon(icon, size: small ? 16 : 18, color: _fgColor),
        if (icon != null || isLoading) const SizedBox(width: Spacing.sm),
        Text(label, style: style.copyWith(color: _fgColor)),
      ],
    );

    return AnimatedOpacity(
      opacity: disabled ? 0.55 : 1.0,
      duration: const Duration(milliseconds: 150),
      child: SizedBox(
        height: height,
        width: expand ? double.infinity : null,
        child: _buildButton(content, disabled),
      ),
    );
  }

  Color get _fgColor {
    if (variant == ButtonVariant.filled) return Colors.white;
    if (variant == ButtonVariant.danger) return Colors.white;
    return AppColors.primary;
  }

  Widget _buildButton(Widget content, bool disabled) {
    switch (variant) {
      case ButtonVariant.filled:
        return ElevatedButton(
          onPressed: disabled ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(Radius.md),
            ),
          ),
          child: content,
        );
      case ButtonVariant.danger:
        return ElevatedButton(
          onPressed: disabled ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.danger,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(Radius.md),
            ),
          ),
          child: content,
        );
      case ButtonVariant.outline:
        return OutlinedButton(
          onPressed: disabled ? null : onPressed,
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.primary),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(Radius.md),
            ),
          ),
          child: content,
        );
      case ButtonVariant.ghost:
        return TextButton(
          onPressed: disabled ? null : onPressed,
          child: content,
        );
    }
  }
}
