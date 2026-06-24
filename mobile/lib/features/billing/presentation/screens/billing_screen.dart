import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../shared/widgets/travirt_button.dart';
import '../../../auth/presentation/viewmodels/auth_viewmodel.dart';
import '../../../../core/payments/razorpay_service.dart';

final _loadingPlanProvider = StateProvider<String?>((ref) => null);

class BillingScreen extends ConsumerStatefulWidget {
  const BillingScreen({super.key});

  @override
  ConsumerState<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends ConsumerState<BillingScreen> {
  @override
  void initState() {
    super.initState();
    ref.read(razorpayServiceProvider).init();
  }

  Future<void> _upgrade(String plan) async {
    final user = ref.read(authViewModelProvider).user;
    if (user == null) return;

    ref.read(_loadingPlanProvider.notifier).state = plan;

    ref.read(razorpayServiceProvider).subscribe(
      plan: plan,
      email: user.email,
      username: user.username,
      onResult: (result) {
        if (!mounted) return;
        ref.read(_loadingPlanProvider.notifier).state = null;

        switch (result) {
          case PaymentSuccess():
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Payment successful! Your ${plan.toUpperCase()} plan is now active.',
                ),
                backgroundColor: AppColors.success,
              ),
            );
            // Refresh auth state to get updated plan
            ref.read(authViewModelProvider.notifier).refreshSession();

          case PaymentFailure(:final message):
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Payment failed: $message'),
                backgroundColor: AppColors.danger,
              ),
            );

          case PaymentExternalWallet(:final walletName):
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content:
                    Text('External wallet selected: $walletName'),
              ),
            );
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authViewModelProvider).user;
    final currentPlan = user?.plan ?? 'free';
    final loadingPlan = ref.watch(_loadingPlanProvider);

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(title: const Text('Subscription')),
      body: ListView(
        padding: const EdgeInsets.all(Spacing.xl2),
        children: [
          Text('Choose Your Plan', style: AppTypography.headingXl),
          const SizedBox(height: Spacing.sm),
          Text('Unlock advanced features and analytics.',
              style: AppTypography.bodyMd),
          const SizedBox(height: Spacing.xl3),

          _PlanCard(
            name: 'Free',
            price: '₹0',
            period: 'forever',
            color: AppColors.muted,
            current: currentPlan == 'free',
            features: const [
              '₹10 lakh virtual balance',
              'Basic portfolio tracking',
              'Simulation market data',
              '5 watchlist symbols',
            ],
          ),
          const SizedBox(height: Spacing.xl),

          _PlanCard(
            name: 'Pro',
            price: '₹299',
            period: 'per month',
            color: AppColors.primary,
            current: currentPlan == 'pro',
            popular: true,
            loading: loadingPlan == 'pro',
            features: const [
              '₹50 lakh virtual balance',
              'Advanced analytics & charts',
              'Alice Blue live market feed',
              'AI news & insights',
              'Unlimited watchlist',
              'Trade export (CSV)',
            ],
            onUpgrade: () => _upgrade('pro'),
          ),
          const SizedBox(height: Spacing.xl),

          _PlanCard(
            name: 'Elite',
            price: '₹699',
            period: 'per month',
            color: const Color(0xFFFFD700),
            current: currentPlan == 'elite',
            loading: loadingPlan == 'elite',
            features: const [
              'Everything in Pro',
              '₹1 crore virtual balance',
              'Priority AI insights',
              'Risk management engine',
              'Performance certificates',
              'Priority support',
            ],
            onUpgrade: () => _upgrade('elite'),
          ),

          const SizedBox(height: Spacing.xl3),
          _RefundNote(),
        ],
      ),
    );
  }
}

class _RefundNote extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: Spacing.md),
        child: Text(
          'Payments are processed securely via Razorpay. '
          'Plans auto-renew monthly. Cancel anytime from your account.',
          style: AppTypography.bodySm.copyWith(color: AppColors.muted),
          textAlign: TextAlign.center,
        ),
      );
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({
    required this.name,
    required this.price,
    required this.period,
    required this.color,
    required this.current,
    required this.features,
    this.popular = false,
    this.loading = false,
    this.onUpgrade,
  });

  final String name;
  final String price;
  final String period;
  final Color color;
  final bool current;
  final bool popular;
  final bool loading;
  final List<String> features;
  final VoidCallback? onUpgrade;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderColor: current ? color : color.withOpacity(0.3),
      gradient: current
          ? LinearGradient(
              colors: [color.withOpacity(0.15), Colors.transparent])
          : null,
      child: Padding(
        padding: const EdgeInsets.all(Spacing.xl2),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Text(name,
                    style:
                        AppTypography.headingLg.copyWith(color: color)),
                if (popular) ...[
                  const SizedBox(width: Spacing.sm),
                  _Badge(label: 'POPULAR', color: color),
                ],
                if (current) ...[
                  const Spacer(),
                  _Badge(label: 'CURRENT', color: color),
                ],
              ]),
              const SizedBox(height: Spacing.sm),
              Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(price,
                    style: AppTypography.numericXl.copyWith(color: color)),
                const SizedBox(width: Spacing.xs),
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('/ $period', style: AppTypography.bodyMd),
                ),
              ]),
              const SizedBox(height: Spacing.lg),
              ...features.map((f) => Padding(
                    padding: const EdgeInsets.only(bottom: Spacing.sm),
                    child: Row(children: [
                      Icon(Icons.check, color: color, size: 16),
                      const SizedBox(width: Spacing.sm),
                      Expanded(
                          child:
                              Text(f, style: AppTypography.bodyMd)),
                    ]),
                  )),
              if (!current && onUpgrade != null) ...[
                const SizedBox(height: Spacing.lg),
                loading
                    ? const Center(
                        child: SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : TravirtButton(
                        label: 'Upgrade to $name',
                        onPressed: onUpgrade!,
                      ),
              ],
            ]),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(
            horizontal: Spacing.sm, vertical: 2),
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          borderRadius: BorderRadius.circular(Radius.xs),
        ),
        child: Text(label,
            style: AppTypography.labelSm.copyWith(color: color)),
      );
}
