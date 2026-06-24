import 'package:equatable/equatable.dart';

class MarketSymbol extends Equatable {
  const MarketSymbol({
    required this.token,
    required this.symbol,
    required this.name,
    required this.exchange,
    required this.ltp,
    required this.change,
    required this.changePct,
  });

  final String token;
  final String symbol;
  final String name;
  final String exchange;
  final double ltp;
  final double change;
  final double changePct;

  bool get isUp => change >= 0;

  @override
  List<Object?> get props => [token, symbol];
}
