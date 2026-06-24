import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../features/trade/domain/entities/order.dart';

final csvExportServiceProvider = Provider<CsvExportService>((_) => CsvExportService());

class CsvExportService {
  Future<void> exportOrders(List<Order> orders) async {
    final buf = StringBuffer();
    buf.writeln('Order ID,Symbol,Exchange,Side,Type,Product,Quantity,Price,Executed Price,Status,Date');

    final fmt = DateFormat('yyyy-MM-dd HH:mm:ss');
    for (final o in orders) {
      buf.writeln([
        _esc(o.orderId),
        _esc(o.symbol),
        _esc(o.exchange),
        o.side.name,
        o.type.name,
        o.product.name,
        o.quantity,
        o.price.toStringAsFixed(2),
        o.executedPrice?.toStringAsFixed(2) ?? '',
        o.status.name,
        fmt.format(o.createdAt),
      ].join(','));
    }

    final dir = await getTemporaryDirectory();
    final ts  = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
    final file = File('${dir.path}/travirt_orders_$ts.csv');
    await file.writeAsString(buf.toString());

    await Share.shareXFiles(
      [XFile(file.path, mimeType: 'text/csv')],
      subject: 'TraVirt Orders Export – $ts',
    );
  }

  String _esc(String v) => v.contains(',') ? '"$v"' : v;
}
