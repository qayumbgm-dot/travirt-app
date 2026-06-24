import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../app/navigation/app_router.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/travirt_button.dart';

class _Page {
  const _Page({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
  });
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
}

const _pages = [
  _Page(
    icon: Icons.candlestick_chart,
    color: Color(0xFF007BFF),
    title: 'Virtual Trading\nwithout the risk',
    subtitle: 'Practice with ₹10 lakh virtual capital.\nTrade NSE & BSE instruments in real-time simulation.',
  ),
  _Page(
    icon: Icons.wifi_tethering,
    color: Color(0xFF00C853),
    title: 'Live Market Data\nvia Alice Blue',
    subtitle: 'Connect your Alice Blue account to get\nreal-time prices streamed directly to TraVirt.',
  ),
  _Page(
    icon: Icons.auto_awesome,
    color: Color(0xFFFF9800),
    title: 'AI-Powered\nInsights',
    subtitle: 'Get sentiment-tagged news and ask our AI\nanything about markets, strategies, or your trades.',
  ),
  _Page(
    icon: Icons.leaderboard,
    color: Color(0xFF9C27B0),
    title: 'Compete &\nImprove',
    subtitle: 'See how you rank on the leaderboard.\nTrack your win rate, streaks, and P&L calendar.',
  ),
];

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _ctrl = PageController();
  int _page   = 0;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarded', true);
    if (mounted) context.go(AppRoutes.login);
  }

  void _next() {
    if (_page < _pages.length - 1) {
      _ctrl.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      _finish();
    }
  }

  @override
  Widget build(BuildContext context) {
    final page = _pages[_page];

    return Scaffold(
      backgroundColor: AppColors.base,
      body: SafeArea(
        child: Column(children: [
          // Skip button
          Align(
            alignment: Alignment.topRight,
            child: Padding(
              padding: const EdgeInsets.all(Spacing.lg),
              child: TextButton(
                onPressed: _finish,
                child: Text('Skip',
                    style: AppTypography.bodyMd
                        .copyWith(color: AppColors.muted)),
              ),
            ),
          ),

          // Pages
          Expanded(
            child: PageView.builder(
              controller: _ctrl,
              onPageChanged: (i) => setState(() => _page = i),
              itemCount: _pages.length,
              itemBuilder: (_, i) => _OnboardPage(page: _pages[i]),
            ),
          ),

          // Dots
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(_pages.length, (i) => AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width:  _page == i ? 24 : 8,
              height: 8,
              decoration: BoxDecoration(
                color: _page == i ? page.color : AppColors.overlayLight,
                borderRadius: BorderRadius.circular(Radius.full),
              ),
            )),
          ),

          const SizedBox(height: Spacing.xl2),

          // Buttons
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Spacing.xl2),
            child: Column(children: [
              TravirtButton(
                label: _page == _pages.length - 1 ? 'Get Started' : 'Next',
                onPressed: _next,
              ),
              if (_page == _pages.length - 1) ...[
                const SizedBox(height: Spacing.md),
                TextButton(
                  onPressed: _finish,
                  child: Text('Already have an account? Sign in',
                      style: AppTypography.bodyMd
                          .copyWith(color: AppColors.primary)),
                ),
              ],
            ]),
          ),

          const SizedBox(height: Spacing.xl3),
        ]),
      ),
    );
  }
}

class _OnboardPage extends StatelessWidget {
  const _OnboardPage({required this.page});
  final _Page page;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(Spacing.xl3),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120, height: 120,
            decoration: BoxDecoration(
              color: page.color.withOpacity(0.12),
              shape: BoxShape.circle,
              border: Border.all(color: page.color.withOpacity(0.3), width: 2),
            ),
            child: Icon(page.icon, color: page.color, size: 56),
          )
          .animate()
          .scale(duration: 400.ms, curve: Curves.easeOutBack)
          .fadeIn(),

          const SizedBox(height: Spacing.xl3),

          Text(
            page.title,
            style: AppTypography.displaySm,
            textAlign: TextAlign.center,
          )
          .animate(delay: 100.ms)
          .fadeIn(duration: 400.ms)
          .slideY(begin: 0.1, end: 0),

          const SizedBox(height: Spacing.lg),

          Text(
            page.subtitle,
            style: AppTypography.bodyLg,
            textAlign: TextAlign.center,
          )
          .animate(delay: 200.ms)
          .fadeIn(duration: 400.ms)
          .slideY(begin: 0.1, end: 0),
        ],
      ),
    );
  }
}
