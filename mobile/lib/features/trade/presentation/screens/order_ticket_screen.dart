import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/travirt_button.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../app/di/injection_container.dart';
import '../../../../core/network/price_feed_service.dart';
import '../../../trade/domain/entities/order.dart';
import '../../../trade/domain/usecases/place_order_usecase.dart';
import '../../../market/domain/usecases/search_symbols_usecase.dart';
import '../widgets/order_confirm_sheet.dart';

class OrderTicketScreen extends ConsumerStatefulWidget {
  const OrderTicketScreen({super.key, required this.symbol});
  final String symbol;

  @override
  ConsumerState<OrderTicketScreen> createState() => _OrderTicketScreenState();
}

class _OrderTicketScreenState extends ConsumerState<OrderTicketScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  OrderSide _side     = OrderSide.buy;
  OrderType _type     = OrderType.market;
  ProductType _product = ProductType.intraday;
  final _qtyCtrl   = TextEditingController(text: '1');
  final _priceCtrl = TextEditingController();
  bool _loading    = false;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _qtyCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    final qty = int.tryParse(_qtyCtrl.text) ?? 0;
    final price = double.tryParse(_priceCtrl.text) ?? 0;

    if (qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid quantity')),
      );
      return;
    }

    final confirmed = await OrderConfirmSheet.show(
      context,
      symbol: widget.symbol, side: _side, type: _type,
      product: _product, quantity: qty, price: price,
    );
    if (!confirmed || !mounted) return;

    setState(() => _loading = true);
    final result = await sl<PlaceOrderUseCase>().execute(
      symbol: widget.symbol, exchange: 'NSE', token: widget.symbol,
      side: _side, type: _type, product: _product,
      quantity: qty, price: price,
    );
    if (!mounted) return;
    setState(() => _loading = false);
    result.when(
      success: (_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Order placed!'),
              backgroundColor: AppColors.success),
        );
        context.pop();
      },
      failure: (e) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: AppColors.danger),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: Text(widget.symbol),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: Spacing.lg),
            child: _LivePriceBadge(symbol: widget.symbol),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(Spacing.xl2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Buy / Sell tabs
              GlassCard(
                child: Padding(
                  padding: const EdgeInsets.all(Spacing.xs),
                  child: Row(children: [
                    Expanded(child: _SideBtn(
                      label: 'BUY', selected: _side == OrderSide.buy,
                      color: AppColors.success,
                      onTap: () => setState(() => _side = OrderSide.buy),
                    )),
                    Expanded(child: _SideBtn(
                      label: 'SELL', selected: _side == OrderSide.sell,
                      color: AppColors.danger,
                      onTap: () => setState(() => _side = OrderSide.sell),
                    )),
                  ]),
                ),
              ),
              const SizedBox(height: Spacing.xl),

              // Order type
              Row(
                children: OrderType.values.map((t) => Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: ChoiceChip(
                      label: Text(t.name.toUpperCase()),
                      selected: _type == t,
                      onSelected: (_) => setState(() => _type = t),
                    ),
                  ),
                )).toList(),
              ),
              const SizedBox(height: Spacing.xl),

              GlassCard(
                child: Padding(
                  padding: const EdgeInsets.all(Spacing.xl2),
                  child: Column(children: [
                    TextFormField(
                      controller: _qtyCtrl,
                      keyboardType: TextInputType.number,
                      style: AppTypography.bodyLg,
                      decoration: const InputDecoration(
                        labelText: 'Quantity',
                        prefixIcon: Icon(Icons.numbers),
                      ),
                    ),
                    const SizedBox(height: Spacing.sm),
                    _QtyStepper(
                      onDecrement: () {
                        final v = int.tryParse(_qtyCtrl.text) ?? 1;
                        if (v > 1) setState(() => _qtyCtrl.text = '${v - 1}');
                      },
                      onIncrement: () {
                        final v = int.tryParse(_qtyCtrl.text) ?? 0;
                        setState(() => _qtyCtrl.text = '${v + 1}');
                      },
                      onQuick: (n) => setState(() => _qtyCtrl.text = '$n'),
                    ),
                    if (_type != OrderType.market) ...[
                      const SizedBox(height: Spacing.lg),
                      TextFormField(
                        controller: _priceCtrl,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        style: AppTypography.bodyLg,
                        decoration: const InputDecoration(
                          labelText: 'Price (₹)',
                          prefixIcon: Icon(Icons.currency_rupee),
                        ),
                      ),
                    ],
                    const SizedBox(height: Spacing.xl),

                    // Product
                    Row(children: [
                      Text('Product:', style: AppTypography.labelMd),
                      const SizedBox(width: Spacing.md),
                      ...[ ProductType.intraday, ProductType.delivery ].map((p) =>
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(p == ProductType.intraday ? 'MIS' : 'CNC'),
                            selected: _product == p,
                            onSelected: (_) => setState(() => _product = p),
                          ),
                        ),
                      ),
                    ]),
                    const SizedBox(height: Spacing.xl2),

                    TravirtButton(
                      label: '${_side.name.toUpperCase()} ${widget.symbol}',
                      onPressed: _loading ? null : _placeOrder,
                      isLoading: _loading,
                      variant: _side == OrderSide.buy
                          ? ButtonVariant.filled
                          : ButtonVariant.danger,
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Shows live LTP in the AppBar — subscribes to WS feed for this symbol token.
class _LivePriceBadge extends ConsumerWidget {
  const _LivePriceBadge({required this.symbol});
  final String symbol;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tickAsync = ref.watch(ltpProvider(symbol));
    return tickAsync.when(
      data: (tick) {
        if (tick == null) return const _PricePlaceholder();
        final color = tick.change >= 0 ? AppColors.success : AppColors.danger;
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text('₹${tick.ltp.toStringAsFixed(2)}',
                style: AppTypography.numericMd.copyWith(color: color)),
            Text(
              '${tick.change >= 0 ? '+' : ''}${tick.changePct.toStringAsFixed(2)}%',
              style: AppTypography.numericSm.copyWith(color: color, fontSize: 10),
            ),
          ],
        );
      },
      loading: () => const _PricePlaceholder(),
      error: (_, __) => const _PricePlaceholder(),
    );
  }
}

class _PricePlaceholder extends StatelessWidget {
  const _PricePlaceholder();
  @override
  Widget build(BuildContext context) => Text(
    '— —',
    style: AppTypography.numericMd.copyWith(color: AppColors.muted),
  );
}

// ── Quantity stepper ─────────────────────────────────────────────────────────

class _QtyStepper extends StatelessWidget {
  const _QtyStepper({
    required this.onDecrement,
    required this.onIncrement,
    required this.onQuick,
  });
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;
  final void Function(int) onQuick;

  static const _quickValues = [1, 5, 10, 25, 50];

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      _StepBtn(icon: Icons.remove, onTap: onDecrement),
      const SizedBox(width: Spacing.sm),
      Expanded(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: _quickValues.map((n) => Padding(
              padding: const EdgeInsets.only(right: Spacing.xs),
              child: GestureDetector(
                onTap: () => onQuick(n),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: Spacing.md, vertical: Spacing.xs),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(Radius.full),
                    border: Border.all(color: AppColors.overlayLight),
                  ),
                  child: Text(
                    '$n',
                    style: AppTypography.labelSm.copyWith(
                        color: AppColors.textSecondary),
                  ),
                ),
              ),
            )).toList(),
          ),
        ),
      ),
      const SizedBox(width: Spacing.sm),
      _StepBtn(icon: Icons.add, onTap: onIncrement),
    ]);
  }
}

class _StepBtn extends StatelessWidget {
  const _StepBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 36, height: 36,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radius.sm),
        border: Border.all(color: AppColors.overlayLight),
      ),
      child: Icon(icon, size: 18, color: AppColors.textSecondary),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────

class _SideBtn extends StatelessWidget {
  const _SideBtn({
    required this.label, required this.selected,
    required this.color, required this.onTap,
  });
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(vertical: Spacing.md),
      decoration: BoxDecoration(
        color: selected ? color.withOpacity(0.2) : Colors.transparent,
        borderRadius: BorderRadius.circular(Radius.md),
        border: selected ? Border.all(color: color) : null,
      ),
      child: Text(label,
        style: AppTypography.labelLg.copyWith(
          color: selected ? color : AppColors.muted,
        ),
        textAlign: TextAlign.center,
      ),
    ),
  );
}
