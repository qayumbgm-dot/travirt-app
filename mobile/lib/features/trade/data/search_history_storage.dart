import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class SearchHistoryStorage {
  static const _key = 'search_history';
  static const _maxItems = 10;

  Future<List<String>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return [];
    return List<String>.from(jsonDecode(raw) as List);
  }

  Future<void> add(String query) async {
    if (query.trim().length < 2) return;
    final prefs = await SharedPreferences.getInstance();
    final items = await load();
    items.remove(query);
    items.insert(0, query);
    final trimmed = items.take(_maxItems).toList();
    await prefs.setString(_key, jsonEncode(trimmed));
  }

  Future<void> remove(String query) async {
    final prefs = await SharedPreferences.getInstance();
    final items = await load();
    items.remove(query);
    await prefs.setString(_key, jsonEncode(items));
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
