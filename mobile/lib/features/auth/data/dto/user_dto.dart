import '../../domain/entities/user.dart';

class UserDto {
  const UserDto({
    required this.userId,
    required this.username,
    required this.email,
    required this.role,
    required this.virtualBalance,
    required this.totalPnl,
    required this.createdAt,
    this.avatarUrl,
    this.plan = 'free',
  });

  final String userId;
  final String username;
  final String email;
  final String role;
  final double virtualBalance;
  final double totalPnl;
  final DateTime createdAt;
  final String? avatarUrl;
  final String plan;

  factory UserDto.fromJson(Map<String, dynamic> json) => UserDto(
        userId: json['userId'] as String,
        username: json['username'] as String,
        email: json['email'] as String,
        role: json['role'] as String? ?? 'user',
        virtualBalance: (json['virtualBalance'] as num?)?.toDouble() ?? 0.0,
        totalPnl: (json['totalPnl'] as num?)?.toDouble() ?? 0.0,
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
            DateTime.now(),
        avatarUrl: json['avatarUrl'] as String?,
        plan: json['plan'] as String? ?? 'free',
      );

  User toDomain() => User(
        userId: userId,
        username: username,
        email: email,
        role: role,
        virtualBalance: virtualBalance,
        totalPnl: totalPnl,
        createdAt: createdAt,
        avatarUrl: avatarUrl,
        plan: plan,
      );
}
