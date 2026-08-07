export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  planId: string;
  planName?: string;
  planExpiresAt?: string | null;
  queriesCount: number;
  topupCredits?: number;
  createdAt: any;
}

export interface PricingPlan {
  id: string;
  name: string;
  priceINR: number;
  queriesLimit: number; // -1 for unlimited
  description: string;
  createdAt: any;
}

export interface MessageBubble {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: MessageBubble[];
  updatedAt: any;
}

export interface BillingTransaction {
  id: string;
  userId: string;
  userEmail: string;
  planId: string;
  planName: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  trackId?: number;
  payUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface SystemSettings {
  nvidiaNimKey: string;
  oxapayKey: string;
  updatedAt: any;
}

export interface Coupon {
  code: string;
  discount: number;
  type: 'percent' | 'fixed';
  planId: string;
  active: boolean;
}
