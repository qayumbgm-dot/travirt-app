import 'package:equatable/equatable.dart';

class Alert extends Equatable {
  const Alert({
    required this.id,
    required this.symbol,
    required this.exchange,
    required this.property,
    required this.operator,
    required this.value,
    required this.type,
    required this.status,
    required this.createdAt,
    this.expiresAt,
  });

  final String id;
  final String symbol;
  final String exchange;
  final String property; // LTP | CHANGE | CHANGE% | VOLUME | HIGH | LOW
  final String operator; // > < >= <= =
  final double value;
  final String type;   // ALERT_ONLY | ATO
  final String status; // ACTIVE | TRIGGERED | CANCELLED
  final DateTime createdAt;
  final DateTime? expiresAt;

  bool get isActive => status == 'ACTIVE';

  @override
  List<Object?> get props =>
      [id, symbol, exchange, property, operator, value, type, status, createdAt, expiresAt];
}
