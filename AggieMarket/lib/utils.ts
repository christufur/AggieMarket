import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function priceLabel(price: number | null, price_type?: string | null): string {
  if (price == null) return "Free";
  const suffix = price_type === "hourly" ? "/hr" : price_type === "starting_at" ? "+" : "";
  return `$${price}${suffix}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtJoined(iso: string): string {
  return "Joined " + new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
