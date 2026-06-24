import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/travirt_button.dart';
import '../../domain/entities/order.dart';

class OrderConfirmSheet extends StatelessWidget {
  const OrderConfirmSheet({
    super.key,
    required this.symbol,
    required this.side,
    required this.type,
    required this.product,
    required this.quantity,
    required this.price,
    required this.onConfirm,
  });

  final String symbol;
  final OrderSide side;
  final OrderType type;
  final ProductType product;
  final int quantity;
  final double price;
  final VoidCallback onConfirm;

  static Future<bool> show(
    BuildContext context, {
    required String symbol,
    required OrderSide side,
    required OrderType type,
    required ProductType product,
    required int quantity,
    required double price,
  }) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => OrderConfirmSheet(
        symbol: symbol, side: side, type: type, product: product,
        quantity: quantity, price: price,
        onConfirm: () => Navigator.pop(context, true),
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(symbol: '₹', decimalDigits: 2, locale: 'en_IN');
    final sideColor = side == OrderSide.buy ? AppColors.success : AppColors.danger;
    final isMarket = type == OrderType.market;
    final estimatedValue = isMarket ? null : price * quantity;

    return Padding(
      padding: EdgeInsets.only(
        left: Spacing.xl2, right: Spacing.xl2, top: Spacing.xl,
        bottom: Spacing.xl2 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        // Handle
        Container(
          width: 40, height: 4,
          margin: const EdgeInsets.only(bottom: Spacing.xl),
          decoration: BoxDecoration(
            color: AppColors.overlayLight,
            borderRadius: BorderRadius.circular(2),
          ),
        ),

        // Header
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: Spacing.md, vertical: Spacing.sm),
            decoration: BoxDecoration(
              color: sideColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(Spacing.sm),
              border: Border.all(color: sideColor.withOpacity(0.4)),
            ),
            child: Text(
              side.name.toUpperCase(),
              style: AppTypography.labelLg.copyWith(color: sideColor),
            ),
          ),
          const SizedBox(width: Spacing.md),
          Text(symbol, style: AppTypography.headingXl),
        ]),
        const SizedBox(height: Spacing.xl2),

        // Order details grid
        GlassCard(
          child: Padding(
            padding: const EdgeInsets.all(Spacing.lg),
            child: Column(children: [
              _Row('Order Type',  type.name.toUpperCase()),
              _Divider(),
              _Row('Product',     product == ProductType.intraday ? 'MIS (Intraday)' : 'CNC (Delivery)'),
              _Divider(),
              _Row('Quantity',    quantity.toString()),
              _Divider(),
              _Row(
                isMarket ? 'Price' : 'Limit Price',
                isMarket ? 'Market Price' : fmt.format(price),
                valueColor: isMarket ? AppColors.muted : null,
              ),
              if (estimatedValue != null) ...[
                _Divider(),
                _Row('Est. Value', fmt.format(estimatedValue),
                    valueColor: sideColor),
              ],
            ]),
          ),
        ),

        const SizedBox(height: Spacing.lg),

        // Risk notice
        Row(children: [
          const Icon(Icons.info_outline, size: 14, color: AppColors.muted),
          const SizedBox(width: Spacing.xs),
          Expanded(
            child: Text(
              'Virtual trade — no real money involved.',
              style: AppTypography.bodySm,
            ),
          ),
        ]),

        const SizedBox(height: Spacing.xl),

        // Buttons
        Row(children: [
          Expanded(
            child: TravirtButton(
              label: 'Cancel',
              variant: ButtonVariant.ghost,
              onPressed: () => Navigator.pop(context, false),
            ),
          ),
          const SizedBox(width: Spacing.md),
          Expanded(
            flex: 2,
            child: TravirtButton(
              label: '${side.name.toUpperCase()} ${symbol}',
              variant: side == OrderSide.buy
                  ? ButtonVariant.filled
                  : ButtonVariant.danger,
              onPressed: onConfirm,
            ),
          ),
        ]),
      ]),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.valueColor});
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: Spacing.sm),
    child: Row(children: [
      Text(label, style: AppTypography.bodyMd),
      const Spacer(),
      Text(value,
          style: AppTypography.numericMd
              .copyWith(color: valueColor ?? AppColors.textPrimary)),
    ]),
  );
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
      const Divider(color: AppColors.overlayLight, height: 1);
}
