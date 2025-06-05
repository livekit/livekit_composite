import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// formatDate render log timestamp 24 hour format
export function formatDate(date: Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Given an object, remove the specified keys and return a new object with the remaining keys
export function withExcludedKeys<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  excludedKeys: K[]
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !excludedKeys.includes(key as K))
  ) as Omit<T, K>;
}

export function withIncludedKeys<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  includedKeys: K[]
): Pick<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => includedKeys.includes(key as K))
  ) as Pick<T, K>;
}
