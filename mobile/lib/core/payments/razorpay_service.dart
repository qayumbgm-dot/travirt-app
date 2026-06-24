import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../../app/di/injection_container.dart';
import '../network/api_client.dart';

// ── Result types ────────────────────────────────────────────────────────────

sealed class PaymentResult {
  const PaymentResult();
}

class PaymentSuccess extends PaymentResult {
  const PaymentSuccess({required this.paymentId, required this.orderId});
  final String paymentId;
  final String orderId;
}

class PaymentFailure extends PaymentResult {
  const PaymentFailure({required this.message, this.code});
  final String message;
  final int? code;
}

class PaymentExternalWallet extends PaymentResult {
  const PaymentExternalWallet({required this.walletName});
  final String walletName;
}

// ── Provider ────────────────────────────────────────────────────────────────

final razorpayServiceProvider = Provider<RazorpayService>((ref) {
  final svc = RazorpayService(client: sl<ApiClient>());
  ref.onDispose(svc.dispose);
  return svc;
});

// ── Service ─────────────────────────────────────────────────────────────────

class RazorpayService {
  RazorpayService({required this.client});
  final ApiClient client;

  late Razorpay _razorpay;
  // Completer-style: caller awaits via a callback
  void Function(PaymentResult)? _onResult;

  void init() {
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handleSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handleFailure);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleWallet);
  }

  void dispose() {
    _razorpay.clear();
  }

  // Called by UI: creates order on backend, opens Razorpay checkout
  Future<void> subscribe({
    required String plan,        // 'pro' | 'elite'
    required String email,
    required String username,
    required void Function(PaymentResult) onResult,
  }) async {
    _onResult = onResult;

    // 1. Create subscription order on backend
    late String orderId;
    late int amount;
    late String razorpayKey;
    try {
      final res = await client.post('/billing/create-order', data: {'plan': plan});
      orderId    = res.data['orderId'] as String;
      amount     = res.data['amount'] as int;     // paise
      razorpayKey = res.data['key'] as String;    // RAZORPAY_KEY_ID (public)
    } catch (e) {
      onResult(PaymentFailure(message: 'Failed to create order: $e'));
      return;
    }

    // 2. Open Razorpay checkout
    final options = <String, dynamic>{
      'key':         razorpayKey,
      'amount':      amount,
      'order_id':    orderId,
      'name':        'TraVirt',
      'description': '${plan.toUpperCase()} Plan Subscription',
      'prefill': {
        'email': email,
        'name':  username,
      },
      'theme': {'color': '#007BFF'},
      'send_sms_hash': true,
    };

    try {
      _razorpay.open(options);
    } catch (e) {
      onResult(PaymentFailure(message: 'Could not open payment: $e'));
    }
  }

  void _handleSuccess(PaymentSuccessResponse response) {
    // Verify payment signature on backend
    _verifyAndActivate(response);
  }

  Future<void> _verifyAndActivate(PaymentSuccessResponse response) async {
    try {
      await client.post('/billing/verify-payment', data: {
        'razorpay_payment_id': response.paymentId,
        'razorpay_order_id':   response.orderId,
        'razorpay_signature':  response.signature,
      });
      _onResult?.call(PaymentSuccess(
        paymentId: response.paymentId ?? '',
        orderId: response.orderId ?? '',
      ));
    } catch (e) {
      _onResult?.call(PaymentFailure(message: 'Payment verification failed: $e'));
    }
  }

  void _handleFailure(PaymentFailureResponse response) {
    _onResult?.call(PaymentFailure(
      message: response.message ?? 'Payment failed',
      code: response.code,
    ));
  }

  void _handleWallet(ExternalWalletResponse response) {
    _onResult?.call(
        PaymentExternalWallet(walletName: response.walletName ?? ''));
  }
}
