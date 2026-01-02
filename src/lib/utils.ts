import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detects if the current browser is WebKit-based (Safari, Tauri on macOS, etc.)
 * This is used for WebKit-specific CSS workarounds due to browser bugs.
 */
export function isWebKit(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('webkit') && !userAgent.includes('edge');
}
