/**
 * Formats event price strictly in Indian Rupees (₹) or as FREE.
 * Never outputs dollar ($) or undefined currency symbols.
 */
export function formatPrice(price?: number | string | null, isFree?: boolean): string {
  if (isFree) return 'FREE';
  if (price === undefined || price === null) return 'FREE';

  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num) || num <= 0) {
    return 'FREE';
  }

  // Format as ₹100, ₹1,250, etc.
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

export function formatCurrency(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
