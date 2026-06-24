import 'package:dio/dio.dart';
import '../../../../core/exceptions/app_exception.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../core/utils/result.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../dto/user_dto.dart';

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required SecureStorage secureStorage,
  })  : _remote = remoteDataSource,
        _storage = secureStorage;

  final AuthRemoteDataSource _remote;
  final SecureStorage _storage;

  @override
  Future<Result<({User user, bool requires2FA, String? tempToken})>> login(
    String identifier,
    String password,
  ) async {
    try {
      final data = await _remote.login(identifier, password);
      final requires2FA = data['requires2FA'] as bool? ?? false;
      if (requires2FA) {
        return Success((
          user: User(
            userId: '',
            username: identifier,
            email: '',
            role: 'user',
            virtualBalance: 0,
            totalPnl: 0,
            createdAt: DateTime.now(),
          ),
          requires2FA: true,
          tempToken: data['tempToken'] as String?,
        ));
      }
      final user = UserDto.fromJson(data['user'] as Map<String, dynamic>).toDomain();
      await _persistSession(data['accessToken'] as String?, user);
      return Success((user: user, requires2FA: false, tempToken: null));
    } on DioException catch (e) {
      return Failure(e.error is AppException
          ? e.error as AppException
          : UnknownException(e.message ?? 'Login failed.'));
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<User>> signup({
    required String username,
    required String email,
    required String password,
  }) async {
    try {
      final dto = await _remote.signup(
        username: username,
        email: email,
        password: password,
      );
      return Success(dto.toDomain());
    } on DioException catch (e) {
      return Failure(e.error is AppException
          ? e.error as AppException
          : UnknownException(e.message ?? 'Signup failed.'));
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<User>> verifyTfa(String tempToken, String code) async {
    try {
      final data = await _remote.verifyTfa(tempToken, code);
      final user = UserDto.fromJson(data['user'] as Map<String, dynamic>).toDomain();
      await _persistSession(data['accessToken'] as String?, user);
      return Success(user);
    } on DioException catch (e) {
      return Failure(e.error is AppException
          ? e.error as AppException
          : const UnauthorizedException('Invalid 2FA code.'));
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<User>> restoreSession() async {
    try {
      final dto = await _remote.restoreSession();
      final user = dto.toDomain();
      await _storage.write(StorageKeys.userId, user.userId);
      await _storage.write(StorageKeys.username, user.username);
      return Success(user);
    } on DioException catch (e) {
      return Failure(e.error is AppException
          ? e.error as AppException
          : const UnauthorizedException());
    } catch (_) {
      return const Failure(UnauthorizedException());
    }
  }

  @override
  Future<Result<void>> logout() async {
    try {
      await _remote.logout();
    } catch (_) {}
    await _storage.deleteAll();
    return const Success(null);
  }

  @override
  Future<Result<void>> forgotPassword(String email) async {
    try {
      await _remote.forgotPassword(email);
      return const Success(null);
    } on DioException catch (e) {
      return Failure(e.error is AppException
          ? e.error as AppException
          : const UnknownException());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<void>> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      await _remote.resetPassword(token: token, newPassword: newPassword);
      return const Success(null);
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<void>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _remote.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      return const Success(null);
    } on DioException catch (e) {
      return Failure(e.error is AppException
          ? e.error as AppException
          : const UnknownException());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  @override
  Future<Result<User>> getProfile() async {
    try {
      final dto = await _remote.getProfile();
      return Success(dto.toDomain());
    } catch (_) {
      return const Failure(UnknownException());
    }
  }

  Future<void> _persistSession(String? token, User user) async {
    if (token != null) {
      await _storage.write(StorageKeys.accessToken, token);
    }
    await _storage.write(StorageKeys.userId, user.userId);
    await _storage.write(StorageKeys.username, user.username);
    await _storage.write(StorageKeys.userRole, user.role);
  }
}
