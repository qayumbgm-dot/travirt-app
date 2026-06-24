import 'package:equatable/equatable.dart';

class User extends Equatable {
  const User({
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

  bool get isAdmin => role == 'admin' || role == 'super_admin';
  bool get isPro   => plan == 'pro' || plan == 'elite';
  bool get isElite => plan == 'elite';

  User copyWith({
    double? virtualBalance,
    double? totalPnl,
    String? plan,
    String? avatarUrl,
  }) =>
      User(
        userId: userId,
        username: username,
        email: email,
        role: role,
        virtualBalance: virtualBalance ?? this.virtualBalance,
        totalPnl: totalPnl ?? this.totalPnl,
        createdAt: createdAt,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        plan: plan ?? this.plan,
      );

  @override
  List<Object?> get props => [userId, username, email, role, plan];
}
