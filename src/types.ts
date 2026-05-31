/**
 * SkillMesh - Shared TypeScript Interfaces and Types
 */

export interface User {
  id: string;
  telegramId?: string;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium: boolean;
  joinDate: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Expert';
}

export interface Profile {
  id: string; // matches user.id
  bio: string;
  location: string;
  language: string;
  activityLevel: 'High' | 'Medium' | 'Low';
  trustScore: number; // 0 to 100
  credits: number; // MESH credits
  offeredSkills: Skill[];
  neededSkills: string[]; // names of skills needed
}

export interface Match {
  id: string;
  userA_id: string;
  userB_id: string;
  compatibilityScore: number; // percentage
  offeredMatch: string[]; // what A offers that B needs
  neededMatch: string[]; // what B offers that A needs
  reasoning: string; // AI generated logic
  status: 'pending' | 'connected' | 'rejected';
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  voiceUrl?: string;
  attachmentUrl?: string;
}

export interface Conversation {
  id: string;
  participantA_id: string;
  participantB_id: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCountA: number;
  unreadCountB: number;
}

export interface ExchangeAgreement {
  id: string;
  conversationId: string;
  proposerId: string;
  receiverId: string;
  title: string;
  offeredSkill: string;
  neededSkill: string;
  hours: number;
  creditStaked: number;
  status: 'pending' | 'agreed' | 'completed' | 'cancelled';
  proposerSigned: boolean;
  receiverSigned: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  authorId: string;
  targetId: string;
  rating: number; // 1-5 stars
  text: string;
  timestamp: string;
  skillSwapped: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number; // positive or negative
  type: 'faucet' | 'escrow_stake' | 'escrow_release' | 'escrow_refund' | 'premium_buy' | 'transfer';
  description: string;
  timestamp: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhotoUrl?: string;
  title: string;
  content: string;
  neededSkill: string;
  offeredSkill: string;
  likes: number;
  commentsCount: number;
  timestamp: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  content: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'match' | 'message' | 'agreement' | 'credit' | 'system';
  isRead: boolean;
  timestamp: string;
  linkToTab?: string;
}
