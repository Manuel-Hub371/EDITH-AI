import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ChatMessage {
  final String content;
  final String role; // 'user' or 'assistant'
  final DateTime timestamp;

  ChatMessage({required this.content, required this.role, required this.timestamp});

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      content: json['content'],
      role: json['role'],
      timestamp: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
    );
  }
}

class Conversation {
  final String id;
  final String title;
  final String lastMessage;
  final DateTime updatedAt;
  final bool isArchived;

  Conversation({
    required this.id,
    required this.title,
    required this.lastMessage,
    required this.updatedAt,
    required this.isArchived,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['_id'],
      title: json['title'] ?? 'New Chat',
      lastMessage: json['lastMessage'] ?? '',
      updatedAt: DateTime.parse(json['updatedAt']),
      isArchived: json['isArchived'] ?? false,
    );
  }
}

class ChatProvider with ChangeNotifier {
  List<ChatMessage> _messages = [];
  List<Conversation> _conversations = [];
  List<Conversation> _archivedConversations = [];
  String? _activeConversationId;
  bool _isLoading = false;

  List<ChatMessage> get messages => _messages;
  List<Conversation> get conversations => _conversations;
  List<Conversation> get archivedConversations => _archivedConversations;
  String? get activeConversationId => _activeConversationId;
  bool get isLoading => _isLoading;

  Future<void> fetchConversations({bool archived = false}) async {
    try {
      final List<dynamic> data = await ApiService.get('/chat/conversations?archived=$archived');
      final list = data.map((json) => Conversation.fromJson(json)).toList();
      if (archived) {
        _archivedConversations = list;
      } else {
        _conversations = list;
      }
      notifyListeners();
    } catch (e) {
      print("Error fetching conversations: $e");
    }
  }

  Future<void> loadConversation(String conversationId) async {
    _activeConversationId = conversationId;
    _isLoading = true;
    _messages.clear();
    notifyListeners();

    try {
      final List<dynamic> data = await ApiService.get('/chat/$conversationId');
      _messages = data.map((json) => ChatMessage.fromJson(json)).toList();
    } catch (e) {
      print("Error loading conversation: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> startNewChat() async {
    _activeConversationId = null;
    _messages.clear();
    notifyListeners();
  }

  Future<Map<String, dynamic>?> sendMessage(String text) async {
    if (text.trim().isEmpty) return null;

    // Optimistic UI update
    final tempMessage = ChatMessage(content: text, role: 'user', timestamp: DateTime.now());
    _messages.add(tempMessage);
    _isLoading = true;
    notifyListeners();

    try {
      final data = await ApiService.post('/chat', {
        'message': text,
        if (_activeConversationId != null) 'conversationId': _activeConversationId,
      });
      
      _activeConversationId = data['conversationId'];
      
      _messages.removeLast(); // Remove temp
      _messages.add(ChatMessage.fromJson(data['userMessage']));
      _messages.add(ChatMessage.fromJson(data['aiMessage']));
      
      // Refresh conversations list to update titles/last messages
      await fetchConversations();
      
      return data;
    } catch (e) {
      print("Error sending message: $e");
      _messages.removeLast(); // Remove temp on failure
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> renameConversation(String id, String newTitle) async {
    try {
      await ApiService.patch('/chat/conversations/$id/rename', {'title': newTitle});
      await fetchConversations();
      await fetchConversations(archived: true);
    } catch (e) {
      print("Error renaming conversation: $e");
      rethrow;
    }
  }

  Future<void> archiveConversation(String id) async {
    try {
      await ApiService.patch('/chat/conversations/$id/archive', {});
      await fetchConversations();
      await fetchConversations(archived: true);
      if (_activeConversationId == id) startNewChat();
    } catch (e) {
      print("Error archiving conversation: $e");
    }
  }

  Future<void> unarchiveConversation(String id) async {
    try {
      await ApiService.patch('/chat/conversations/$id/unarchive', {});
      await fetchConversations();
      await fetchConversations(archived: true);
    } catch (e) {
      print("Error unarchiving conversation: $e");
    }
  }

  Future<void> deleteConversation(String id) async {
    try {
      await ApiService.delete('/chat/conversations/$id');
      _conversations.removeWhere((c) => c.id == id);
      _archivedConversations.removeWhere((c) => c.id == id);
      
      if (_activeConversationId == id) {
        startNewChat();
      } else {
        notifyListeners();
      }
    } catch (e) {
      print("Error deleting conversation: $e");
      rethrow;
    }
  }
}
