import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CreditCard, CheckCircle2, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';

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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');

  const handlePay = async () => {
    setProcessing(true);
    setError(null);

    try {
      // 1. Create order on backend
      const orderRes = await api.post<any>('/payments/create-order', { registrationId });
      if (!orderRes.success) {
        throw new Error(orderRes.message || 'Failed to initiate payment order.');
      }

      const orderId = orderRes.order.orderId;

      // 2. Simulate gateway checkout delay
      await new Promise((r) => setTimeout(r, 1200));

      // 3. Verify payment signature on backend
      const verifyRes = await api.post<any>('/payments/verify', {
        orderId,
        paymentId: `pay_sim_${Date.now()}`,
        signature: 'sig_valid_eventhub_2026',
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
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Event Checkout"
      subtitle="Complete your registration payment"
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
            <span className="text-base font-extrabold text-[var(--primary-color)]">
              ₹{amount.toFixed(2)} INR
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
            Select Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                paymentMethod === 'card'
                  ? 'border-[var(--primary-color)] bg-[var(--primary-light)] text-[var(--primary-color)] shadow-xs'
                  : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Credit / Debit Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('upi')}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                paymentMethod === 'upi'
                  ? 'border-[var(--primary-color)] bg-[var(--primary-light)] text-[var(--primary-color)] shadow-xs'
                  : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Instant UPI / QR
            </button>
          </div>
        </div>

        {/* Card Details form placeholder */}
        {paymentMethod === 'card' ? (
          <div className="space-y-2 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
            <input
              type="text"
              readOnly
              value="•••• •••• •••• 4242"
              className="w-full p-2 text-xs font-mono rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                readOnly
                value="12 / 28"
                className="w-full p-2 text-xs font-mono rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)]"
              />
              <input
                type="text"
                readOnly
                value="CVC •••"
                className="w-full p-2 text-xs font-mono rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)]"
              />
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-secondary)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Beneficiary UPI ID:</span>
              <span className="font-mono font-bold text-[var(--primary-color)]">eventhub.college@upi</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 p-2 bg-[var(--surface)] rounded-xl border border-[var(--border-color)]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                  `upi://pay?pa=eventhub.college@upi&pn=EventHub&am=${amount}&cu=INR`
                )}`}
                alt="UPI Payment QR"
                className="w-20 h-20 rounded-lg p-1 bg-white border border-slate-200"
              />
              <div className="text-[11px] space-y-1">
                <p className="font-medium text-[var(--text-primary)]">Scan using GPay, PhonePe, Paytm, or BHIM</p>
                <p className="text-[var(--text-muted)]">Instant verification with automatic entry ticket generation upon clicking Pay Now below.</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={handlePay}
            className="px-6 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying Order...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Pay ₹{amount.toFixed(2)} & Get QR Ticket
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
