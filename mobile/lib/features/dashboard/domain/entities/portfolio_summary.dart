import 'package:equatable/equatable.dart';

class PortfolioSummary extends Equatable {
  const PortfolioSummary({
    required this.totalValue,
    required this.virtualBalance,
    required this.invested,
    required this.totalPnl,
    required this.dayPnl,
    required this.totalPnlPct,
    required this.dayPnlPct,
    required this.holdingsCount,
    required this.winRate,
    required this.marketMode,
  });

  final double totalValue;
  final double virtualBalance;
  final double invested;
  final double totalPnl;
  final double dayPnl;
  final double totalPnlPct;
  final double dayPnlPct;
  final int holdingsCount;
  final double winRate;
  final String marketMode; // 'LIVE' | 'SIMULATION'

  bool get isProfit => totalPnl >= 0;
  bool get isDayProfit => dayPnl >= 0;
  bool get isLive => marketMode == 'LIVE';

  @override
  List<Object?> get props => [totalValue, totalPnl, dayPnl, marketMode];
}

class IndexQuote extends Equatable {
  const IndexQuote({
    required this.name,
    required this.value,
    required this.change,
    required this.changePct,
  });

  final String name;
  final double value;
  final double change;
  final double changePct;

  bool get isUp => change >= 0;

  @override
  List<Object?> get props => [name, value];
}
