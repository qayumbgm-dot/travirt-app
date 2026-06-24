import 'package:equatable/equatable.dart';

enum OrderType { market, limit, slm }
enum OrderSide { buy, sell }
enum OrderStatus { open, executed, cancelled, rejected, pending }
enum ProductType { intraday, delivery, futures, options }

class Order extends Equatable {
  const Order({
    required this.orderId,
    required this.symbol,
    required this.exchange,
    required this.side,
    required this.type,
    required this.product,
    required this.quantity,
    required this.price,
    required this.status,
    required this.createdAt,
    this.executedPrice,
    this.triggerPrice,
  });

  final String orderId;
  final String symbol;
  final String exchange;
  final OrderSide side;
  final OrderType type;
  final ProductType product;
  final int quantity;
  final double price;
  final OrderStatus status;
  final DateTime createdAt;
  final double? executedPrice;
  final double? triggerPrice;

  @override
  List<Object?> get props => [orderId];
}

class Position extends Equatable {
  const Position({
    required this.symbol,
    required this.exchange,
    required this.product,
    required this.quantity,
    required this.avgPrice,
    required this.ltp,
    required this.pnl,
    required this.pnlPct,
  });

  final String symbol;
  final String exchange;
  final ProductType product;
  final int quantity;
  final double avgPrice;
  final double ltp;
  final double pnl;
  final double pnlPct;

  bool get isProfit => pnl >= 0;

  @override
  List<Object?> get props => [symbol, exchange, product];
}
