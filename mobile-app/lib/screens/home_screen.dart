import 'package:flutter/material.dart';
import 'chat_screen.dart';

/// HomeScreen — single chat, no sidebar, no drawer.
/// Mobile-only: just wraps ChatScreen directly.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ChatScreen();
  }
}
