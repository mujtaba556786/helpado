
export enum UserRole {
  ADMIN = 'Admin',
  PROVIDER = 'Provider',
  CUSTOMER = 'Customer',
  GUEST = 'Guest'
}

export enum UserStatus {
  ACTIVE = 'Active',
  SUSPENDED = 'Suspended',
  BLOCKED = 'Blocked',
  PENDING_ONBOARDING = 'Pending Onboarding',
  PENDING_APPROVAL = 'Pending Approval'
}

export enum BookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  COMPLETED = 'Completed',
  EXPIRED = 'Expired',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled',
  DECLINED = 'Declined'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  avatar: string;
  provider: 'Email' | 'Google' | 'Facebook' | 'OTP';
  onboarded: boolean;
  bio?: string;
  rating?: number;
  completedJobs?: number;
  availability?: string[];
  applicationDate?: string;
  address?: string;
  // Professional Address Fields
  streetName?: string;
  streetNumber?: string;
  city?: string;
  country?: string;
  pincode?: string;
  years?: number;
  phone?: string;
  // Added languages property to resolve type errors in mock data and support backend fields
  languages?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  icon: string;
  providerCount: number;
  status: 'Active' | 'Inactive';
  description?: string;
  color?: string; // UI decoration
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  serviceName: string;
  date: string;
  time?: string;
  status: BookingStatus;
  message?: string;
  createdAt?: string;
  customerAvatar?: string;
  providerAvatar?: string;
}

export interface Review {
  id: string;
  customerName: string;
  providerId?: string;
  rating: number;
  comment: string;
  serviceName: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Flagged';
  date: string;
}

export interface DashboardStats {
  totalUsers: number;
  adImpressions: number;
  adClicks: number;
  pendingInquiries: number;
  averageRating: number;
  engagementData: { month: string; value: number }[];
  categoryData: { name: string; value: number }[];
}

export interface Message {
  id: string; 
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastTimestamp: string;
  messages: Message[];
  serviceContext?: string;
}
