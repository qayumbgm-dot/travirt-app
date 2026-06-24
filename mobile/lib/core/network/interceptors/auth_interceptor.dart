import 'package:dio/dio.dart';
import '../../storage/secure_storage.dart';
import '../../constants/api_constants.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._storage);

  final SecureStorage _storage;
  bool _isRefreshing = false;
  final List<RequestOptions> _pendingRequests = [];

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.read(StorageKeys.accessToken);
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 &&
        !err.requestOptions.path.contains(ApiConstants.refresh)) {
      if (_isRefreshing) {
        _pendingRequests.add(err.requestOptions);
        return;
      }
      _isRefreshing = true;
      try {
        final refreshDio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
        final response = await refreshDio.post(
          ApiConstants.refresh,
          options: Options(extra: {'withCredentials': true}),
        );
        final newToken = response.data['accessToken'] as String;
        await _storage.write(StorageKeys.accessToken, newToken);

        // Retry original request
        final retryOptions = err.requestOptions;
        retryOptions.headers['Authorization'] = 'Bearer $newToken';
        final retryResponse = await refreshDio.fetch(retryOptions);
        handler.resolve(retryResponse);

        // Drain queue
        for (final pending in _pendingRequests) {
          pending.headers['Authorization'] = 'Bearer $newToken';
          refreshDio.fetch(pending);
        }
        _pendingRequests.clear();
      } catch (_) {
        await _storage.deleteAll();
        handler.next(err);
      } finally {
        _isRefreshing = false;
      }
    } else {
      handler.next(err);
    }
  }
}
