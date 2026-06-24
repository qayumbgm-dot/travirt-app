import '../exceptions/app_exception.dart';

/// Functional result type — eliminates try/catch at call sites.
sealed class Result<T> {
  const Result();

  bool get isSuccess => this is Success<T>;
  bool get isFailure => this is Failure<T>;

  T get data => (this as Success<T>).value;
  AppException get error => (this as Failure<T>).exception;

  R when<R>({
    required R Function(T value) success,
    required R Function(AppException exception) failure,
  }) {
    return switch (this) {
      Success(:final value)       => success(value),
      Failure(:final exception)   => failure(exception),
    };
  }

  Result<R> map<R>(R Function(T value) transform) {
    return switch (this) {
      Success(:final value)       => Success(transform(value)),
      Failure(:final exception)   => Failure(exception),
    };
  }
}

final class Success<T> extends Result<T> {
  const Success(this.value);
  final T value;
}

final class Failure<T> extends Result<T> {
  const Failure(this.exception);
  final AppException exception;
}
