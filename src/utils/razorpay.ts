/**
 * Razorpay Standard Web Checkout Integration Utility
 */

export interface RazorpayPaymentSuccessResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayPaymentFailureResult {
  code?: string;
  description?: string;
  source?: string;
  step?: string;
  reason?: string;
  metadata?: {
    order_id?: string;
    payment_id?: string;
  };
}

export interface RazorpayCheckoutOptions {
  order_id: string;
  amount: number; // in paise
  currency?: string;
  key?: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
    backdrop_color?: string;
  };
  onSuccess: (result: RazorpayPaymentSuccessResult) => void;
  onDismiss?: () => void;
  onError?: (error: RazorpayPaymentFailureResult) => void;
}

/**
 * Loads Razorpay Standard Web Checkout checkout.js script asynchronously
 */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout.js script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Opens Razorpay Standard Checkout modal
 */
export async function openRazorpayModal(options: RazorpayCheckoutOptions): Promise<void> {
  const isLoaded = await loadRazorpayCheckoutScript();
  if (!isLoaded || typeof (window as any).Razorpay === 'undefined') {
    throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
  }

  const razorpayKey =
    options.key ||
    (import.meta as any).env?.VITE_RAZORPAY_KEY_ID ||
    'rzp_test_TvaGmI0q77MTGO';

  const checkoutConfig: any = {
    key: razorpayKey,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: options.name || 'EVENTHUB',
    description: options.description || 'Event Registration Fee',
    image: options.image || 'https://cdn.razorpay.com/static/assets/logo/rzp.png',
    order_id: options.order_id,
    prefill: options.prefill || {},
    notes: options.notes || {},
    theme: options.theme || {
      color: '#2563eb',
    },
    handler: function (response: RazorpayPaymentSuccessResult) {
      if (options.onSuccess) {
        options.onSuccess(response);
      }
    },
    modal: {
      ondismiss: function () {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
      escape: true,
      backdropclose: false,
    },
  };

  const rzpInstance = new (window as any).Razorpay(checkoutConfig);

  rzpInstance.on('payment.failed', function (resp: any) {
    console.error('[RAZORPAY] Payment transaction failed:', resp.error);
    if (options.onError) {
      options.onError(resp.error || { description: 'Payment failed' });
    }
  });

  rzpInstance.open();
}

