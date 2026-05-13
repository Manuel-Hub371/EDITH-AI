import 'dart:convert';
import 'package:http/http.dart' as http;

/// EDITH Minimal Intent Service Client
class ApiService {
  static const String _baseUrl = 'http://localhost:8000';

  /// Sends a message to the backend and returns the flattened intent data.
  Future<Map<String, dynamic>> getIntent(String message) async {
    try {
      final resp = await http.post(
        Uri.parse('$_baseUrl/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_input': message,
          'session_id': 'mobile_session_001', // TODO: Use dynamic session IDs
        }),
      ).timeout(const Duration(seconds: 15));

      if (resp.statusCode >= 400) {
        final body = jsonDecode(resp.body);
        throw Exception(body['detail'] ?? 'Failed to detect intent');
      }

      final data = jsonDecode(resp.body) as Map<String, dynamic>;

      // Map the complex backend response to the flat format ChatScreen expects
      final intentData = data['intent'];
      final aiResponse = data['ai_response'];

      String primaryIntent = 'unknown';
      double confidence = 0.0;
      String? subIntent;

      if (intentData != null &&
          intentData['intents'] != null &&
          (intentData['intents'] as List).isNotEmpty) {
        final firstIntent = intentData['intents'][0];
        primaryIntent = firstIntent['primary_intent'] ?? 'unknown';
        confidence = (firstIntent['confidence'] as num?)?.toDouble() ?? 0.0;
        subIntent = firstIntent['sub_intent'];
      }

      return {
        'intent': primaryIntent,
        'confidence': confidence,
        'response': aiResponse != null ? aiResponse['content'] : null,
        'subtype': subIntent,
        'mode': intentData != null && intentData['execution_strategy'] != null
            ? intentData['execution_strategy']['execution_mode']
            : null,
      };
    } catch (e) {
      throw Exception('Connection to EDITH backend failed: $e');
    }
  }

  /// Checks if the backend is online.
  Future<bool> isBackendOnline() async {
    try {
      final resp = await http
          .get(Uri.parse('$_baseUrl/health'))
          .timeout(const Duration(seconds: 3));
      return resp.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
