export const formatIdr = (amount: number): string =>
  new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  })
    .format(amount)
    .replace("Rp", "Rp ");

export const formatIdrShort = (amount: number): string => {
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}jt`;
  }
  if (amount >= 1000) {
    return `Rp ${Math.round(amount / 1000)}rb`;
  }
  return `Rp ${amount}`;
};
