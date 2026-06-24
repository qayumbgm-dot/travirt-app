import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/shimmer_box.dart';
import '../viewmodels/alerts_viewmodel.dart';
import '../../domain/entities/alert.dart';

class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncAlerts = ref.watch(alertsProvider);

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: const Text('Price Alerts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(alertsProvider.notifier).refresh(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateSheet(context, ref),
        icon: const Icon(Icons.add_alert_outlined),
        label: const Text('New Alert'),
        backgroundColor: AppColors.primary,
      ),
      body: asyncAlerts.when(
        loading: () => const ShimmerList(),
        error: (e, _) => Center(
          child: Text(e.toString(), style: AppTypography.bodyMd),
        ),
        data: (alerts) {
          if (alerts.isEmpty) {
            return _EmptyState(onAdd: () => _showCreateSheet(context, ref));
          }
          final active    = alerts.where((a) => a.status == 'ACTIVE').toList();
          final inactive  = alerts.where((a) => a.status != 'ACTIVE').toList();
          return ListView(
            padding: const EdgeInsets.fromLTRB(
                Spacing.xl2, Spacing.lg, Spacing.xl2, 100),
            children: [
              if (active.isNotEmpty) ...[
                _SectionLabel('Active (${active.length})'),
                const SizedBox(height: Spacing.sm),
                ...active.map((a) => _AlertTile(
                      alert: a,
                      onCancel: () => _cancel(context, ref, a.id),
                    )),
              ],
              if (inactive.isNotEmpty) ...[
                const SizedBox(height: Spacing.xl),
                _SectionLabel('History'),
                const SizedBox(height: Spacing.sm),
                ...inactive.map((a) => _AlertTile(alert: a)),
              ],
            ],
          );
        },
      ),
    );
  }

  Future<void> _cancel(BuildContext ctx, WidgetRef ref, String id) async {
    final err = await ref.read(alertsProvider.notifier).cancel(id);
    if (!ctx.mounted) return;
    if (err != null) {
      ScaffoldMessenger.of(ctx).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
      );
    }
  }

  Future<void> _showCreateSheet(BuildContext ctx, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radius.xl2)),
      ),
      builder: (_) => _CreateAlertSheet(ref: ref),
    );
  }
}

// ── Tiles ─────────────────────────────────────────────────────────────────────

class _AlertTile extends StatelessWidget {
  const _AlertTile({required this.alert, this.onCancel});
  final Alert alert;
  final VoidCallback? onCancel;

  static const _fmt = DateFormat('dd MMM, HH:mm');

  Color get _statusColor => switch (alert.status) {
        'ACTIVE'    => AppColors.success,
        'TRIGGERED' => AppColors.warning,
        _           => AppColors.muted,
      };

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Spacing.md),
      child: GlassCard(
        child: Padding(
          padding: const EdgeInsets.symmetric(
              horizontal: Spacing.lg, vertical: Spacing.md),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.12),
                borderRadius: BorderRadius.circular(Radius.sm),
              ),
              child: const Icon(Icons.notifications_active_outlined,
                  color: AppColors.warning, size: 20),
            ),
            const SizedBox(width: Spacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Text(alert.symbol, style: AppTypography.headingSm),
                    const SizedBox(width: Spacing.sm),
                    _StatusChip(status: alert.status, color: _statusColor),
                  ]),
                  const SizedBox(height: 2),
                  Text(
                    '${alert.property} ${alert.operator} ${_fmtVal(alert.value)}',
                    style: AppTypography.bodyMd.copyWith(
                        color: AppColors.textSecondary),
                  ),
                  Text(
                    _fmt.format(alert.createdAt.toLocal()),
                    style: AppTypography.bodySm,
                  ),
                ],
              ),
            ),
            if (onCancel != null)
              IconButton(
                icon: const Icon(Icons.close, size: 18, color: AppColors.muted),
                tooltip: 'Cancel alert',
                onPressed: onCancel,
              ),
          ]),
        ),
      ),
    );
  }

  String _fmtVal(double v) =>
      alert.property == 'LTP' || alert.property == 'HIGH' || alert.property == 'LOW'
          ? '₹${v.toStringAsFixed(2)}'
          : v.toStringAsFixed(2);
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status, required this.color});
  final String status;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: Spacing.sm, vertical: 2),
        decoration: BoxDecoration(
          color: color.withOpacity(0.15),
          borderRadius: BorderRadius.circular(Radius.xs),
        ),
        child: Text(
          status,
          style: AppTypography.labelSm.copyWith(color: color, fontSize: 10),
        ),
      );
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onAdd});
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.notifications_none,
                size: 64, color: AppColors.muted),
            const SizedBox(height: Spacing.lg),
            Text('No alerts yet', style: AppTypography.headingMd),
            const SizedBox(height: Spacing.sm),
            Text(
              'Get notified when a price hits your target.',
              style: AppTypography.bodyMd,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Spacing.xl2),
            FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add_alert_outlined),
              label: const Text('Create Alert'),
            ),
          ],
        ),
      );
}

// ── Create sheet ──────────────────────────────────────────────────────────────

class _CreateAlertSheet extends StatefulWidget {
  const _CreateAlertSheet({required this.ref});
  final WidgetRef ref;

  @override
  State<_CreateAlertSheet> createState() => _CreateAlertSheetState();
}

class _CreateAlertSheetState extends State<_CreateAlertSheet> {
  final _symbolCtrl = TextEditingController();
  final _valueCtrl  = TextEditingController();
  String _exchange  = 'NSE';
  String _property  = 'LTP';
  String _operator  = '>=';
  bool   _loading   = false;

  static const _properties = ['LTP', 'CHANGE%', 'CHANGE', 'HIGH', 'LOW', 'VOLUME'];
  static const _operators  = ['>=', '<=', '>', '<', '='];
  static const _exchanges  = ['NSE', 'BSE', 'NFO', 'MCX'];

  @override
  void dispose() {
    _symbolCtrl.dispose();
    _valueCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final symbol = _symbolCtrl.text.trim().toUpperCase();
    final value  = double.tryParse(_valueCtrl.text);
    if (symbol.isEmpty || value == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid symbol and value')),
      );
      return;
    }
    setState(() => _loading = true);
    final err = await widget.ref.read(alertsProvider.notifier).create(
          symbol:   symbol,
          exchange: _exchange,
          property: _property,
          operator: _operator,
          value:    value,
        );
    if (!mounted) return;
    setState(() => _loading = false);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
      );
    } else {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Alert created'),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        Spacing.xl2,
        Spacing.xl2,
        Spacing.xl2,
        MediaQuery.of(context).viewInsets.bottom + Spacing.xl2,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Text('New Alert', style: AppTypography.headingMd),
            const Spacer(),
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ]),
          const SizedBox(height: Spacing.xl),

          // Symbol + Exchange row
          Row(children: [
            Expanded(
              flex: 3,
              child: TextFormField(
                controller: _symbolCtrl,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(labelText: 'Symbol (e.g. RELIANCE)'),
              ),
            ),
            const SizedBox(width: Spacing.md),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _exchange,
                decoration: const InputDecoration(labelText: 'Exchange'),
                items: _exchanges
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (v) => setState(() => _exchange = v!),
              ),
            ),
          ]),
          const SizedBox(height: Spacing.lg),

          // Property + Operator row
          Row(children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _property,
                decoration: const InputDecoration(labelText: 'Property'),
                items: _properties
                    .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                    .toList(),
                onChanged: (v) => setState(() => _property = v!),
              ),
            ),
            const SizedBox(width: Spacing.md),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _operator,
                decoration: const InputDecoration(labelText: 'Condition'),
                items: _operators
                    .map((o) => DropdownMenuItem(value: o, child: Text(o)))
                    .toList(),
                onChanged: (v) => setState(() => _operator = v!),
              ),
            ),
            const SizedBox(width: Spacing.md),
            Expanded(
              child: TextFormField(
                controller: _valueCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: _property == 'LTP' ? 'Price (₹)' : 'Value',
                  prefixIcon: _property == 'LTP'
                      ? const Icon(Icons.currency_rupee, size: 16)
                      : null,
                ),
              ),
            ),
          ]),
          const SizedBox(height: Spacing.xl2),

          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(
                    width: 20, height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Create Alert'),
          ),
        ],
      ),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => Text(
        label,
        style: AppTypography.labelMd.copyWith(color: AppColors.muted),
      );
}
