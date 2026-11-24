import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with clsx — the standard utility for composable styles */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
