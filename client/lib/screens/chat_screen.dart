import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../providers/chat_provider.dart';
import '../providers/auth_provider.dart';
import '../utils/constants.dart';
import '../widgets/glass_card.dart';
import 'login_screen.dart';
import 'settings_screen.dart';

class ChatScreen extends StatefulWidget {
  final bool autoStartVoice;

  const ChatScreen({Key? key, this.autoStartVoice = false}) : super(key: key);

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with TickerProviderStateMixin {
  final _controller = TextEditingController();
  final stt.SpeechToText _speech = stt.SpeechToText();
  final FlutterTts _flutterTts = FlutterTts();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  
  bool _isListening = false;
  bool _isOnline = true;
  late StreamSubscription<ConnectivityResult> _connectivitySubscription;
  late AnimationController _waveController;

  String? _editingId;
  final _renameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      setState(() => _isOnline = result != ConnectivityResult.none);
    });

    _waveController = AnimationController(vsync: this, duration: 1.seconds)..repeat();

    Future.microtask(() {
      final chat = Provider.of<ChatProvider>(context, listen: false);
      chat.fetchConversations();
      chat.fetchConversations(archived: true);
      if (widget.autoStartVoice) {
         _listen();
      }
    });
  }

  @override
  void dispose() {
    _connectivitySubscription.cancel();
    _waveController.dispose();
    super.dispose();
  }

  void _listen() async {
    if (!_isListening) {
      if (!_isOnline) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Offline Mode: Limited AI capabilities.")));
        return;
      }
      bool available = await _speech.initialize(
        onStatus: (val) {
             if (val == 'done' || val == 'notListening') {
                 setState(() => _isListening = false);
             }
        },
        onError: (val) => print('onError: $val'),
      );
      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
          onResult: (val) {
             setState(() {
               _controller.text = val.recognizedWords;
               if (val.finalResult) {
                 _sendMessage();
               }
             });
          },
        );
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }
  
  void _speak(String text) async {
    await _flutterTts.setLanguage("en-US");
    await _flutterTts.setPitch(1.0);
    await _flutterTts.setSpeechRate(0.5);
    await _flutterTts.speak(text);
  }

  void _sendMessage() async {
    if (_controller.text.isNotEmpty) {
      final text = _controller.text;
      _controller.clear();
      
      try {
        final chat = Provider.of<ChatProvider>(context, listen: false);
        final response = await chat.sendMessage(text);
        
        // Handle Smart Routing Feedback
        if (response != null && response['intent'] != 'CHAT') {
           ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(
               backgroundColor: AppColors.primary.withOpacity(0.8),
               content: Text(response['message'] ?? "Command understood.", style: TextStyle(color: Colors.black)),
             )
           );
           
           if (response['intent'] == 'NAVIGATION') {
             // Example: "Go to settings"
             Navigator.push(context, MaterialPageRoute(builder: (_) => SettingsScreen()));
           }
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Action failed: $e")));
      }
    }
  }

  void _confirmDelete(String id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text("DELETE CHAT", style: GoogleFonts.outfit(color: AppColors.accent, fontWeight: FontWeight.bold)),
        content: Text("Are you sure you want to permanently delete this conversation?", style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text("CANCEL", style: TextStyle(color: Colors.white38))),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await Provider.of<ChatProvider>(context, listen: false).deleteConversation(id);
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Failed to delete conversation")));
              }
            }, 
            child: Text("DELETE", style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold))
          ),
        ],
      ),
    );
  }

  void _showRenameDialog(Conversation conv) {
    _renameController.text = conv.title;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text("RENAME CHAT", style: GoogleFonts.outfit(color: AppColors.primary, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: _renameController,
          autofocus: true,
          style: TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: "Enter new title...",
            hintStyle: TextStyle(color: Colors.white24),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text("CANCEL", style: TextStyle(color: Colors.white38))),
          TextButton(
            onPressed: () async {
              final newTitle = _renameController.text.trim();
              if (newTitle.isNotEmpty) {
                Navigator.pop(ctx);
                await Provider.of<ChatProvider>(context, listen: false).renameConversation(conv.id, newTitle);
              }
            }, 
            child: Text("SAVE", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold))
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(
          icon: Icon(Icons.menu_rounded, color: AppColors.primary),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('EDITH', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, letterSpacing: 4, color: AppColors.primary)),
            SizedBox(width: 8),
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _isOnline ? Colors.cyanAccent : Colors.white24,
                boxShadow: [if (_isOnline) BoxShadow(color: Colors.cyanAccent, blurRadius: 4)],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.add_comment_rounded, color: Colors.white70),
            onPressed: () => Provider.of<ChatProvider>(context, listen: false).startNewChat(),
          ),
          SizedBox(width: 8),
        ],
      ),
      drawer: _buildDrawer(),
      body: Column(
        children: [
          Expanded(
            child: Consumer<ChatProvider>(
              builder: (ctx, chat, _) {
                if (chat.isLoading && chat.messages.isEmpty) {
                  return Center(child: CircularProgressIndicator(color: AppColors.primary));
                }
                
                if (chat.messages.isEmpty) {
                  return _buildEmptyState();
                }

                return ListView.builder(
                  padding: EdgeInsets.all(20),
                  reverse: false, // We display from start to end
                  itemCount: chat.messages.length,
                  itemBuilder: (ctx, i) {
                    final msg = chat.messages[i];
                    final isUser = msg.role == 'user';
                    return _buildMessageBubble(msg.content, isUser);
                  },
                );
              },
            ),
          ),
          
          if (Provider.of<ChatProvider>(context).isLoading)
             _buildTypingIndicator(),
          
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.blur_on, size: 80, color: AppColors.primary.withOpacity(0.1)),
          SizedBox(height: 20),
          Text(
            "START A NEW CONVERSATION",
            style: GoogleFonts.outfit(color: Colors.white24, letterSpacing: 2, fontWeight: FontWeight.bold),
          ),
          Text(
            "WITH EDITH",
            style: GoogleFonts.outfit(color: Colors.white10, letterSpacing: 4),
          ),
        ],
      ).animate().fadeIn(duration: 800.ms),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      backgroundColor: AppColors.background,
      child: Column(
        children: [
          DrawerHeader(
            decoration: BoxDecoration(color: AppColors.surface.withOpacity(0.5)),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.blur_on, size: 40, color: AppColors.primary),
                  SizedBox(height: 10),
                  Text("CONVERSATIONS", style: GoogleFonts.outfit(color: Colors.white, letterSpacing: 2, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
          Expanded(
            child: Consumer<ChatProvider>(
              builder: (ctx, chat, _) {
                return ListView(
                  padding: EdgeInsets.symmetric(horizontal: 10),
                  children: [
                    if (chat.conversations.isNotEmpty) ...[
                      _buildDrawerSection("ACTIVE"),
                      ...chat.conversations.map((conv) => _buildConversationTile(conv, chat)),
                    ],
                    if (chat.archivedConversations.isNotEmpty) ...[
                      SizedBox(height: 20),
                      _buildDrawerSection("ARCHIVED"),
                      ...chat.archivedConversations.map((conv) => _buildConversationTile(conv, chat)),
                    ],
                    if (chat.conversations.isEmpty && chat.archivedConversations.isEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 40),
                        child: Center(child: Text("No history found", style: TextStyle(color: Colors.white24))),
                      ),
                  ],
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: GlassCard(
              padding: EdgeInsets.zero,
              borderRadius: 20,
              child: ListTile(
                leading: Icon(Icons.settings_rounded, color: Colors.white70),
                title: Text("SETTINGS", style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => SettingsScreen()));
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerSection(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 12, top: 10, bottom: 8),
      child: Text(title, style: GoogleFonts.outfit(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 2)),
    );
  }

  Widget _buildConversationTile(Conversation conv, ChatProvider chat) {
    final isActive = conv.id == chat.activeConversationId;
    return Container(
      margin: EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: isActive ? AppColors.primary.withOpacity(0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        onTap: () {
          chat.loadConversation(conv.id);
          Navigator.pop(context);
        },
        title: Text(
          conv.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.poppins(color: Colors.white, fontSize: 13, fontWeight: isActive ? FontWeight.w600 : FontWeight.w400),
        ),
        subtitle: Text(
          conv.lastMessage,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: Colors.white38, fontSize: 11),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: Icon(Icons.edit_outlined, size: 16, color: Colors.white24),
              onPressed: () => _showRenameDialog(conv),
              visualDensity: VisualDensity.compact,
            ),
            PopupMenuButton<String>(
              icon: Icon(Icons.more_vert_rounded, size: 18, color: Colors.white24),
              color: AppColors.surface,
              onSelected: (val) {
                if (val == 'archive') {
                  chat.archiveConversation(conv.id);
                } else if (val == 'unarchive') {
                  chat.unarchiveConversation(conv.id);
                } else if (val == 'delete') {
                  _confirmDelete(conv.id);
                }
              },
              itemBuilder: (ctx) => [
                if (!conv.isArchived)
                  PopupMenuItem(value: 'archive', child: Text("Archive", style: TextStyle(color: Colors.white70))),
                if (conv.isArchived)
                  PopupMenuItem(value: 'unarchive', child: Text("Restore", style: TextStyle(color: Colors.white70))),
                PopupMenuItem(value: 'delete', child: Text("Delete Permanently", style: TextStyle(color: AppColors.accent))),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn();
  }

  Widget _buildMessageBubble(String content, bool isUser) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.symmetric(vertical: 8),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: isUser ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(24).copyWith(
            bottomRight: isUser ? Radius.zero : null,
            bottomLeft: !isUser ? Radius.zero : null,
          ),
          boxShadow: [
            if (isUser) BoxShadow(color: AppColors.primary.withOpacity(0.2), blurRadius: 10, offset: Offset(0, 4))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            isUser 
              ? Text(
                  content,
                  style: GoogleFonts.poppins(
                    color: Colors.black87,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                )
              : TypewriterText(
                  text: content,
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w400,
                  ),
                ),
            if (!isUser)
              GestureDetector(
                onTap: () => _speak(content),
                child: Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Icon(Icons.volume_up_rounded, size: 16, color: Colors.white38),
                ),
              ),
          ],
        ),
      ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0),
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.surface.withOpacity(0.5),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white10),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text("TRANSCEIVING", style: GoogleFonts.outfit(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
              SizedBox(width: 8),
              ...List.generate(3, (index) => 
                Container(
                  margin: EdgeInsets.symmetric(horizontal: 2),
                  width: 4,
                  height: 4,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.primary),
                ).animate(onPlay: (c) => c.repeat()).scale(
                  begin: const Offset(1, 1), 
                  end: const Offset(1.5, 1.5), 
                  delay: (index * 200).ms, 
                  duration: 600.ms
                )
              ),
            ],
          ),
        ),
      ),
    );
  }
  Widget _buildInputArea() {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 10, 20, 30),
      decoration: BoxDecoration(
        color: AppColors.background,
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
      ),
      child: Row(
        children: [
          _buildVoiceButton(),
          SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: _controller,
              style: GoogleFonts.poppins(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Type message...',
                hintStyle: TextStyle(color: Colors.white38),
                fillColor: AppColors.surface,
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          SizedBox(width: 12),
          _buildCircleIconButton(
            icon: Icons.send_rounded,
            color: AppColors.primary,
            onTap: _sendMessage,
          ),
        ],
      ),
    );
  }

  Widget _buildCircleIconButton({required IconData icon, required Color color, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          shape: BoxShape.circle,
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Icon(icon, color: color, size: 24),
      ),
    );
  }

  Widget _buildVoiceButton() {
    return GestureDetector(
      onTap: _listen,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (_isListening)
            Container(
              width: 48,
              height: 48,
              child: AnimatedBuilder(
                animation: _waveController,
                builder: (context, child) {
                  return CustomPaint(
                    painter: WaveformPainter(
                      progress: _waveController.value,
                      color: AppColors.primary,
                    ),
                  );
                },
              ),
            ),
          _buildCircleIconButton(
            icon: _isListening ? Icons.stop_rounded : Icons.mic_rounded,
            color: _isListening ? Colors.redAccent : AppColors.primary,
            onTap: _listen,
          ),
        ],
      ),
    );
  }
}

class TypewriterText extends StatefulWidget {
  final String text;
  final TextStyle style;

  TypewriterText({required this.text, required this.style});

  @override
  _TypewriterTextState createState() => _TypewriterTextState();
}

class _TypewriterTextState extends State<TypewriterText> {
  String _displayedText = "";
  int _charIndex = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startAnimation();
  }

  @override
  void didUpdateWidget(TypewriterText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) {
      _startAnimation();
    }
  }

  void _startAnimation() {
    _displayedText = "";
    _charIndex = 0;
    _timer?.cancel();
    _timer = Timer.periodic(Duration(milliseconds: 15), (timer) {
      if (_charIndex < widget.text.length) {
        setState(() {
          _displayedText += widget.text[_charIndex];
          _charIndex++;
        });
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(_displayedText, style: widget.style);
  }
}

class WaveformPainter extends CustomPainter {
  final double progress;
  final Color color;

  WaveformPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final center = Offset(size.width / 2, size.height / 2);
    for (var i = 1; i <= 3; i++) {
      final radius = (size.width / 2) * ((progress + (i / 3)) % 1);
      canvas.drawCircle(center, radius, paint..color = color.withOpacity(0.3 * (1 - (radius / (size.width / 2)))));
    }
  }

  @override
  bool shouldRepaint(WaveformPainter oldDelegate) => true;
}
