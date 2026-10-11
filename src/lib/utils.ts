import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  if (currency === "INR") {
    // Format as ₹ 2,850 or ₹ 2,850.00
    const formatted = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
    return `₹ ${formatted}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}
