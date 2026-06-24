import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../dto/user_dto.dart';

abstract interface class AuthRemoteDataSource {
  Future<Map<String, dynamic>> login(String identifier, String password);
  Future<UserDto> signup({required String username, required String email, required String password});
  Future<Map<String, dynamic>> verifyTfa(String tempToken, String code);
  Future<UserDto> restoreSession();
  Future<void> logout();
  Future<void> forgotPassword(String email);
  Future<void> resetPassword({required String token, required String newPassword});
  Future<void> changePassword({required String currentPassword, required String newPassword});
  Future<UserDto> getProfile();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  const AuthRemoteDataSourceImpl(this._client);
  final ApiClient _client;

  @override
  Future<Map<String, dynamic>> login(String identifier, String password) async {
    final res = await _client.post(ApiConstants.login, data: {
      'identifier': identifier,
      'password': password,
    });
    return res.data as Map<String, dynamic>;
  }

  @override
  Future<UserDto> signup({
    required String username,
    required String email,
    required String password,
  }) async {
    final res = await _client.post(ApiConstants.signup, data: {
      'username': username,
      'email': email,
      'password': password,
    });
    final data = res.data as Map<String, dynamic>;
    return UserDto.fromJson(data['user'] as Map<String, dynamic>);
  }

  @override
  Future<Map<String, dynamic>> verifyTfa(String tempToken, String code) async {
    final res = await _client.post(ApiConstants.verifyTfa, data: {
      'tempToken': tempToken,
      'code': code,
    });
    return res.data as Map<String, dynamic>;
  }

  @override
  Future<UserDto> restoreSession() async {
    final res = await _client.post(ApiConstants.refresh);
    final data = res.data as Map<String, dynamic>;
    return UserDto.fromJson(data['user'] as Map<String, dynamic>);
  }

  @override
  Future<void> logout() => _client.post(ApiConstants.logout);

  @override
  Future<void> forgotPassword(String email) => _client.post(
        ApiConstants.forgotPw,
        data: {'email': email},
      );

  @override
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) =>
      _client.post(ApiConstants.resetPw, data: {
        'token': token,
        'newPassword': newPassword,
      });

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) =>
      _client.post(ApiConstants.changePassword, data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });

  @override
  Future<UserDto> getProfile() async {
    final res = await _client.get(ApiConstants.profile);
    return UserDto.fromJson(res.data as Map<String, dynamic>);
  }
}
