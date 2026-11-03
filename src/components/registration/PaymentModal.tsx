import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CreditCard, CheckCircle2, ShieldCheck, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import { openRazorpayModal, RazorpayPaymentSuccessResult, RazorpayPaymentFailureResult } from '../../utils/razorpay';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  registrationId: string;
  amount: number;
  eventTitle: string;
  onPaymentSuccess: (res: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  registrationId,
  amount,
  eventTitle,
  onPaymentSuccess,
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountInPaise = Math.round(amount * 100);

  const handlePay = async () => {
    setProcessing(true);
    setError(null);

    try {
      // 1. BACKEND - Create Order
      const orderRes = await api.post<any>('/create-order', {
        registrationId,
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${registrationId}`,
      });

      if (!orderRes.success && !orderRes.order_id && !orderRes.orderId) {
        throw new Error(orderRes.message || 'Failed to initiate payment order.');
      }

      const orderId = orderRes.order_id || orderRes.orderId || orderRes.id || orderRes.order?.orderId;
      const keyId = orderRes.key_id || orderRes.key || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;

      if (!orderId) {
        throw new Error('Order creation did not return a valid order ID.');
      }

      // 2. FRONTEND - Checkout Modal via Razorpay Standard Web Checkout
      await openRazorpayModal({
        order_id: orderId,
        amount: orderRes.amount || amountInPaise,
        currency: orderRes.currency || 'INR',
        key: keyId,
        name: 'EVENTHUB',
        description: `Registration Fee: ${eventTitle}`,
        onSuccess: async (response: RazorpayPaymentSuccessResult) => {
          try {
            // 3. BACKEND - Verify Signature
            const verifyRes = await api.post<any>('/verify-payment', {
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              registrationId,
              // Compatibility aliases
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
            });

            if (verifyRes.success) {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
              });
              onPaymentSuccess(verifyRes);
            } else {
              throw new Error(verifyRes.message || 'Payment verification failed.');
            }
          } catch (verifyErr: any) {
            setError(verifyErr.message || 'Payment signature verification failed.');
          } finally {
            setProcessing(false);
          }
        },
        onDismiss: () => {
          setProcessing(false);
          setError('Payment was cancelled. You can retry whenever you are ready.');
        },
        onError: (errResult: RazorpayPaymentFailureResult) => {
          setProcessing(false);
          setError(errResult.description || 'Payment failed. Please try again.');
        },
      });
    } catch (err: any) {
      setProcessing(false);
      setError(err.message || 'Payment initialization failed. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Event Checkout"
      subtitle="Complete your registration payment via Razorpay"
      maxWidth="md"
    >
      <div className="space-y-4 py-2">
        {/* Order Summary */}
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">Event:</span>
            <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-48">
              {eventTitle}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">Registration ID:</span>
            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
              {registrationId}
            </span>
          </div>
          <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)]">Total Amount:</span>
            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
              ₹{amount.toFixed(2)} INR
            </span>
          </div>
        </div>

        {/* Razorpay Information Box */}
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <h4 className="text-xs font-bold text-[var(--text-primary)]">
              Powered by Razorpay Standard Checkout
            </h4>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            Clicking <strong>Pay ₹{amount.toFixed(2)} with Razorpay</strong> will open the official Razorpay checkout modal with support for UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards, Netbanking, and Wallets.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[10px] text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> 256-Bit SSL Encrypted
            </span>
            <span>•</span>
            <span>Instant Entry QR Ticket</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={handlePay}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Launching Razorpay...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Pay ₹{amount.toFixed(2)} with Razorpay</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
