import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../models/message.dart';
import '../theme/app_theme.dart';
import 'robot_logo.dart';

/// A single chat message row — user or AI.
class MessageBubble extends StatelessWidget {
  final ChatMessage message;

  const MessageBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.sender == MessageSender.user;
    return Padding(
      padding: EdgeInsets.only(
        top: 4,
        bottom: 4,
        left: isUser ? 48 : 0,
        right: isUser ? 0 : 48,
      ),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            _AiAvatar(),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                _BubbleBody(message: message, isUser: isUser),
                const SizedBox(height: 3),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Text(
                    message.formattedTime,
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.text4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            _UserAvatar(),
          ],
        ],
      ),
    );
  }
}

class _BubbleBody extends StatelessWidget {
  final ChatMessage message;
  final bool isUser;

  const _BubbleBody({required this.message, required this.isUser});

  @override
  Widget build(BuildContext context) {
    final isFile = message.type != MessageType.text;

    return Container(
      decoration: BoxDecoration(
        color: isUser ? AppColors.userBubble : AppColors.aiBubble,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(18),
          topRight: const Radius.circular(18),
          bottomLeft: Radius.circular(isUser ? 18 : 4),
          bottomRight: Radius.circular(isUser ? 4 : 18),
        ),
        boxShadow: [
          BoxShadow(
            color: isUser
                ? AppColors.blue.withOpacity(0.18)
                : Colors.black.withOpacity(0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: isFile
          ? _FileContent(message: message, isUser: isUser)
          : Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 10,
              ),
              child: isUser
                  ? Text(
                      message.content,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.5,
                        color: AppColors.userBubbleText,
                      ),
                    )
                  : MarkdownBody(
                      data: message.content,
                      styleSheet: MarkdownStyleSheet(
                        p: const TextStyle(
                          fontSize: 15,
                          height: 1.5,
                          color: AppColors.aiBubbleText,
                        ),
                        h1: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.blue,
                        ),
                        h2: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.blue,
                        ),
                        listBullet: const TextStyle(
                          fontSize: 15,
                          color: AppColors.aiBubbleText,
                        ),
                      ),
                    ),
            ),
    );
  }
}

class _FileContent extends StatelessWidget {
  final ChatMessage message;
  final bool isUser;

  const _FileContent({required this.message, required this.isUser});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            message.type == MessageType.image
                ? Icons.image_outlined
                : Icons.attach_file_rounded,
            size: 18,
            color: isUser ? Colors.white70 : AppColors.text3,
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              message.fileName ?? message.content,
              style: TextStyle(
                fontSize: 14,
                color: isUser ? Colors.white : AppColors.text2,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _AiAvatar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // Option 6 has its own dark circle background — no wrapper needed
    return const RobotLogo(size: 30, showBackground: false);
  }
}

class _UserAvatar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 30,
      height: 30,
      decoration: const BoxDecoration(
        color: AppColors.blueLight,
        shape: BoxShape.circle,
      ),
      child: const Center(
        child: Text(
          'U',
          style: TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

// ── Typing indicator ──────────────────────────────────────────

class TypingIndicator extends StatefulWidget {
  const TypingIndicator({super.key});

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with TickerProviderStateMixin {
  late final List<AnimationController> _ctrls;
  late final List<Animation<double>> _anims;

  @override
  void initState() {
    super.initState();
    _ctrls = List.generate(
      3,
      (_) => AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 500),
      ),
    );
    _anims = List.generate(3, (i) {
      Future.delayed(Duration(milliseconds: i * 130), () {
        if (mounted) _ctrls[i].repeat(reverse: true);
      });
      return Tween<double>(begin: 0, end: -5).animate(
        CurvedAnimation(parent: _ctrls[i], curve: Curves.easeInOut),
      );
    });
  }

  @override
  void dispose() {
    for (final c in _ctrls) c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 4, right: 48),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          _AiAvatar(),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            decoration: BoxDecoration(
              color: AppColors.aiBubble,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(18),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) {
                return AnimatedBuilder(
                  animation: _anims[i],
                  builder: (_, __) => Transform.translate(
                    offset: Offset(0, _anims[i].value),
                    child: Container(
                      width: 7,
                      height: 7,
                      margin: EdgeInsets.only(right: i < 2 ? 5 : 0),
                      decoration: BoxDecoration(
                        color: Color.lerp(
                          AppColors.text4,
                          AppColors.blueXLight,
                          (_anims[i].value.abs() / 5).clamp(0, 1),
                        ),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
