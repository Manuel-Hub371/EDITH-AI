import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class MessageInput extends StatefulWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool isWaiting;
  final bool isRecording;
  final VoidCallback onSend;
  final VoidCallback onMicTap;
  final VoidCallback onImageTap;
  final VoidCallback onFileTap;

  const MessageInput({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.isWaiting,
    required this.isRecording,
    required this.onSend,
    required this.onMicTap,
    required this.onImageTap,
    required this.onFileTap,
  });

  @override
  State<MessageInput> createState() => _MessageInputState();
}

class _MessageInputState extends State<MessageInput> {
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
    widget.focusNode.addListener(_onFocusChanged);
  }

  void _onTextChanged() {
    final has = widget.controller.text.trim().isNotEmpty;
    if (has != _hasText) setState(() => _hasText = has);
  }

  void _onFocusChanged() => setState(() {});

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    widget.focusNode.removeListener(_onFocusChanged);
    super.dispose();
  }

  bool get _canSend => _hasText && !widget.isWaiting;

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    final focused   = widget.focusNode.hasFocus;

    // Border color and width animate with focus
    final borderColor = focused ? AppColors.blue : AppColors.border;
    final borderWidth = focused ? 1.5 : 1.0;
    final radius      = 15.0; // matches web CSS override

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.border)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(12, 10, 12, bottomPad > 0 ? 4 : 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // ── Action buttons ──────────────────────────
              _ToolButton(
                icon: widget.isRecording
                    ? Icons.stop_rounded
                    : Icons.mic_none_rounded,
                isActive: widget.isRecording,
                activeColor: AppColors.red,
                activeBg: AppColors.redBg,
                onTap: widget.onMicTap,
                tooltip: widget.isRecording ? 'Stop' : 'Voice',
              ),
              const SizedBox(width: 2),
              _ToolButton(
                icon: Icons.image_outlined,
                onTap: widget.onImageTap,
                tooltip: 'Image',
              ),
              const SizedBox(width: 2),
              _ToolButton(
                icon: Icons.attach_file_rounded,
                onTap: widget.onFileTap,
                tooltip: 'File',
              ),
              const SizedBox(width: 8),

              // ── Text field ──────────────────────────────
              // Use TextField's own OutlineInputBorder so the border
              // radius is drawn by the same widget that draws the fill.
              // This is the only reliable way to get proper pill corners.
              Expanded(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  // Only used for the focus glow shadow — no fill/border here
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(radius),
                    boxShadow: focused
                        ? [
                            BoxShadow(
                              color: AppColors.blue.withValues(alpha: 0.12),
                              blurRadius: 10,
                              spreadRadius: 1,
                            )
                          ]
                        : [],
                  ),
                  child: TextField(
                    controller: widget.controller,
                    focusNode: widget.focusNode,
                    maxLines: 5,
                    minLines: 1,
                    keyboardType: TextInputType.multiline,
                    textInputAction: TextInputAction.newline,
                    textCapitalization: TextCapitalization.sentences,
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppColors.text,
                      height: 1.45,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Message EDITH...',
                      hintStyle: const TextStyle(
                        color: AppColors.text4,
                        fontSize: 15,
                      ),
                      filled: true,
                      fillColor: focused ? AppColors.surface : AppColors.bg,
                      // Let TextField own the border — this guarantees
                      // the fill is clipped to the same radius as the border
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(radius),
                        borderSide: BorderSide(
                          color: borderColor,
                          width: borderWidth,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(radius),
                        borderSide: const BorderSide(
                          color: AppColors.border,
                          width: 1.0,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(radius),
                        borderSide: const BorderSide(
                          color: AppColors.blue,
                          width: 1.5,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 11,
                      ),
                      isDense: true,
                    ),
                    onSubmitted: (_) {
                      if (_canSend) widget.onSend();
                    },
                  ),
                ),
              ),

              const SizedBox(width: 8),

              // ── Send button ─────────────────────────────
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: _canSend ? AppColors.blue : AppColors.border,
                  shape: BoxShape.circle,
                  boxShadow: _canSend
                      ? [
                          BoxShadow(
                            color: AppColors.blue.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          )
                        ]
                      : [],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(21),
                    onTap: _canSend ? widget.onSend : null,
                    child: Icon(
                      Icons.send_rounded,
                      size: 18,
                      color: _canSend ? Colors.white : AppColors.text4,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ToolButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final String tooltip;
  final bool isActive;
  final Color activeColor;
  final Color activeBg;

  const _ToolButton({
    required this.icon,
    required this.onTap,
    required this.tooltip,
    this.isActive = false,
    this.activeColor = AppColors.text3,
    this.activeBg = Colors.transparent,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: isActive ? activeBg : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 20,
              color: isActive ? activeColor : AppColors.text4,
            ),
          ),
        ),
      ),
    );
  }
}
