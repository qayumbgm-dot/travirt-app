import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/shimmer_box.dart';
import '../../../../app/di/injection_container.dart';
import '../../../../core/export/csv_export_service.dart';
import '../../../trade/domain/entities/order.dart';
import '../../../trade/domain/usecases/get_orders_usecase.dart';
import '../../../trade/domain/usecases/get_positions_usecase.dart';

final _ordersProvider = FutureProvider<List<Order>>((ref) async {
  final result = await sl<GetOrdersUseCase>().execute();
  return result.when(success: (o) => o, failure: (e) => throw e);
});

final _positionsProvider = FutureProvider<List<Position>>((ref) async {
  final result = await sl<GetPositionsUseCase>().execute();
  return result.when(success: (p) => p, failure: (e) => throw e);
});

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() { _tabCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd MMM, HH:mm');
    final currFmt = NumberFormat.currency(symbol: '₹', decimalDigits: 2);

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: const Text('Orders & Positions'),
        actions: [
          ref.watch(_ordersProvider).whenOrNull(
            data: (orders) => orders.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.download_outlined),
                    tooltip: 'Export CSV',
                    onPressed: () => _exportCsv(orders),
                  ),
          ) ?? const SizedBox.shrink(),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [Tab(text: 'Orders'), Tab(text: 'Positions')],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          // Orders
          ref.watch(_ordersProvider).when(
            data: (orders) => orders.isEmpty
                ? _empty('No orders yet')
                : ListView.separated(
                    padding: const EdgeInsets.all(Spacing.xl2),
                    itemCount: orders.length,
                    separatorBuilder: (_, __) => const SizedBox(height: Spacing.md),
                    itemBuilder: (_, i) {
                      final o = orders[i];
                      final sideColor = o.side == OrderSide.buy
                          ? AppColors.success : AppColors.danger;
                      return GlassCard(
                        child: Padding(
                          padding: const EdgeInsets.all(Spacing.lg),
                          child: Row(children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: Spacing.sm, vertical: Spacing.xs),
                              decoration: BoxDecoration(
                                color: sideColor.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(Radius.xs),
                              ),
                              child: Text(o.side.name.toUpperCase(),
                                  style: AppTypography.labelSm
                                      .copyWith(color: sideColor)),
                            ),
                            const SizedBox(width: Spacing.md),
                            Expanded(child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(o.symbol, style: AppTypography.headingSm),
                                Text('${o.quantity} × ${currFmt.format(o.price)}',
                                    style: AppTypography.bodySm),
                              ],
                            )),
                            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                              _StatusChip(status: o.status),
                              const SizedBox(height: 4),
                              Text(fmt.format(o.createdAt),
                                  style: AppTypography.bodySm),
                            ]),
                          ]),
                        ),
                      );
                    },
                  ),
            loading: () => const ShimmerList(),
            error: (e, _) => _empty(e.toString()),
          ),

          // Positions
          ref.watch(_positionsProvider).when(
            data: (positions) => positions.isEmpty
                ? _empty('No open positions')
                : ListView.separated(
                    padding: const EdgeInsets.all(Spacing.xl2),
                    itemCount: positions.length,
                    separatorBuilder: (_, __) => const SizedBox(height: Spacing.md),
                    itemBuilder: (_, i) {
                      final p = positions[i];
                      final color = p.isProfit ? AppColors.success : AppColors.danger;
                      return GlassCard(
                        child: Padding(
                          padding: const EdgeInsets.all(Spacing.lg),
                          child: Row(children: [
                            Expanded(child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(p.symbol, style: AppTypography.headingSm),
                                Text('Qty: ${p.quantity} | Avg: ${currFmt.format(p.avgPrice)}',
                                    style: AppTypography.bodySm),
                              ],
                            )),
                            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                              Text(currFmt.format(p.ltp), style: AppTypography.numericMd),
                              Text('${p.isProfit ? '+' : ''}${currFmt.format(p.pnl)}',
                                  style: AppTypography.numericSm.copyWith(color: color)),
                            ]),
                          ]),
                        ),
                      );
                    },
                  ),
            loading: () => const ShimmerList(),
            error: (e, _) => _empty(e.toString()),
          ),
        ],
      ),
    );
  }

  Future<void> _exportCsv(List<Order> orders) async {
    try {
      await ref.read(csvExportServiceProvider).exportOrders(orders);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Export failed: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  Widget _empty(String msg) => Center(
    child: Text(msg, style: AppTypography.bodyMd, textAlign: TextAlign.center),
  );
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final OrderStatus status;

  Color get _color => switch (status) {
    OrderStatus.executed  => AppColors.success,
    OrderStatus.cancelled => AppColors.danger,
    OrderStatus.rejected  => AppColors.danger,
    _                     => AppColors.warning,
  };

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: Spacing.sm, vertical: 2),
    decoration: BoxDecoration(
      color: _color.withOpacity(0.15),
      borderRadius: BorderRadius.circular(Radius.xs),
    ),
    child: Text(status.name.toUpperCase(),
        style: AppTypography.labelSm.copyWith(color: _color)),
  );
}
