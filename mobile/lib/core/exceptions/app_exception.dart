sealed class AppException implements Exception {
  const AppException(this.message);
  final String message;

  @override
  String toString() => message;
}

final class NetworkException extends AppException {
  const NetworkException([super.message = 'Network error. Check your connection.']);
}

final class TimeoutException extends AppException {
  const TimeoutException([super.message = 'Request timed out. Try again.']);
}

final class UnauthorizedException extends AppException {
  const UnauthorizedException([super.message = 'Session expired. Please login again.']);
}

final class ForbiddenException extends AppException {
  const ForbiddenException([super.message = 'Access denied.']);
}

final class NotFoundException extends AppException {
  const NotFoundException([super.message = 'Resource not found.']);
  NotFoundException.withMessage(String msg) : super(msg);
}

final class ServerException extends AppException {
  const ServerException([super.message = 'Server error. Please try again later.']);
}

final class ValidationException extends AppException {
  const ValidationException(super.message);
}

final class CacheException extends AppException {
  const CacheException([super.message = 'Local storage error.']);
}

final class UnknownException extends AppException {
  const UnknownException([super.message = 'An unexpected error occurred.']);
}
