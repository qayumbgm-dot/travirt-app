abstract final class ApiConstants {
  // Base URLs — override via flavors / --dart-define
  static const String _prodBase  = 'https://travirt-backend.onrender.com/api';
  static const String _devBase   = 'http://10.0.2.2:3001/api'; // Android emulator localhost

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: _prodBase,
  );

  // ── Auth ──────────────────────────────────────────────────────────────────
  static const String login         = '/auth/login';
  static const String signup        = '/auth/register';
  static const String refresh       = '/auth/refresh';
  static const String logout        = '/auth/logout';
  static const String forgotPw      = '/auth/forgot-password';
  static const String resetPw       = '/auth/reset-password';
  static const String verifyTfa     = '/auth/verify-2fa';
  static const String profile       = '/auth/profile';
  static const String changePassword = '/auth/change-password';
  static const String deleteAccount = '/auth/delete-account';

  // ── Portfolio ─────────────────────────────────────────────────────────────
  static const String portfolioSummary = '/portfolio/summary';
  static const String holdings         = '/portfolio/holdings';
  static const String equityCurve      = '/portfolio/equity-curve';
  static const String tradeStats       = '/portfolio/trade-stats';
  static const String pnlCalendar      = '/portfolio/pnl-calendar';

  // ── Trade ─────────────────────────────────────────────────────────────────
  static const String placeOrder   = '/trade/order';
  static const String orders       = '/trade/orders';
  static const String positions    = '/trade/positions';
  static const String watchlist    = '/trade/watchlist';

  // ── Market ────────────────────────────────────────────────────────────────
  static const String marketStatus  = '/market/status';
  static const String searchSymbols = '/market/search';
  static const String quote         = '/market/quote';
  static const String indices       = '/market/indices';

  // ── Leaderboard ───────────────────────────────────────────────────────────
  static const String leaderboard  = '/leaderboard';

  // ── Billing ───────────────────────────────────────────────────────────────
  static const String billingPlans    = '/billing/plans';
  static const String subscribe       = '/billing/subscribe';
  static const String cancelSub       = '/billing/cancel';
  static const String billingHistory  = '/billing/history';

  // ── AI ────────────────────────────────────────────────────────────────────
  static const String aiNews       = '/ai/news';
  static const String aiInsights   = '/ai/insights';
  static const String aiChat       = '/ai/chat';

  // ── Broker ────────────────────────────────────────────────────────────────
  static const String aliceCallback = '/broker/alice/callback';

  // ── Alerts ────────────────────────────────────────────────────────────────
  static const String alerts = '/alerts';

  // ── Funds ─────────────────────────────────────────────────────────────────
  static const String funds        = '/funds';
  static const String addFunds     = '/funds/add';
  static const String withdrawFunds = '/funds/withdraw';

  // ── Timeouts ──────────────────────────────────────────────────────────────
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout    = Duration(seconds: 15);
}
