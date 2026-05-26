import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/message.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_header.dart';
import '../widgets/message_bubble.dart';
import '../widgets/message_input.dart';
// unused_import removed

class ChatScreen extends StatefulWidget {
  final String? chatTitle;
  const ChatScreen({super.key, this.chatTitle});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _inputCtrl = TextEditingController();
  final _inputFocus = FocusNode();
  final _scrollCtrl = ScrollController();
  final _api = ApiService();

  bool _isWaiting = false;
  bool _showTyping = false;
  bool _backendOnline = false;

  bool _isRecording = false;

  final List<ChatMessage> _messages = [];

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));
    _checkHealth();
  }

  Future<void> _checkHealth() async {
    final online = await _api.isBackendOnline();
    if (mounted) setState(() => _backendOnline = online);
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || _isWaiting) return;

    setState(() {
      _messages.add(ChatMessage(
        id: UniqueKey().toString(),
        content: text,
        sender: MessageSender.user,
      ));
      _isWaiting = true;
      _showTyping = true;
    });
    _inputCtrl.clear();
    _scrollDown();

    try {
      final result = await _api.getIntent(text);
      final intent = result['intent'] as String;
      final confidence = result['confidence'] as double;
      final responseText = result['response'] as String?;
      
      // Toggle to true if you want to see debug diagnostics in the UI
      const bool DEBUG_MODE = false;

      if (mounted) {
        setState(() {
          _showTyping = false;
          
          String displayContent = "";
          
          if (intent == 'chat' && responseText != null && responseText.isNotEmpty) {
             displayContent = responseText;
          } else {
             // For task, analytical, memory_store, etc. or if response is empty
             if (responseText != null && responseText.isNotEmpty) {
                 displayContent = responseText;
             } else {
                 displayContent = "Detected Intent: $intent\nConfidence: ${(confidence * 100).toStringAsFixed(1)}%";
             }
          }

          _messages.add(ChatMessage(
            id: UniqueKey().toString(),
            content: displayContent,
            sender: MessageSender.ai,
          ));
          _isWaiting = false;
        });
        _scrollDown();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _showTyping = false;
          _isWaiting = false;
        });
        _showError('Error: $e');
      }
    }
  }

  void _scrollDown() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppHeader(
        title: widget.chatTitle ?? 'EDITH',
        onMoreTap: () => setState(() => _messages.clear()),
      ),
      body: Column(
        children: [
          if (!_backendOnline)
            Container(
              color: Colors.red.shade50,
              padding: const EdgeInsets.all(8),
              child: const Row(
                children: [
                  Icon(Icons.warning, color: Colors.red, size: 16),
                  SizedBox(width: 8),
                  Text('Backend offline',
                      style: TextStyle(color: Colors.red, fontSize: 12)),
                ],
              ),
            ),
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_showTyping ? 1 : 0),
              itemBuilder: (_, i) {
                if (_showTyping && i == _messages.length) {
                  return const Text("Analyzing intent...",
                      style: TextStyle(color: Colors.grey, fontSize: 12));
                }
                return MessageBubble(message: _messages[i]);
              },
            ),
          ),
          MessageInput(
            controller: _inputCtrl,
            focusNode: _inputFocus,
            isWaiting: _isWaiting,
            isRecording: _isRecording,
            onSend: _send,
            onMicTap: () => setState(() => _isRecording = !_isRecording),
            onImageTap: () {},
            onFileTap: () {},
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _inputFocus.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }
}
