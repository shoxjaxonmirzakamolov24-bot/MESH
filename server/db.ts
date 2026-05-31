import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { User, Profile, Match, Message, Conversation, ExchangeAgreement, Review, Transaction, CommunityPost, CommunityComment, Notification, Skill } from '../src/types';
import { INITIAL_USERS, INITIAL_PROFILES, INITIAL_REVIEWS, INITIAL_POSTS } from '../src/data';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Supabase Configuration check from environment variables safely
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);
let supabase: any = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    console.log('✅ Supabase Client initialized successfully for SkillMesh production database.');
  } catch (err) {
    console.error('❌ Failed to construct Supabase Client:', err);
  }
} else {
  console.log('ℹ️ Supabase credentials not found. Using fast offline local JSON storage (data/db.json).');
}

// Interface for serialized database
interface DatabaseState {
  users: User[];
  profiles: Profile[];
  matches: Match[];
  conversations: Conversation[];
  messages: Message[];
  agreements: ExchangeAgreement[];
  reviews: Review[];
  transactions: Transaction[];
  posts: CommunityPost[];
  comments: CommunityComment[];
  notifications: Notification[];
}

class DatabaseManager {
  private state: DatabaseState = {
    users: [],
    profiles: [],
    matches: [],
    conversations: [],
    messages: [],
    agreements: [],
    reviews: [],
    transactions: [],
    posts: [],
    comments: [],
    notifications: []
  };

  constructor() {
    this.load();
  }

  // Called on server bootstrap before serving any routes
  async init() {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      console.log('🔄 Syncing persistent database state from Supabase Cloud...');
      const { data, error } = await supabase
        .from('skillmesh_state')
        .select('data')
        .eq('id', 'current_state')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record does not exist in Supabase yet, seed it!
          console.log('🌱 Cloud database is empty. Synchronizing seed data to Supabase...');
          await supabase
            .from('skillmesh_state')
            .upsert({ id: 'current_state', data: this.state, updated_at: new Date().toISOString() });
        } else {
          console.warn('⚠️ Supabase fetch warning (Check table structure):', error.message);
        }
      } else if (data && data.data) {
        if (typeof data.data === 'object' && Array.isArray(data.data.users)) {
          this.state = data.data;
          console.log(`✨ Successfully synchronized state from Supabase! Users loaded: ${this.state.users.length}`);
          
          // Keep a local cached backup file for lightning-fast reads
          const dir = path.dirname(DB_PATH);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(DB_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
        }
      }
    } catch (err: any) {
      console.error('❌ Supabase cloud fetch failure. Falling back to local offline storage:', err.message);
    }
  }

  private load() {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        this.state = JSON.parse(data);
        console.log('Database loaded successfully. Records count - Users:', this.state.users.length);
      } else {
        this.seed();
      }
    } catch (e) {
      console.error('Error loading database, returning default fallback:', e);
      this.seed();
    }
  }

  private save() {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
      
      // Asynchronously backup to Supabase
      this.syncToSupabase();
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  private async syncToSupabase() {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase
        .from('skillmesh_state')
        .upsert({ 
          id: 'current_state', 
          data: this.state,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('⚠️ Supabase automatic backup failure:', error.message);
      }
    } catch (err: any) {
      console.error('❌ Supabase async backup error:', err.message);
    }
  }

  private seed() {
    console.log('Database empty, seeding default SkillMesh MVP profiles...');
    this.state = {
      users: [...INITIAL_USERS],
      profiles: [...INITIAL_PROFILES],
      matches: [],
      conversations: [],
      messages: [],
      agreements: [],
      reviews: [...INITIAL_REVIEWS],
      transactions: [],
      posts: [...INITIAL_POSTS],
      comments: [],
      notifications: []
    };
    this.save();
  }

  // --- Users ---
  getUsers(): User[] {
    return this.state.users;
  }

  getUser(id: string): User | undefined {
    return this.state.users.find(u => u.id === id);
  }

  createUser(user: User): User {
    const existing = this.getUser(user.id);
    if (existing) return existing;

    this.state.users.push(user);

    // Bootstrap corresponding Profile
    const profile: Profile = {
      id: user.id,
      bio: `SkillMesh apprentice sharing experiences, open to cross-exchanging, networking, and learning together.`,
      location: 'Global Digital Nomad',
      language: 'English',
      activityLevel: 'High',
      trustScore: 80,
      credits: 100, // starting credit
      offeredSkills: [],
      neededSkills: []
    };
    this.state.profiles.push(profile);

    // Bootstrap Faucet transaction
    this.state.transactions.push({
      id: `tx-faucet-${user.id}`,
      userId: user.id,
      amount: 100,
      type: 'faucet',
      description: 'SkillMesh Welcome Faucet Bonus',
      timestamp: new Date().toISOString()
    });

    this.save();
    return user;
  }

  updateUserPremium(id: string, isPremium: boolean): User | undefined {
    const u = this.getUser(id);
    if (u) {
      u.isPremium = isPremium;
      this.save();
    }
    return u;
  }

  // Login paytida admin rolini env ro'yxatiga moslab yangilaydi
  updateUserRole(id: string, role: 'user' | 'admin'): User | undefined {
    const u = this.getUser(id);
    if (u && u.role !== role) {
      u.role = role;
      this.save();
    }
    return u;
  }

  // Bir martalik premium bonusi allaqachon berilganmi (kredit farming oldini olish)
  hasPremiumBonus(userId: string): boolean {
    return this.state.transactions.some(t => t.userId === userId && t.type === 'premium_buy');
  }

  // --- Profiles ---
  getProfiles(): Profile[] {
    return this.state.profiles;
  }

  getProfile(id: string): Profile | undefined {
    return this.state.profiles.find(p => p.id === id);
  }

  updateProfile(id: string, updates: Partial<Profile>): Profile | undefined {
    const p = this.getProfile(id);
    if (p) {
      if (updates.bio !== undefined) p.bio = updates.bio;
      if (updates.location !== undefined) p.location = updates.location;
      if (updates.language !== undefined) p.language = updates.language;
      if (updates.activityLevel !== undefined) p.activityLevel = updates.activityLevel;
      if (updates.trustScore !== undefined) p.trustScore = updates.trustScore;
      if (updates.credits !== undefined) p.credits = updates.credits;
      if (updates.offeredSkills !== undefined) p.offeredSkills = updates.offeredSkills;
      if (updates.neededSkills !== undefined) p.neededSkills = updates.neededSkills;
      this.save();
    }
    return p;
  }

  // --- Matches ---
  getMatches(): Match[] {
    return this.state.matches;
  }

  createMatch(match: Match): Match {
    this.state.matches.push(match);
    this.save();
    return match;
  }

  // --- Conversations ---
  getConversations(): Conversation[] {
    return this.state.conversations;
  }

  getOrCreateConversation(pAId: string, pBId: string): Conversation {
    const sorted = [pAId, pBId].sort();
    const existing = this.state.conversations.find(
      c => c.participantA_id === sorted[0] && c.participantB_id === sorted[1]
    );

    if (existing) return existing;

    const newConvo: Conversation = {
      id: `convo-${Date.now()}`,
      participantA_id: sorted[0],
      participantB_id: sorted[1],
      unreadCountA: 0,
      unreadCountB: 0
    };
    this.state.conversations.push(newConvo);
    this.save();
    return newConvo;
  }

  // --- Messages ---
  getMessages(convoId: string): Message[] {
    return this.state.messages.filter(m => m.conversationId === convoId);
  }

  createMessage(msg: Message): Message {
    this.state.messages.push(msg);

    // Update conversation last activity
    const convo = this.state.conversations.find(c => c.id === msg.conversationId);
    if (convo) {
      convo.lastMessage = msg.text;
      convo.lastMessageTime = msg.timestamp;

      // increment unread count for other recipient
      if (msg.senderId === convo.participantA_id) {
        convo.unreadCountB += 1;
      } else {
        convo.unreadCountA += 1;
      }
    }

    this.save();
    return msg;
  }

  clearUnreads(convoId: string, userId: string) {
    const convo = this.state.conversations.find(c => c.id === convoId);
    if (convo) {
      if (userId === convo.participantA_id) {
        convo.unreadCountA = 0;
      } else {
        convo.unreadCountB = 0;
      }
      this.save();
    }

    // Mark as read in messages list
    this.state.messages
      .filter(m => m.conversationId === convoId && m.senderId !== userId)
      .forEach(m => m.isRead = true);
    this.save();
  }

  // --- Exchange Agreements ---
  getAgreements(): ExchangeAgreement[] {
    return this.state.agreements;
  }

  createAgreement(ag: ExchangeAgreement): ExchangeAgreement {
    this.state.agreements.push(ag);
    this.save();
    return ag;
  }

  signAgreement(id: string, userId: string): ExchangeAgreement | undefined {
    const ag = this.state.agreements.find(a => a.id === id);
    if (!ag) return undefined;

    // Yakunlangan yoki bekor qilingan kelishuvni qayta imzolab bo'lmaydi
    if (ag.status === 'completed' || ag.status === 'cancelled') {
      throw new Error('Bu kelishuv allaqachon yakunlangan yoki bekor qilingan.');
    }

    const isProposer = ag.proposerId === userId;
    const isReceiver = ag.receiverId === userId;
    if (!isProposer && !isReceiver) {
      throw new Error('Siz bu kelishuv ishtirokchisi emassiz.');
    }

    // Bu imzo kelishuvni to'liq imzolaydimi?
    const willBeFullySigned =
      (isProposer ? true : ag.proposerSigned) && (isReceiver ? true : ag.receiverSigned);

    // To'liq imzolanishdan OLDIN balansni tekshiramiz (qisman mutatsiyaning oldini olish uchun)
    if (willBeFullySigned && ag.status === 'pending' && ag.creditStaked > 0) {
      const pStake = this.getProfile(ag.proposerId);
      if (!pStake) throw new Error('Taklif qiluvchi profili topilmadi.');
      if (pStake.credits < ag.creditStaked) {
        throw new Error('Garov uchun hisobingizda yetarli MESH kredit yo\'q.');
      }
    }

    // Endi imzoni xavfsiz qo'yamiz
    if (isProposer) ag.proposerSigned = true;
    if (isReceiver) ag.receiverSigned = true;

    // Faqat pending -> agreed o'tishida BIR MARTA garovni blokla (idempotent)
    if (ag.proposerSigned && ag.receiverSigned && ag.status === 'pending') {
      if (ag.creditStaked > 0) {
        const pStake = this.getProfile(ag.proposerId)!;
        pStake.credits -= ag.creditStaked;
        this.state.transactions.push({
          id: `tx-stake-${Date.now()}`,
          userId: ag.proposerId,
          amount: -ag.creditStaked,
          type: 'escrow_stake',
          description: `Locked ${ag.creditStaked} MESH staking in "${ag.title}"`,
          timestamp: new Date().toISOString()
        });
      }
      ag.status = 'agreed';
    }

    this.save();
    return ag;
  }

  completeAgreement(id: string, confirmerId: string): ExchangeAgreement | undefined {
    const ag = this.state.agreements.find(a => a.id === id);
    if (!ag) return undefined;

    // Faqat imzolangan (agreed) kelishuvni yakunlash mumkin — idempotentlik va soxta o'tkazmaning oldini oladi
    if (ag.status !== 'agreed') {
      throw new Error('Faqat ikki tomon imzolagan (agreed) kelishuvni yakunlash mumkin.');
    }
    if (ag.proposerId !== confirmerId && ag.receiverId !== confirmerId) {
      throw new Error('Siz bu kelishuv ishtirokchisi emassiz.');
    }

    ag.status = 'completed';

    // Garov taklif qiluvchidan (proposer) yechilgan edi -> mahorat egasiga (receiver) o'tkaziladi
    const creditsToTransfer = ag.creditStaked;
    if (creditsToTransfer > 0) {
      const recipientId = ag.receiverId;
      const recProfile = this.getProfile(recipientId);
      if (recProfile) {
        recProfile.credits += creditsToTransfer;
        this.state.transactions.push({
          id: `tx-release-${Date.now()}`,
          userId: recipientId,
          amount: creditsToTransfer,
          type: 'escrow_release',
          description: `Released ${creditsToTransfer} MESH swap credits for "${ag.title}"`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Ikkala tomonga ishonch ballidan bonus
    const p1 = this.getProfile(ag.proposerId);
    const p2 = this.getProfile(ag.receiverId);
    if (p1) p1.trustScore = Math.min(100, p1.trustScore + 2);
    if (p2) p2.trustScore = Math.min(100, p2.trustScore + 2);

    this.save();
    return ag;
  }

  // --- Reviews ---
  getReviews(): Review[] {
    return this.state.reviews;
  }

  createReview(rev: Review): Review {
    this.state.reviews.push(rev);

    // Apply rating to target user trust score
    const target = this.getProfile(rev.targetId);
    if (target) {
      const targetRev = this.state.reviews.filter(r => r.targetId === rev.targetId);
      const avg = targetRev.reduce((acc, r) => acc + r.rating, 0) / targetRev.length;
      // Map star rating (1-5) to trust score changes
      target.trustScore = Math.round(70 + (avg * 6)); // E.g., 5 stars average yields 100 trust score
      if (target.trustScore > 100) target.trustScore = 100;
    }

    this.save();
    return rev;
  }

  // --- Transactions ---
  getTransactions(userId: string): Transaction[] {
    return this.state.transactions.filter(t => t.userId === userId);
  }

  createTransaction(tx: Transaction): Transaction {
    this.state.transactions.push(tx);
    this.save();
    return tx;
  }

  // --- Community Posts ---
  getPosts(): CommunityPost[] {
    return this.state.posts.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
  }

  createPost(post: CommunityPost): CommunityPost {
    this.state.posts.push(post);
    this.save();
    return post;
  }

  likePost(postId: string): number {
    const post = this.state.posts.find(p => p.id === postId);
    if (post) {
      post.likes += 1;
      this.save();
      return post.likes;
    }
    return 0;
  }

  getComments(postId: string): CommunityComment[] {
    return this.state.comments.filter(c => c.postId === postId);
  }

  createComment(com: CommunityComment): CommunityComment {
    this.state.comments.push(com);

    // Increment count on post
    const post = this.state.posts.find(p => p.id === com.postId);
    if (post) {
      post.commentsCount += 1;
    }

    this.save();
    return com;
  }

  // --- Notifications ---
  getNotifications(userId: string): Notification[] {
    return this.state.notifications.filter(n => n.userId === userId);
  }

  createNotification(not: Notification): Notification {
    this.state.notifications.push(not);
    this.save();
    return not;
  }

  markNotificationRead(id: string) {
    const n = this.state.notifications.find(not => not.id === id);
    if (n) {
      n.isRead = true;
      this.save();
    }
  }

  // --- Admin Capabilities ---
  deleteUser(userId: string): boolean {
    const userIndex = this.state.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;

    // Remove user
    this.state.users.splice(userIndex, 1);

    // Remove profile
    const profileIndex = this.state.profiles.findIndex(p => p.id === userId);
    if (profileIndex !== -1) {
      this.state.profiles.splice(profileIndex, 1);
    }

    // Filter community posts, agreements, comments, reviews, messages, etc.
    this.state.posts = this.state.posts.filter(p => p.authorId !== userId);
    this.state.comments = this.state.comments.filter(c => c.authorId !== userId);
    this.state.reviews = this.state.reviews.filter(r => r.authorId !== userId && r.targetId !== userId);
    this.state.agreements = this.state.agreements.filter(a => a.proposerId !== userId && a.receiverId !== userId);
    this.state.notifications = this.state.notifications.filter(n => n.userId !== userId);
    this.state.transactions = this.state.transactions.filter(t => t.userId !== userId);

    this.save();
    return true;
  }

  deletePost(postId: string): boolean {
    const postIndex = this.state.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return false;

    this.state.posts.splice(postIndex, 1);
    this.state.comments = this.state.comments.filter(c => c.postId !== postId);
    
    this.save();
    return true;
  }

  forceResolveAgreement(id: string, outcome: 'release' | 'refund'): ExchangeAgreement | undefined {
    const ag = this.state.agreements.find(a => a.id === id);
    if (!ag) return undefined;

    // Faqat escrowda turgan (agreed) kelishuvni hal qilish mumkin — takroriy release/refund oldini olamiz
    if (ag.status !== 'agreed') {
      throw new Error('Faqat escrowda turgan (agreed) kelishuvni admin hal qila oladi.');
    }

    const creditsToTransfer = ag.creditStaked;

    if (outcome === 'release') {
      ag.status = 'completed';
      if (creditsToTransfer > 0) {
        // Release staked to the recipient (whichever of the proposer/receiver is NOT the original staker)
        // Note: credits were already deducted from proposerId when agreement was signed
        const recipientId = ag.receiverId; 
        const recProfile = this.getProfile(recipientId);
        if (recProfile) {
          recProfile.credits += creditsToTransfer;
          this.state.transactions.push({
            id: `tx-release-admin-${Date.now()}`,
            userId: recipientId,
            amount: creditsToTransfer,
            type: 'escrow_release',
            description: `Admin Arbitrage Release of ${creditsToTransfer} MESH for "${ag.title}"`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } else if (outcome === 'refund') {
      ag.status = 'cancelled';
      if (creditsToTransfer > 0) {
        // Refund back to proposer
        const propProfile = this.getProfile(ag.proposerId);
        if (propProfile) {
          propProfile.credits += creditsToTransfer;
          this.state.transactions.push({
            id: `tx-refund-admin-${Date.now()}`,
            userId: ag.proposerId,
            amount: creditsToTransfer,
            type: 'escrow_refund',
            description: `Admin Arbitrage Refund of ${creditsToTransfer} MESH for "${ag.title}"`,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    this.save();
    return ag;
  }

  // --- Payment System Simulator ---
  buyMesh(userId: string, amount: number, method: string): Profile | undefined {
    const profile = this.getProfile(userId);
    if (!profile) return undefined;

    profile.credits += amount;
    this.state.transactions.push({
      id: `tx-buy-${Date.now()}`,
      userId: userId,
      amount: amount,
      type: 'transfer',
      description: `Purchased MESH Token Pack via ${method}`,
      timestamp: new Date().toISOString()
    });

    this.save();
    return profile;
  }
}

export const db = new DatabaseManager();
