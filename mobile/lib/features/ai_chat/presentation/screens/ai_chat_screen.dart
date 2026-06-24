import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../app/theme/colors.dart';
import '../../../../app/theme/typography.dart';
import '../../../../app/theme/spacing.dart';
import '../../../../shared/widgets/glass_card.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../app/di/injection_container.dart';
import '../../../auth/presentation/viewmodels/auth_viewmodel.dart';

class _Message {
  const _Message({required this.role, required this.text, required this.time});
  final String role; // 'user' | 'assistant'
  final String text;
  final DateTime time;
}

final _messagesProvider =
    StateProvider<List<_Message>>((_) => const []);

final _loadingProvider = StateProvider<bool>((_) => false);

class AiChatScreen extends ConsumerStatefulWidget {
  const AiChatScreen({super.key});

  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen> {
  final _inputCtrl   = TextEditingController();
  final _scrollCtrl  = ScrollController();

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty) return;

    _inputCtrl.clear();
    final userMsg = _Message(role: 'user', text: text, time: DateTime.now());
    ref.read(_messagesProvider.notifier).update((s) => [...s, userMsg]);
    ref.read(_loadingProvider.notifier).state = true;
    _scrollToBottom();

    try {
      final res = await sl<ApiClient>().post(
        ApiConstants.aiChat,
        data: {'message': text},
      );
      final reply = (res.data as Map<String, dynamic>)['reply'] as String?
          ?? 'Sorry, I could not process that.';
      ref.read(_messagesProvider.notifier).update((s) => [
        ...s,
        _Message(role: 'assistant', text: reply, time: DateTime.now()),
      ]);
    } catch (_) {
      ref.read(_messagesProvider.notifier).update((s) => [
        ...s,
        _Message(
          role: 'assistant',
          text: 'Something went wrong. Please try again.',
          time: DateTime.now(),
        ),
      ]);
    } finally {
      ref.read(_loadingProvider.notifier).state = false;
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(_messagesProvider);
    final loading  = ref.watch(_loadingProvider);
    final username = ref.watch(authViewModelProvider).user?.username ?? 'You';

    return Scaffold(
      backgroundColor: AppColors.base,
      appBar: AppBar(
        title: Row(children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              color: AppColors.primaryMuted,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.auto_awesome,
                color: AppColors.primary, size: 16),
          ),
          const SizedBox(width: Spacing.md),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('TraVirt AI'),
            Text('Market Intelligence',
                style: AppTypography.bodySm.copyWith(fontSize: 10)),
          ]),
        ]),
      ),
      body: Column(children: [
        // Messages
        Expanded(
          child: messages.isEmpty
              ? _WelcomeState(onPrompt: (p) {
                  _inputCtrl.text = p;
                  _send();
                })
              : ListView.builder(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.all(Spacing.xl2),
                  itemCount: messages.length + (loading ? 1 : 0),
                  itemBuilder: (_, i) {
                    if (i == messages.length) return const _TypingIndicator();
                    final msg = messages[i];
                    return _MessageBubble(
                      message: msg,
                      username: username,
                    );
                  },
                ),
        ),

        // Input bar
        Container(
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: AppColors.overlayLight)),
          ),
          padding: EdgeInsets.only(
            left: Spacing.xl2,
            right: Spacing.md,
            top: Spacing.md,
            bottom: Spacing.md + MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Row(children: [
            Expanded(
              child: TextField(
                controller: _inputCtrl,
                style: AppTypography.bodyMd,
                maxLines: null,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: 'Ask about markets, strategies…',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(Radius.xl2),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: AppColors.overlay,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: Spacing.lg, vertical: Spacing.md,
                  ),
                ),
              ),
            ),
            const SizedBox(width: Spacing.sm),
            GestureDetector(
              onTap: loading ? null : _send,
              child: Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: loading
                      ? AppColors.muted.withOpacity(0.3)
                      : AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  loading ? Icons.hourglass_empty : Icons.send,
                  color: Colors.white, size: 20,
                ),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.username});
  final _Message message;
  final String username;

  bool get _isUser => message.role == 'user';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Spacing.lg),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment:
            _isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!_isUser) ...[
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                color: AppColors.primaryMuted,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome,
                  color: AppColors.primary, size: 16),
            ),
            const SizedBox(width: Spacing.sm),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(Spacing.md),
              decoration: BoxDecoration(
                color: _isUser
                    ? AppColors.primary.withOpacity(0.15)
                    : AppColors.surface,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(_isUser ? Radius.lg : Radius.xs),
                  topRight: Radius.circular(_isUser ? Radius.xs : Radius.lg),
                  bottomLeft: const Radius.circular(Radius.lg),
                  bottomRight: const Radius.circular(Radius.lg),
                ),
                border: Border.all(
                  color: _isUser
                      ? AppColors.primary.withOpacity(0.3)
                      : AppColors.overlayLight,
                ),
              ),
              child: Text(message.text, style: AppTypography.bodyMd),
            ),
          ).animate().fadeIn(duration: 200.ms).slideY(begin: 0.05, end: 0),
          if (_isUser) const SizedBox(width: Spacing.sm),
        ],
      ),
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  const _TypingIndicator();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Spacing.lg),
      child: Row(children: [
        Container(
          width: 32, height: 32,
          decoration: BoxDecoration(
            color: AppColors.primaryMuted, shape: BoxShape.circle,
          ),
          child: const Icon(Icons.auto_awesome,
              color: AppColors.primary, size: 16),
        ),
        const SizedBox(width: Spacing.sm),
        Container(
          padding: const EdgeInsets.symmetric(
              horizontal: Spacing.lg, vertical: Spacing.md),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(Radius.lg),
            border: Border.all(color: AppColors.overlayLight),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            for (int i = 0; i < 3; i++)
              Container(
                width: 6, height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ).animate(delay: (i * 150).ms,
                      onPlay: (c) => c.repeat(reverse: true))
               .fadeIn(duration: 300.ms),
          ]),
        ),
      ]),
    );
  }
}

class _WelcomeState extends StatelessWidget {
  const _WelcomeState({required this.onPrompt});
  final void Function(String) onPrompt;

  static const _prompts = [
    'What are the best sectors to watch today?',
    'Explain F&O expiry and its market impact',
    'What is a stop-loss and when should I use it?',
    'How does MIS differ from CNC?',
    'Explain circuit breakers in Indian markets',
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(Spacing.xl2),
      children: [
        const SizedBox(height: Spacing.xl3),
        Center(
          child: Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              color: AppColors.primaryMuted,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.auto_awesome,
                color: AppColors.primary, size: 36),
          ),
        ),
        const SizedBox(height: Spacing.xl),
        Center(
          child: Text('TraVirt AI', style: AppTypography.headingXl),
        ),
        const SizedBox(height: Spacing.sm),
        Center(
          child: Text(
            'Ask anything about markets, strategies, or trading concepts.',
            style: AppTypography.bodyMd,
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: Spacing.xl3),
        Text('Try asking', style: AppTypography.labelMd),
        const SizedBox(height: Spacing.md),
        ..._prompts.map((p) => Padding(
          padding: const EdgeInsets.only(bottom: Spacing.md),
          child: GlassCard(
            onTap: () => onPrompt(p),
            child: Padding(
              padding: const EdgeInsets.all(Spacing.md),
              child: Row(children: [
                const Icon(Icons.chat_bubble_outline,
                    color: AppColors.primary, size: 16),
                const SizedBox(width: Spacing.md),
                Expanded(child: Text(p, style: AppTypography.bodyMd)),
                const Icon(Icons.arrow_forward_ios,
                    color: AppColors.muted, size: 12),
              ]),
            ),
          ),
        )),
      ],
    );
  }
}
