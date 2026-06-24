import 'package:equatable/equatable.dart';

class Holding extends Equatable {
  const Holding({
    required this.symbol,
    required this.exchange,
    required this.quantity,
    required this.avgPrice,
    required this.ltp,
    required this.currentValue,
    required this.investedValue,
    required this.pnl,
    required this.pnlPct,
  });

  final String symbol;
  final String exchange;
  final int quantity;
  final double avgPrice;
  final double ltp;
  final double currentValue;
  final double investedValue;
  final double pnl;
  final double pnlPct;

  bool get isProfit => pnl >= 0;

  @override
  List<Object?> get props => [symbol, exchange];
}
