import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

// Class name utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

// Get credit score color
export function getCreditScoreColor(score: number): string {
  if (score >= 700) return 'text-green-500';
  if (score >= 600) return 'text-yellow-500';
  return 'text-red-500';
}

// Get status badge variant
export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'available':
    case 'approved':
    case 'completed':
      return 'default';
    case 'pending':
    case 'screening':
    case 'new':
      return 'secondary';
    case 'rented':
    case 'maintenance':
      return 'outline';
    case 'denied':
    case 'rejected':
    case 'withdrawn':
      return 'destructive';
    default:
      return 'outline';
  }
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Property bedroom/bathroom display
export function formatBedBath(bedrooms: number, bathrooms: number): string {
  const beds = bedrooms === 0 ? 'Studio' : `${bedrooms} Bed${bedrooms > 1 ? 's' : ''}`;
  const baths = `${bathrooms} Bath${bathrooms > 1 ? 's' : ''}`;
  return `${beds} • ${baths}`;
}

// Format square feet
export function formatSqFt(sqft: number | null): string {
  if (!sqft) return 'N/A';
  return `${sqft.toLocaleString()} sq ft`;
}

// Delay utility for animations
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Check if user can view sensitive data
export function canViewLockbox(role: string): boolean {
  return role === 'admin' || role === 'agent';
}

export function canViewScreeningResults(role: string): boolean {
  return role === 'admin' || role === 'landlord';
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
