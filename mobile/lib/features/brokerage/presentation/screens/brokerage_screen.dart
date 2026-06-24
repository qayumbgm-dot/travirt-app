import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../app/navigation/app_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/travirt_button.dart';

class BrokerageScreen extends StatefulWidget {
  const BrokerageScreen({super.key});

  @override
  State<BrokerageScreen> createState() => _BrokerageScreenState();
}

class _BrokerageScreenState extends State<BrokerageScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() { _tabCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: const Text('Brokerage'),
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [
            Tab(text: 'Open Account'),
            Tab(text: 'Charges'),
            Tab(text: 'Calculator'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: const [
          _OpenAccountTab(),
          _ChargesTab(),
          _CalculatorTab(),
        ],
      ),
    );
  }
}

// ── Open Account Tab ──────────────────────────────────────────────────────────

class _OpenAccountTab extends StatelessWidget {
  const _OpenAccountTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(Spacing.xl2),
      children: [
        Text('Open a Real Trading Account', style: AppTypography.headingXl),
        const SizedBox(height: Spacing.sm),
        Text(
          'You\'ve mastered virtual trading on TraVirt. Take the next step.',
          style: AppTypography.bodyMd,
        ),
        const SizedBox(height: Spacing.xl2),
        _BrokerCard(
          name: 'Zerodha',
          tagline: "India's largest discount broker",
          features: const [
            '₹0 equity delivery brokerage',
            'Flat ₹20 per order — intraday & F&O',
            'Kite — award-winning trading platform',
            'Coin for direct mutual funds',
          ],
          color: AppColors.primary,
          url: 'https://zerodha.com',
        ),
        const SizedBox(height: Spacing.xl),
        _BrokerCard(
          name: 'Alice Blue',
          tagline: 'ANT Web platform · Integrated with TraVirt live feed',
          features: const [
            '₹0 equity delivery brokerage',
            'Flat ₹15 per order — intraday & F&O',
            'ANT Web & ANT Mobi platforms',
            'Live market data on TraVirt',
          ],
          color: AppColors.success,
          url: 'https://aliceblueonline.com',
          badge: 'TraVirt Integrated',
        ),
        const SizedBox(height: Spacing.md),
        Builder(builder: (context) => TravirtButton(
          label: 'Connect Live Feed',
          icon: Icons.wifi_tethering,
          onPressed: () => context.go(AppRoutes.aliceConnect),
        )),
        const SizedBox(height: Spacing.xl3),
        GlassCard(
          child: Padding(
            padding: const EdgeInsets.all(Spacing.lg),
            child: Row(children: [
              const Icon(Icons.verified_user_outlined,
                  color: AppColors.success, size: 20),
              const SizedBox(width: Spacing.md),
              Expanded(
                child: Text(
                  'Both brokers are SEBI-registered and offer ₹0 equity delivery brokerage',
                  style: AppTypography.bodySm,
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _BrokerCard extends StatelessWidget {
  const _BrokerCard({
    required this.name, required this.tagline, required this.features,
    required this.color, required this.url, this.badge,
  });
  final String name;
  final String tagline;
  final List<String> features;
  final Color color;
  final String url;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderColor: color.withOpacity(0.3),
      child: Padding(
        padding: const EdgeInsets.all(Spacing.xl2),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(name, style: AppTypography.headingLg.copyWith(color: color)),
            const Spacer(),
            if (badge != null)
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: Spacing.sm, vertical: Spacing.xs),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(Radius.xs),
                ),
                child: Text(badge!,
                    style: AppTypography.labelSm.copyWith(color: color)),
              ),
          ]),
          Text(tagline, style: AppTypography.bodyMd),
          const SizedBox(height: Spacing.lg),
          ...features.map((f) => Padding(
            padding: const EdgeInsets.only(bottom: Spacing.sm),
            child: Row(children: [
              Icon(Icons.check_circle_outline, color: color, size: 16),
              const SizedBox(width: Spacing.sm),
              Expanded(child: Text(f, style: AppTypography.bodyMd)),
            ]),
          )),
          const SizedBox(height: Spacing.lg),
          TravirtButton(
            label: 'Open Account Free',
            icon: Icons.open_in_new,
            onPressed: () => launchUrl(Uri.parse(url),
                mode: LaunchMode.externalApplication),
          ),
        ]),
      ),
    );
  }
}

// ── Charges Tab ───────────────────────────────────────────────────────────────

class _ChargesTab extends StatelessWidget {
  const _ChargesTab();

  @override
  Widget build(BuildContext context) {
    const rows = [
      ('Equity Delivery', 'Zero', '₹20 or 0.03%', '₹20 or 0.03%', 'Flat ₹20'),
      ('STT/CTT', '0.1% B&S', '0.025% Sell', '0.02% Sell', '0.125%'),
      ('Transaction', '0.00297%', '0.00297%', '0.00173%', '0.03503%'),
      ('GST', '18%', '18%', '18%', '18%'),
      ('SEBI', '₹10/Cr', '₹10/Cr', '₹10/Cr', '₹10/Cr'),
      ('Stamp Duty', '0.015%', '0.003%', '0.002%', '0.003%'),
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(Spacing.xl2),
      child: GlassCard(
        child: Column(
          children: [
            _HeaderRow(),
            const Divider(color: AppColors.overlayLight),
            ...rows.map((r) => _DataRow(row: r)),
          ],
        ),
      ),
    );
  }
}

class _HeaderRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(Spacing.lg),
    child: Row(children: [
      Expanded(flex: 2, child: Text('Head', style: AppTypography.labelMd
          .copyWith(color: AppColors.primary))),
      Expanded(child: Text('Delivery', style: AppTypography.labelMd,
          textAlign: TextAlign.center)),
      Expanded(child: Text('Intraday', style: AppTypography.labelMd,
          textAlign: TextAlign.center)),
      Expanded(child: Text('Futures', style: AppTypography.labelMd,
          textAlign: TextAlign.center)),
      Expanded(child: Text('Options', style: AppTypography.labelMd,
          textAlign: TextAlign.center)),
    ]),
  );
}

class _DataRow extends StatelessWidget {
  const _DataRow({required this.row});
  final (String, String, String, String, String) row;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(
        horizontal: Spacing.lg, vertical: Spacing.md),
    decoration: const BoxDecoration(
      border: Border(bottom: BorderSide(color: AppColors.overlayLight, width: 0.5)),
    ),
    child: Row(children: [
      Expanded(flex: 2, child: Text(row.$1, style: AppTypography.headingSm)),
      Expanded(child: Text(row.$2, style: AppTypography.numericSm,
          textAlign: TextAlign.center)),
      Expanded(child: Text(row.$3, style: AppTypography.numericSm,
          textAlign: TextAlign.center)),
      Expanded(child: Text(row.$4, style: AppTypography.numericSm,
          textAlign: TextAlign.center)),
      Expanded(child: Text(row.$5, style: AppTypography.numericSm,
          textAlign: TextAlign.center)),
    ]),
  );
}

// ── Calculator Tab ────────────────────────────────────────────────────────────

class _CalculatorTab extends StatefulWidget {
  const _CalculatorTab();

  @override
  State<_CalculatorTab> createState() => _CalculatorTabState();
}

class _CalculatorTabState extends State<_CalculatorTab> {
  final _buyCtrl  = TextEditingController();
  final _sellCtrl = TextEditingController();
  final _qtyCtrl  = TextEditingController();
  String _segment = 'Intraday';
  double _brokerage = 0, _stt = 0, _total = 0, _pnl = 0;

  void _calculate() {
    final buy  = double.tryParse(_buyCtrl.text)  ?? 0;
    final sell = double.tryParse(_sellCtrl.text) ?? 0;
    final qty  = int.tryParse(_qtyCtrl.text)     ?? 0;
    if (buy == 0 || sell == 0 || qty == 0) return;

    final turnover = (buy + sell) * qty;
    final brokerage = _segment == 'Delivery'
        ? 0.0
        : [turnover * 0.0003, 40.0].reduce((a, b) => a < b ? a : b);
    final stt = _segment == 'Delivery'
        ? turnover * 0.001
        : sell * qty * 0.00025;
    final txn = turnover * 0.0000297;
    final gst = (brokerage + txn) * 0.18;
    final stamp = buy * qty * 0.00003;
    final total = brokerage + stt + txn + gst + stamp;
    final pnl = (sell - buy) * qty - total;

    setState(() {
      _brokerage = brokerage;
      _stt = stt;
      _total = total;
      _pnl = pnl;
    });
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(Spacing.xl2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Segment selector
          Row(
            children: ['Intraday', 'Delivery', 'F&O'].map((s) => Padding(
              padding: const EdgeInsets.only(right: Spacing.sm),
              child: ChoiceChip(
                label: Text(s),
                selected: _segment == s,
                onSelected: (_) => setState(() => _segment = s),
              ),
            )).toList(),
          ),
          const SizedBox(height: Spacing.xl),

          GlassCard(
            child: Padding(
              padding: const EdgeInsets.all(Spacing.xl2),
              child: Column(children: [
                Row(children: [
                  Expanded(child: TextField(
                    controller: _buyCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: AppTypography.bodyLg,
                    decoration: const InputDecoration(labelText: 'Buy Price'),
                    onChanged: (_) => _calculate(),
                  )),
                  const SizedBox(width: Spacing.lg),
                  Expanded(child: TextField(
                    controller: _sellCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: AppTypography.bodyLg,
                    decoration: const InputDecoration(labelText: 'Sell Price'),
                    onChanged: (_) => _calculate(),
                  )),
                ]),
                const SizedBox(height: Spacing.lg),
                TextField(
                  controller: _qtyCtrl,
                  keyboardType: TextInputType.number,
                  style: AppTypography.bodyLg,
                  decoration: const InputDecoration(labelText: 'Quantity'),
                  onChanged: (_) => _calculate(),
                ),
              ]),
            ),
          ),

          if (_total > 0) ...[
            const SizedBox(height: Spacing.xl),
            GlassCard(
              child: Padding(
                padding: const EdgeInsets.all(Spacing.xl2),
                child: Column(children: [
                  _ResultRow('Brokerage', '₹${_brokerage.toStringAsFixed(2)}'),
                  _ResultRow('STT', '₹${_stt.toStringAsFixed(2)}'),
                  _ResultRow('Total Charges', '₹${_total.toStringAsFixed(2)}'),
                  const Divider(color: AppColors.overlayLight),
                  _ResultRow(
                    'Net P&L',
                    '₹${_pnl.toStringAsFixed(2)}',
                    color: _pnl >= 0 ? AppColors.success : AppColors.danger,
                  ),
                ]),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ResultRow extends StatelessWidget {
  const _ResultRow(this.label, this.value, {this.color});
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: Spacing.sm),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.bodyMd),
        Text(value, style: AppTypography.numericMd
            .copyWith(color: color ?? AppColors.textPrimary)),
      ],
    ),
  );
}
