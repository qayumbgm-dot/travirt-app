import 'package:dio/dio.dart';
import '../../exceptions/app_exception.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final appException = _map(err);
    handler.next(
      err.copyWith(error: appException, message: appException.message),
    );
  }

  AppException _map(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const TimeoutException();
      case DioExceptionType.connectionError:
        return const NetworkException();
      case DioExceptionType.badResponse:
        return _fromStatus(e.response?.statusCode, e.response?.data);
      default:
        return const UnknownException();
    }
  }

  AppException _fromStatus(int? status, dynamic data) {
    final msg = _extractMessage(data);
    return switch (status) {
      400 => ValidationException(msg ?? 'Invalid request.'),
      401 => const UnauthorizedException(),
      403 => const ForbiddenException(),
      404 => NotFoundException(msg ?? 'Not found.'),
      >= 500 => ServerException(msg ?? 'Server error.'),
      _ => UnknownException(msg ?? 'Unexpected error.'),
    };
  }

  String? _extractMessage(dynamic data) {
    if (data is Map) return data['message'] as String?;
    return null;
  }
}
