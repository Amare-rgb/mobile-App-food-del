export const CURRENCY = 'ETB';

export const formatPrice = (
  amount: number | string | undefined | null
): string => {
  const n = Number(amount ?? 0);
  if (isNaN(n)) return `${CURRENCY} 0.00`;
  return `${CURRENCY} ${n.toFixed(2)}`;
};