// ignore: unused_import
import 'package:flutter/foundation.dart';

enum MessageType { text, image, file }

enum MessageSender { user, ai }

class ChatMessage {
  final String id;
  final String content;
  final MessageSender sender;
  final MessageType type;
  final DateTime timestamp;
  final String? fileName;

  ChatMessage({
    required this.id,
    required this.content,
    required this.sender,
    this.type = MessageType.text,
    DateTime? timestamp,
    this.fileName,
  }) : timestamp = timestamp ?? DateTime.now();

  String get formattedTime {
    final h = timestamp.hour % 12 == 0 ? 12 : timestamp.hour % 12;
    final m = timestamp.minute.toString().padLeft(2, '0');
    final ampm = timestamp.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }
}

class ChatSession {
  final String id;
  final String title;
  final String icon;
  final List<ChatMessage> messages;
  final DateTime lastUpdated;

  ChatSession({
    required this.id,
    required this.title,
    required this.icon,
    List<ChatMessage>? messages,
    DateTime? lastUpdated,
  })  : messages = messages ?? [],
        lastUpdated = lastUpdated ?? DateTime.now();
}
