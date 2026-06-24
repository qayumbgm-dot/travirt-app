import 'package:flutter/material.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';

const _faqs = [
  _Faq(
    category: 'Getting Started',
    items: [
      _FaqItem(
        q: 'What is TraVirt?',
        a: 'TraVirt is a virtual trading platform where you can practise buying and selling stocks, futures, and options using simulated money — with real-time market data from Alice Blue.',
      ),
      _FaqItem(
        q: 'Is real money involved?',
        a: 'No. All trading on TraVirt uses a virtual balance. No real funds are debited or credited. It is purely for learning and simulation.',
      ),
      _FaqItem(
        q: 'How do I start trading?',
        a: 'Go to the Trade tab, search for a symbol, and tap it to open the order ticket. Choose your side (Buy/Sell), quantity, and order type, then confirm.',
      ),
    ],
  ),
  _Faq(
    category: 'Account & Plans',
    items: [
      _FaqItem(
        q: 'What is the difference between Free, Pro, and Elite plans?',
        a: 'Free gives you basic virtual trading with delayed data. Pro unlocks real-time data, advanced charting, and CSV export. Elite adds AI-powered insights, priority support, and extended market coverage.',
      ),
      _FaqItem(
        q: 'How do I upgrade my plan?',
        a: 'Go to Profile → Subscription and tap Upgrade. You will be taken through a secure Razorpay checkout. Your plan activates immediately after payment.',
      ),
      _FaqItem(
        q: 'Can I cancel my subscription?',
        a: 'Yes. Contact support before the next billing cycle and we will cancel your subscription. There are no refunds for partial months.',
      ),
    ],
  ),
  _Faq(
    category: 'Brokerage & Alice Blue',
    items: [
      _FaqItem(
        q: 'Why do I need to connect Alice Blue?',
        a: 'Connecting Alice Blue lets TraVirt fetch real-time market data for live pricing. Without it, the app uses delayed or simulated prices.',
      ),
      _FaqItem(
        q: 'Is my Alice Blue login stored?',
        a: 'No. TraVirt only stores a short-lived OAuth token from Alice Blue\'s ANT platform. Your username and password are never sent to or stored by TraVirt servers.',
      ),
    ],
  ),
  _Faq(
    category: 'Data & Privacy',
    items: [
      _FaqItem(
        q: 'What data does TraVirt collect?',
        a: 'We collect your email, username, and trading activity within the app. We do not sell your data. For the full policy, see Privacy Policy in Profile.',
      ),
      _FaqItem(
        q: 'How do I delete my account?',
        a: 'Email support@travirt.in with your registered email address and we will delete your account and data within 7 business days.',
      ),
    ],
  ),
];

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('Help & FAQ')),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.xl2),
        children: [
          // Search hint card
          GlassCard(
            child: Padding(
              padding: const EdgeInsets.all(Spacing.lg),
              child: Row(children: [
                const Icon(Icons.help_outline, color: AppColors.primary, size: 22),
                const SizedBox(width: Spacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Need more help?', style: AppTypography.headingSm),
                      const SizedBox(height: 2),
                      Text('Email us at support@travirt.in',
                          style: AppTypography.bodyMd),
                    ],
                  ),
                ),
              ]),
            ),
          ),

          const SizedBox(height: Spacing.xl2),

          ..._faqs.map((section) => _FaqSection(section: section)),
        ],
      ),
    );
  }
}

class _FaqSection extends StatelessWidget {
  const _FaqSection({required this.section});
  final _Faq section;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(
              bottom: Spacing.md, left: Spacing.xs),
          child: Text(section.category,
              style: AppTypography.labelMd
                  .copyWith(color: AppColors.muted)),
        ),
        GlassCard(
          child: Column(
            children: section.items.asMap().entries.map((entry) {
              final isLast = entry.key == section.items.length - 1;
              return Column(children: [
                _FaqTile(item: entry.value),
                if (!isLast)
                  const Divider(
                      color: AppColors.overlayLight, height: 1),
              ]);
            }).toList(),
          ),
        ),
        const SizedBox(height: Spacing.xl),
      ],
    );
  }
}

class _FaqTile extends StatefulWidget {
  const _FaqTile({required this.item});
  final _FaqItem item;

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return AnimatedSize(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeInOut,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: BorderRadius.circular(Radius.sm),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: Spacing.lg, vertical: Spacing.md),
              child: Row(children: [
                Expanded(
                  child: Text(widget.item.q,
                      style: AppTypography.bodyLg),
                ),
                AnimatedRotation(
                  duration: const Duration(milliseconds: 250),
                  turns: _expanded ? 0.5 : 0.0,
                  child: const Icon(Icons.keyboard_arrow_down,
                      color: AppColors.muted, size: 20),
                ),
              ]),
            ),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.only(
                  left: Spacing.lg,
                  right: Spacing.lg,
                  bottom: Spacing.md),
              child: Text(widget.item.a,
                  style: AppTypography.bodyMd),
            ),
        ],
      ),
    );
  }
}

class _Faq {
  const _Faq({required this.category, required this.items});
  final String category;
  final List<_FaqItem> items;
}

class _FaqItem {
  const _FaqItem({required this.q, required this.a});
  final String q;
  final String a;
}
