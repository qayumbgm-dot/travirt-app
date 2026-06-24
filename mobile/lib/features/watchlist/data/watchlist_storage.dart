import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

// Persists a list of {token, symbol, name, exchange} maps locally.
class WatchlistStorage {
  static const _key = 'watchlist_symbols';

  Future<List<Map<String, String>>> loadAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_key) ?? [];
    return raw.map((s) => Map<String, String>.from(
      (jsonDecode(s) as Map).cast<String, String>(),
    )).toList();
  }

  Future<void> add(Map<String, String> item) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_key) ?? [];
    if (list.any((s) => (jsonDecode(s) as Map)['token'] == item['token'])) return;
    list.add(jsonEncode(item));
    await prefs.setStringList(_key, list);
  }

  Future<void> remove(String token) async {
    final prefs = await SharedPreferences.getInstance();
    final list = (prefs.getStringList(_key) ?? [])
        .where((s) => (jsonDecode(s) as Map)['token'] != token)
        .toList();
    await prefs.setStringList(_key, list);
  }

  Future<bool> contains(String token) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_key) ?? [];
    return list.any((s) => (jsonDecode(s) as Map)['token'] == token);
  }
}
