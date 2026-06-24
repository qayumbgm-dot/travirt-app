import 'package:get_it/get_it.dart';
import '../../core/network/api_client.dart';
import '../../core/network/interceptors/auth_interceptor.dart';
import '../../core/network/price_feed_service.dart';
import '../../core/storage/secure_storage.dart';
import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/usecases/login_usecase.dart';
import '../../features/auth/domain/usecases/logout_usecase.dart';
import '../../features/auth/domain/usecases/signup_usecase.dart';
import '../../features/auth/domain/usecases/restore_session_usecase.dart';
import '../../features/dashboard/data/datasources/dashboard_remote_datasource.dart';
import '../../features/dashboard/data/repositories/dashboard_repository_impl.dart';
import '../../features/dashboard/domain/repositories/dashboard_repository.dart';
import '../../features/dashboard/domain/usecases/get_dashboard_usecase.dart';
import '../../features/dashboard/domain/usecases/get_market_indices_usecase.dart';
import '../../features/market/data/datasources/market_remote_datasource.dart';
import '../../features/market/data/repositories/market_repository_impl.dart';
import '../../features/market/domain/repositories/market_repository.dart';
import '../../features/market/domain/usecases/search_symbols_usecase.dart';
import '../../features/market/domain/usecases/get_indices_usecase.dart';
import '../../features/trade/data/datasources/trade_remote_datasource.dart';
import '../../features/trade/data/repositories/trade_repository_impl.dart';
import '../../features/trade/domain/repositories/trade_repository.dart';
import '../../features/trade/domain/usecases/place_order_usecase.dart';
import '../../features/trade/domain/usecases/get_orders_usecase.dart';
import '../../features/trade/domain/usecases/get_positions_usecase.dart';
import '../../features/portfolio/data/datasources/portfolio_remote_datasource.dart';
import '../../features/portfolio/data/repositories/portfolio_repository_impl.dart';
import '../../features/portfolio/domain/repositories/portfolio_repository.dart';
import '../../features/portfolio/domain/usecases/get_portfolio_usecase.dart';
import '../../features/alerts/data/datasources/alert_remote_datasource.dart';
import '../../features/alerts/data/repositories/alert_repository_impl.dart';
import '../../features/alerts/domain/repositories/alert_repository.dart';
import '../../features/alerts/domain/usecases/list_alerts_usecase.dart';
import '../../features/alerts/domain/usecases/create_alert_usecase.dart';
import '../../features/alerts/domain/usecases/cancel_alert_usecase.dart';

final GetIt sl = GetIt.instance;

Future<void> configureDependencies() async {
  // ── Core ──────────────────────────────────────────────────────────────────
  sl.registerLazySingleton<SecureStorage>(() => SecureStorageImpl());

  sl.registerLazySingleton<PriceFeedService>(
    () => PriceFeedService(sl<SecureStorage>()),
  );

  sl.registerLazySingleton<AuthInterceptor>(
    () => AuthInterceptor(sl<SecureStorage>()),
  );

  sl.registerLazySingleton<ApiClient>(
    () => ApiClient(authInterceptor: sl<AuthInterceptor>()),
  );

  // ── Auth ──────────────────────────────────────────────────────────────────
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: sl<AuthRemoteDataSource>(),
      secureStorage: sl<SecureStorage>(),
    ),
  );
  sl.registerFactory(() => LoginUseCase(sl<AuthRepository>()));
  sl.registerFactory(() => SignupUseCase(sl<AuthRepository>()));
  sl.registerFactory(() => LogoutUseCase(sl<AuthRepository>()));
  sl.registerFactory(() => RestoreSessionUseCase(sl<AuthRepository>()));

  // ── Dashboard ─────────────────────────────────────────────────────────────
  sl.registerLazySingleton<DashboardRemoteDataSource>(
    () => DashboardRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<DashboardRepository>(
    () => DashboardRepositoryImpl(sl<DashboardRemoteDataSource>()),
  );
  sl.registerFactory(() => GetDashboardUseCase(sl<DashboardRepository>()));
  sl.registerFactory(() => GetMarketIndicesUseCase(sl<DashboardRepository>()));

  // ── Market ────────────────────────────────────────────────────────────────
  sl.registerLazySingleton<MarketRemoteDataSource>(
    () => MarketRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<MarketRepository>(
    () => MarketRepositoryImpl(sl<MarketRemoteDataSource>()),
  );
  sl.registerFactory(() => SearchSymbolsUseCase(sl<MarketRepository>()));
  sl.registerFactory(() => GetIndicesUseCase(sl<MarketRepository>()));

  // ── Trade ─────────────────────────────────────────────────────────────────
  sl.registerLazySingleton<TradeRemoteDataSource>(
    () => TradeRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<TradeRepository>(
    () => TradeRepositoryImpl(sl<TradeRemoteDataSource>()),
  );
  sl.registerFactory(() => PlaceOrderUseCase(sl<TradeRepository>()));
  sl.registerFactory(() => GetOrdersUseCase(sl<TradeRepository>()));
  sl.registerFactory(() => GetPositionsUseCase(sl<TradeRepository>()));

  // ── Portfolio ─────────────────────────────────────────────────────────────
  sl.registerLazySingleton<PortfolioRemoteDataSource>(
    () => PortfolioRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<PortfolioRepository>(
    () => PortfolioRepositoryImpl(sl<PortfolioRemoteDataSource>()),
  );
  sl.registerFactory(() => GetPortfolioUseCase(sl<PortfolioRepository>()));

  // ── Alerts ────────────────────────────────────────────────────────────────
  sl.registerLazySingleton<AlertRemoteDataSource>(
    () => AlertRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<AlertRepository>(
    () => AlertRepositoryImpl(sl<AlertRemoteDataSource>()),
  );
  sl.registerFactory(() => ListAlertsUseCase(sl<AlertRepository>()));
  sl.registerFactory(() => CreateAlertUseCase(sl<AlertRepository>()));
  sl.registerFactory(() => CancelAlertUseCase(sl<AlertRepository>()));
}
