import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/signup_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/tfa_screen.dart';
import '../../features/auth/presentation/viewmodels/auth_viewmodel.dart';
import '../../shared/screens/main_shell.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/trade/presentation/screens/trade_screen.dart';
import '../../features/trade/presentation/screens/order_ticket_screen.dart';
import '../../features/portfolio/presentation/screens/portfolio_screen.dart';
import '../../features/orders/presentation/screens/orders_screen.dart';
import '../../features/leaderboard/presentation/screens/leaderboard_screen.dart';
import '../../features/ai_news/presentation/screens/ai_news_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/brokerage/presentation/screens/brokerage_screen.dart';
import '../../features/billing/presentation/screens/billing_screen.dart';
import '../../features/funds/presentation/screens/funds_screen.dart';
import '../../features/more/presentation/screens/more_screen.dart';
import '../../features/watchlist/presentation/screens/watchlist_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../features/broker/presentation/screens/alice_connect_screen.dart';
import '../../features/auth/presentation/screens/change_password_screen.dart';
import '../../features/ai_chat/presentation/screens/ai_chat_screen.dart';
import '../../features/portfolio/presentation/screens/pnl_calendar_screen.dart';
import '../../features/portfolio/presentation/screens/trade_stats_screen.dart';
import '../../features/onboarding/presentation/screens/onboarding_screen.dart';
import '../../features/profile/presentation/screens/edit_profile_screen.dart';
import '../../features/security/presentation/screens/security_screen.dart';
import '../../features/help/presentation/screens/help_screen.dart';
import '../../features/alerts/presentation/screens/alerts_screen.dart';

abstract final class AppRoutes {
  static const splash        = '/';
  static const login         = '/login';
  static const signup        = '/signup';
  static const forgotPw      = '/forgot-password';
  static const tfa           = '/tfa';
  static const shell         = '/app';
  static const dashboard     = '/app/dashboard';
  static const trade         = '/app/trade';
  static const orderTicket   = '/app/trade/order';
  static const portfolio     = '/app/portfolio';
  static const orders        = '/app/orders';
  static const more          = '/app/more';
  static const watchlist     = '/app/watchlist';
  static const settings      = '/app/settings';
  static const aliceConnect   = '/app/broker/alice';
  static const changePassword = '/app/change-password';
  static const aiChat         = '/app/ai-chat';
  static const pnlCalendar    = '/app/portfolio/calendar';
  static const tradeStats     = '/app/portfolio/stats';
  static const onboarding     = '/onboarding';
  static const editProfile    = '/app/profile/edit';
  static const security       = '/app/security';
  static const help           = '/app/help';
  static const alerts         = '/app/alerts';
  static const leaderboard   = '/app/leaderboard';
  static const aiNews        = '/app/ai-news';
  static const profile       = '/app/profile';
  static const brokerage     = '/app/brokerage';
  static const billing       = '/app/billing';
  static const funds         = '/app/funds';
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authViewModelProvider);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    redirect: (context, state) {
      final isAuthenticated = authState.user != null;
      final isSplash = state.matchedLocation == AppRoutes.splash;
      final isAuthRoute = [
        AppRoutes.login,
        AppRoutes.signup,
        AppRoutes.forgotPw,
        AppRoutes.tfa,
      ].contains(state.matchedLocation);

      final isOnboarding = state.matchedLocation == AppRoutes.onboarding;
      if (isSplash || isOnboarding) return null;
      if (!isAuthenticated && !isAuthRoute) return AppRoutes.login;
      if (isAuthenticated && isAuthRoute) return AppRoutes.dashboard;
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (_, __) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.onboarding,
        builder: (_, __) => const OnboardingScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        pageBuilder: (_, state) => _fadePage(state, const LoginScreen()),
      ),
      GoRoute(
        path: AppRoutes.signup,
        pageBuilder: (_, state) => _slidePage(state, const SignupScreen()),
      ),
      GoRoute(
        path: AppRoutes.forgotPw,
        pageBuilder: (_, state) => _slidePage(state, const ForgotPasswordScreen()),
      ),
      GoRoute(
        path: AppRoutes.tfa,
        builder: (_, state) => TfaScreen(
          tempToken: state.extra as ({String tempToken, String userId}) ,
        ),
      ),

      // ── Authenticated Shell ──────────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.dashboard,
            pageBuilder: (_, state) => _fadePage(state, const DashboardScreen()),
          ),
          GoRoute(
            path: AppRoutes.trade,
            pageBuilder: (_, state) => _fadePage(state, const TradeScreen()),
            routes: [
              GoRoute(
                path: 'order',
                pageBuilder: (_, state) => _slidePage(
                  state,
                  OrderTicketScreen(symbol: state.extra as String? ?? ''),
                ),
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.portfolio,
            pageBuilder: (_, state) => _fadePage(state, const PortfolioScreen()),
          ),
          GoRoute(
            path: AppRoutes.orders,
            pageBuilder: (_, state) => _fadePage(state, const OrdersScreen()),
          ),
          GoRoute(
            path: AppRoutes.more,
            pageBuilder: (_, state) => _fadePage(state, const MoreScreen()),
          ),
          GoRoute(
            path: AppRoutes.watchlist,
            pageBuilder: (_, state) => _fadePage(state, const WatchlistScreen()),
          ),
          GoRoute(
            path: AppRoutes.settings,
            pageBuilder: (_, state) => _slidePage(state, const SettingsScreen()),
          ),
          GoRoute(
            path: AppRoutes.aliceConnect,
            pageBuilder: (_, state) => _slidePage(state, const AliceConnectScreen()),
          ),
          GoRoute(
            path: AppRoutes.changePassword,
            pageBuilder: (_, state) => _slidePage(state, const ChangePasswordScreen()),
          ),
          GoRoute(
            path: AppRoutes.aiChat,
            pageBuilder: (_, state) => _slidePage(state, const AiChatScreen()),
          ),
          GoRoute(
            path: AppRoutes.pnlCalendar,
            pageBuilder: (_, state) => _slidePage(state, const PnlCalendarScreen()),
          ),
          GoRoute(
            path: AppRoutes.tradeStats,
            pageBuilder: (_, state) => _slidePage(state, const TradeStatsScreen()),
          ),
          GoRoute(
            path: AppRoutes.leaderboard,
            pageBuilder: (_, state) => _fadePage(state, const LeaderboardScreen()),
          ),
          GoRoute(
            path: AppRoutes.aiNews,
            pageBuilder: (_, state) => _fadePage(state, const AiNewsScreen()),
          ),
          GoRoute(
            path: AppRoutes.profile,
            pageBuilder: (_, state) => _slidePage(state, const ProfileScreen()),
          ),
          GoRoute(
            path: AppRoutes.editProfile,
            pageBuilder: (_, state) => _slidePage(state, const EditProfileScreen()),
          ),
          GoRoute(
            path: AppRoutes.brokerage,
            pageBuilder: (_, state) => _fadePage(state, const BrokerageScreen()),
          ),
          GoRoute(
            path: AppRoutes.billing,
            pageBuilder: (_, state) => _slidePage(state, const BillingScreen()),
          ),
          GoRoute(
            path: AppRoutes.funds,
            pageBuilder: (_, state) => _slidePage(state, const FundsScreen()),
          ),
          GoRoute(
            path: AppRoutes.security,
            pageBuilder: (_, state) => _slidePage(state, const SecurityScreen()),
          ),
          GoRoute(
            path: AppRoutes.help,
            pageBuilder: (_, state) => _slidePage(state, const HelpScreen()),
          ),
          GoRoute(
            path: AppRoutes.alerts,
            pageBuilder: (_, state) => _slidePage(state, const AlertsScreen()),
          ),
        ],
      ),
    ],
  );
});

CustomTransitionPage<void> _fadePage(GoRouterState state, Widget child) =>
    CustomTransitionPage(
      key: state.pageKey,
      child: child,
      transitionsBuilder: (_, animation, __, child) =>
          FadeTransition(opacity: animation, child: child),
      transitionDuration: const Duration(milliseconds: 200),
    );

CustomTransitionPage<void> _slidePage(GoRouterState state, Widget child) =>
    CustomTransitionPage(
      key: state.pageKey,
      child: child,
      transitionsBuilder: (_, animation, __, child) => SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(1.0, 0.0),
          end: Offset.zero,
        ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic)),
        child: child,
      ),
      transitionDuration: const Duration(milliseconds: 300),
    );
