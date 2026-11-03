import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import {
  openRazorpayModal,
  RazorpayPaymentSuccessResult,
  RazorpayPaymentFailureResult,
} from '../../utils/razorpay';

export interface RazorpayCheckoutButtonProps {
  amount: number; // in INR (e.g. 500) or paise (e.g. 50000)
  registrationId?: string;
  eventTitle?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  currency?: string;
  buttonText?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: (verifyResponse: any) => void;
  onFailure?: (errorMessage: string) => void;
  onCancel?: () => void;
}

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amount,
  registrationId,
  eventTitle = 'Event Registration Fee',
  customerName = '',
  customerEmail = '',
  customerPhone = '',
  currency = 'INR',
  buttonText,
  className = '',
  disabled = false,
  onSuccess,
  onFailure,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate amount in paise for Razorpay API (minimum 100 paise)
  // If amount < 100, assume it was provided in INR (e.g. 50 INR -> 5000 paise)
  const amountInPaise = amount < 100 ? Math.round(amount * 100) : Math.round(amount);
  const displayAmountInINR = (amountInPaise / 100).toFixed(2);

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. BACKEND - Create Order (POST /api/create-order or /api/payments/create-order)
      const orderPayload: any = {
        amount: amountInPaise,
        currency,
        receipt: registrationId ? `rcpt_${registrationId}` : `rcpt_${Date.now()}`,
      };
      if (registrationId) {
        orderPayload.registrationId = registrationId;
      }

      const orderRes = await api.post<any>('/create-order', orderPayload);
      if (!orderRes.success && !orderRes.order_id && !orderRes.orderId) {
        throw new Error(orderRes.message || 'Failed to initialize Razorpay payment order.');
      }

      const orderId = orderRes.order_id || orderRes.orderId || orderRes.id || orderRes.order?.orderId;
      const keyId = orderRes.key_id || orderRes.key;

      if (!orderId) {
        throw new Error('Order creation failed: No order_id returned from server.');
      }

      // 2. FRONTEND - Checkout Modal
      await openRazorpayModal({
        order_id: orderId,
        amount: orderRes.amount || amountInPaise,
        currency: orderRes.currency || currency,
        key: keyId,
        name: 'EVENTHUB',
        description: `Payment for ${eventTitle}`,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        onSuccess: async (response: RazorpayPaymentSuccessResult) => {
          try {
            // 3. BACKEND - Verify Signature (POST /api/verify-payment)
            const verifyPayload = {
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
            };

            const verifyRes = await api.post<any>('/verify-payment', verifyPayload);

            if (verifyRes.success) {
              setLoading(false);
              if (onSuccess) {
                onSuccess(verifyRes);
              }
            } else {
              throw new Error(verifyRes.message || 'Payment verification failed.');
            }
          } catch (verifyErr: any) {
            setLoading(false);
            const msg = verifyErr.message || 'Payment verification failed.';
            setErrorMessage(msg);
            if (onFailure) onFailure(msg);
          }
        },
        onDismiss: () => {
          setLoading(false);
          const cancelMsg = 'Payment was cancelled. You can retry whenever you are ready.';
          setErrorMessage(cancelMsg);
          if (onCancel) onCancel();
        },
        onError: (failResult: RazorpayPaymentFailureResult) => {
          setLoading(false);
          const failMsg = failResult.description || 'Payment transaction failed. Please try again.';
          setErrorMessage(failMsg);
          if (onFailure) onFailure(failMsg);
        },
      });
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Could not initiate Razorpay checkout.';
      setErrorMessage(msg);
      if (onFailure) onFailure(msg);
    }
  };

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled || loading}
        className={`w-full py-3 px-5 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 active:scale-[0.99] ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing Order...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 text-blue-200" />
            <span>
              {buttonText || `Pay ₹${displayAmountInINR} with Razorpay`}
            </span>
          </>
        )}
      </button>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

