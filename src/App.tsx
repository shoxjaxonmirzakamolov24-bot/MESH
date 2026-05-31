import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  User as UserIcon, 
  Wallet, 
  MessageSquare, 
  Users, 
  Award, 
  Briefcase, 
  Search, 
  Share2, 
  Bell, 
  Shield, 
  Coins, 
  Plus, 
  Check, 
  ExternalLink, 
  ChevronRight, 
  Send, 
  Star, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Lock, 
  FileText, 
  ThumbsUp, 
  Filter, 
  X, 
  Activity, 
  Volume2, 
  Paperclip,
  CheckCircle,
  Trash2,
  CreditCard
} from 'lucide-react';
import { User, Profile, Match, Message, Conversation, ExchangeAgreement, Review, Transaction, CommunityPost, CommunityComment, Notification } from './types.ts';
import { SKILL_TEMPLATES } from './data.ts';

export default function App() {
  // Splash & Onboarding
  const [showSplash, setShowSplash] = useState(true);
  const [syncedUser, setSyncedUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  // App General State
  const [activeTab, setActiveTab] = useState<'home' | 'matches' | 'chat' | 'wallet' | 'community' | 'assistant' | 'admin'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  
  // Admin & Payment states
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(100);
  const [paymentMethod, setPaymentMethod] = useState<'Payme' | 'Click' | 'Stripe' | 'Telegram Stars'>('Payme');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState<any>(null);
  
  // Dynamic collections
  const [profiles, setProfiles] = useState<{ user: User; profile: Profile }[]>([]);
  const [myMatches, setMyMatches] = useState<{ match: Match; user: User; profile: Profile }[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [activeConvoMessages, setActiveConvoMessages] = useState<Message[]>([]);
  const [selectedMatchData, setSelectedMatchData] = useState<{ match: Match; user: User; profile: Profile } | null>(null);
  const [myAgreements, setMyAgreements] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activePostComments, setActivePostComments] = useState<CommunityComment[]>([]);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Input builders
  const [messageInput, setMessageInput] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostOffered, setNewPostOffered] = useState('');
  const [newPostNeeded, setNewPostNeeded] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  
  // Agreement builder
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementTargetUser, setAgreementTargetUser] = useState<User | null>(null);
  const [agreementTitle, setAgreementTitle] = useState('');
  const [agreementOffer, setAgreementOffer] = useState('');
  const [agreementNeed, setAgreementNeed] = useState('');
  const [agreementHours, setAgreementHours] = useState(2);
  const [agreementStake, setAgreementStake] = useState(50);

  // Review builder
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTargetUser, setReviewTargetUser] = useState<User | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSkill, setReviewSkill] = useState('');

  // AI Assistant Chatbot
  const [assistantMessages, setAssistantMessages] = useState<{ sender: 'user' | 'bot'; text: string; timestamp: string }[]>([
    {
      sender: 'bot',
      text: "SkillMesh Uyushmasi elita hamjamiyatiga xush kelibsiz. Men sizning Uyushma Masteri AI moslashtiruvchingiz va nazoratchingizman.\n\nMendan o'zingizni qiziqtirgan har qanday narsani so'rang! Men quyidagilarni bajara olaman:\n* Hamkorlik qilish uchun eng mos keladigan profillarni taklif qilish\n* $MESH ko'rinishida kafolatlangan garov kiritishni o'rgatish\n* Yuqori ishonch reytingi (trust score) to'plash uchun mahoratingiz ro'yxatini qayta tartiblashda yordam berish.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [assistantInput, setAssistantInput] = useState('');

  // Notifications bell trigger state
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // UI Utilities
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Custom manual Auth inputs
  const [customTelegramId, setCustomTelegramId] = useState('73327');
  const [customUsername, setCustomUsername] = useState('shox_jaxon');
  const [customFirstName, setCustomFirstName] = useState('Shoxjaxon');
  const [customLastName, setCustomLastName] = useState('Mirzakamolov');
  
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [editActivityLevel, setEditActivityLevel] = useState<'High' | 'Medium' | 'Low'>('High');
  const [editOfferedSkills, setEditOfferedSkills] = useState<{ name: string; category: string; level: 'Beginner' | 'Intermediate' | 'Expert' }[]>([]);
  const [editNeededSkills, setEditNeededSkills] = useState<string[]>([]);

  // Ref for chat auto-scrolling
  const chatEndRef = useRef<HTMLDivElement>(null);
  const assistantEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConvoMessages]);

  useEffect(() => {
    if (assistantEndRef.current) {
      assistantEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [assistantMessages]);

  // Handle showing transient Toast alerts
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Perform automatic authentication on mount or login
  const handleAuthSync = async (forceParams?: { id: string; username: string; firstName: string; lastName: string }) => {
    try {
      setLoadingAction('Bulutli tarvoza orqali autentifikatsiya qilinmoqda...');
      const reqBody = forceParams ? {
        id: forceParams.id,
        username: forceParams.username,
        first_name: forceParams.firstName,
        last_name: forceParams.lastName,
        photo_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${forceParams.username}`,
        language_code: 'uz'
      } : {
        id: customTelegramId,
        username: customUsername,
        first_name: customFirstName,
        last_name: customLastName,
        photo_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${customUsername}`,
        language_code: 'uz'
      };

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setSyncedUser(data.user);
      setUserProfile(data.profile);
      setEditBio(data.profile.bio);
      setEditLocation(data.profile.location);
      setEditLanguage(data.profile.language);
      setEditActivityLevel(data.profile.activityLevel);
      setEditOfferedSkills(data.profile.offeredSkills);
      setEditNeededSkills(data.profile.neededSkills);

      showToast(`Xush kelibsiz! @${data.user.username} muvaffaqiyatli sinxronizatsiya qilindi.`);
      setShowSplash(false);
      
      // Fetch dynamic dependencies on startup
      loadGlobalData(data.user.id);
    } catch (err: any) {
      console.error(err);
      showToast(`Sinxronizatsiya ulanish xatosi: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const loadGlobalData = async (uid: string) => {
    try {
      // Parallelize listings fetching
      const [resProfiles, resMatches, resConvos, resAgs, resTxs, resPosts, resNotifs] = await Promise.all([
        fetch(`/api/profiles?exclude=${uid}`),
        fetch(`/api/matches/${uid}`),
        fetch(`/api/chat/conversations/${uid}`),
        fetch(`/api/agreements/${uid}`),
        fetch(`/api/credits/transactions/${uid}`),
        fetch('/api/community/posts'),
        fetch(`/api/notifications/${uid}`)
      ]);

      const dataProfiles = await resProfiles.json();
      const dataMatches = await resMatches.json();
      const dataConvos = await resConvos.json();
      const dataAgs = await resAgs.json();
      const dataTxs = await resTxs.json();
      const dataPosts = await resPosts.json();
      const dataNotifs = await resNotifs.json();

      if (Array.isArray(dataProfiles)) setProfiles(dataProfiles);
      if (Array.isArray(dataMatches)) setMyMatches(dataMatches);
      if (Array.isArray(dataConvos)) setConversations(dataConvos);
      if (Array.isArray(dataAgs)) setMyAgreements(dataAgs);
      if (Array.isArray(dataTxs)) setTransactions(dataTxs);
      if (Array.isArray(dataPosts)) setPosts(dataPosts);
      if (Array.isArray(dataNotifs)) {
         setNotifications(dataNotifs);
         setUnreadCount(dataNotifs.filter((n: Notification) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to load synchronous dashboard listings:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAdminStats();
    }
  }, [activeTab]);

  // Perform standard polling or live update synchronization
  useEffect(() => {
    if (!syncedUser) return;
    const interval = setInterval(() => {
      loadGlobalData(syncedUser.id);
    }, 12000); // Poll list directories every 12 seconds
    return () => clearInterval(interval);
  }, [syncedUser]);

  // Load chat logs on active thread change
  useEffect(() => {
    if (!activeConvoId || !syncedUser) return;
    const loadConversationMessages = async () => {
      try {
        const res = await fetch(`/api/chat/messages/${activeConvoId}?userId=${syncedUser.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
           setActiveConvoMessages(data);
        }
      } catch (err) {
         console.error('Error listing chats:', err);
      }
    };
    loadConversationMessages();
    const chatInterval = setInterval(loadConversationMessages, 4000); // snappy direct chat updates
    return () => clearInterval(chatInterval);
  }, [activeConvoId, syncedUser]);

  // Sync profile update
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncedUser) return;

    try {
      setLoadingAction('Yangi bio ma\'lumotlar saqlanmoqda...');
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: syncedUser.id,
          bio: editBio,
          location: editLocation,
          language: editLanguage,
          activityLevel: editActivityLevel,
          offeredSkills: editOfferedSkills,
          neededSkills: editNeededSkills
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setUserProfile(data.profile);
      setEditProfileOpen(false);
      showToast('Reputatsiya biografiyasi, ko\'nikmalar va parametrlar muvaffaqiyatli yangilandi.');
    } catch (err: any) {
      showToast(`Tahrirlash muvaffaqiyatsiz bo'ldi: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Compute AI Match compatibility Index
  const handleInitiateComputeMatch = async (targetUserId: string) => {
    if (!syncedUser) return;
    try {
      setLoadingAction('AI hamjamiyati almashinuv sinergiyasini tahlil qilmoqda...');
      const res = await fetch('/api/matches/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: syncedUser.id,
          targetUserId
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Find partner details to display
      const targetWrap = profiles.find(p => p.user.id === targetUserId);
      if (targetWrap) {
        setSelectedMatchData({
          match: data,
          user: targetWrap.user,
          profile: targetWrap.profile
        });
        setActiveTab('matches');
        showToast(`AI hamkorlik indeksi aniqlandi: ${data.compatibilityScore}% moslik!`);
      }
    } catch (err: any) {
      showToast(`Moslikni hisoblashda xatolik: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Accept/Connect Match connection channels
  const handleConnectMatch = async (matchId: string) => {
    try {
      setLoadingAction('To\'g\'ridan-to\'g\'ri chat va kelishuv liniyalari ulanmoqda...');
      const res = await fetch('/api/matches/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      await loadGlobalData(syncedUser!.id);
      setActiveConvoId(data.conversationId);
      setActiveTab('chat');
      setSelectedMatchData(null);
      showToast('Almashinuv kanali ochildi! Shartnoma taklifingizni yuborishingiz mumkin.');
    } catch (err: any) {
      showToast(`Ulanish rad etildi: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Claim Gold Faucet token freebies
  const handleClaimFaucet = async () => {
    if (!syncedUser) return;
    try {
      setLoadingAction('Kunlik ekotizim $MESH token bonusi olinmoqda...');
      const res = await fetch('/api/credits/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: syncedUser.id })
      });
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error);
        return;
      }
      
      if (data.profile) {
        setUserProfile(data.profile);
        showToast('+20 MESH muvaffaqiyatli minalandi! Balansingiz yangilandi.');
        loadGlobalData(syncedUser.id);
      }
    } catch (err: any) {
      showToast(`Kran orqali olishda xatolik: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Upgrade active premium levels
  const handleUpgradePremium = async () => {
    if (!syncedUser) return;
    try {
      setLoadingAction('VIP Oltin Muhr faollashtirilmoqda...');
      const res = await fetch('/api/profile/premium', {
        method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ userId: syncedUser.id, isPremium: true })
      });
      const data = await res.json();
      if (data.user) {
         setSyncedUser(data.user);
         setUserProfile(data.profile);
         showToast('Elite sinfidagi Premium maqom faollashtirildi! 150 MESH bonus taqdim etildi.');
         loadGlobalData(syncedUser.id);
      }
    } catch (err) {
       showToast('Premium faollashtirishda to\'lov xatoligi yuz berdi.');
    } finally {
       setLoadingAction(null);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConvoId || !syncedUser) return;

    const backupText = messageInput;
    setMessageInput('');
    try {
      const res = await fetch('/api/chat/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvoId,
          senderId: syncedUser.id,
          text: backupText
        })
      });
      const data = await res.json();
      setActiveConvoMessages(prev => [...prev, data]);
    } catch (err) {
      showToast('Xabar yetkazib berilmadi.');
    }
  };

  // Simulate attaching an illustrative template or brief audio
  const handleSendAttachment = async (type: 'demo' | 'voice') => {
    if (!activeConvoId || !syncedUser) return;
    try {
      const payload = type === 'demo' ? {
        conversationId: activeConvoId,
        senderId: syncedUser.id,
        text: '📎 Figma shablon xomaki maketi ulashildi.fig',
        attachmentUrl: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400'
      } : {
        conversationId: activeConvoId,
        senderId: syncedUser.id,
        text: '🎤 IELTS talaffuz testi namunasi (12s)',
        voiceUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
      };

      const res = await fetch('/api/chat/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setActiveConvoMessages(prev => [...prev, data]);
      showToast(`${type === 'demo' ? 'Fayl' : 'Ovozli xabar namunasi'} muvaffaqiyatli ulashildi.`);
    } catch (err) {
      showToast('Fayl ilova qilish simulyatsiyasi bajarilmadi.');
    }
  };

  // Submit swap agreement proposal
  const handleProposeAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncedUser || !agreementTargetUser) return;

    try {
      setLoadingAction('Almashinuv parametrlari Eskrou vasiyligida qayd etilmoqda...');
      const res = await fetch('/api/agreements/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposerId: syncedUser.id,
          receiverId: agreementTargetUser.id,
          title: agreementTitle,
          offeredSkill: agreementOffer,
          neededSkill: agreementNeed,
          hours: agreementHours,
          creditStaked: agreementStake
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast(`Eskrou taklif qilindi! Yetkazib berilgunga qadar eskrouda ${agreementStake} MESH bloklandi.`);
      setShowAgreementModal(false);
      
      // Auto transition to Chat/Agreements tab to review signature needs
      await loadGlobalData(syncedUser.id);
      setActiveTab('home');
    } catch (err: any) {
      showToast(`Taklif rad etildi: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Sign trade contract
  const handleSignAgreement = async (agreementId: string) => {
    if (!syncedUser) return;
    try {
      setLoadingAction('Raqamli imzo ijro etilmoqda va garov tekshirilmoqda...');
      const res = await fetch('/api/agreements/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId, userId: syncedUser.id })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast('Almashinuv imzolandi. Garov endilikda AI nazorati ostida bloklandi.');
      await loadGlobalData(syncedUser.id);
    } catch (err: any) {
      showToast(`Imzo tasdiqlash bajarilmadi: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Complete and release MESH
  const handleCompleteAgreement = async (ag: any) => {
    if (!syncedUser) return;
    try {
      setLoadingAction('Eskrou mablag\'larini chiqarish ko\'rsatmalari uzatilmoqda...');
      const res = await fetch('/api/agreements/complete', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ agreementId: ag.id, userId: syncedUser.id })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast(`Kelishuv muvaffaqiyatli yakunlandi! Mentorga ${ag.creditStaked} $MESH tokenlari yuborildi.`);
      
      // Launch Rating prompts targetting partner
      const partnerUserObj = ag.proposerId === syncedUser.id ? ag.partner : dbGetUserLocal(ag.proposerId);
      if (partnerUserObj) {
         setReviewTargetUser(partnerUserObj);
         setReviewSkill(ag.offeredSkill);
         setReviewText('');
         setShowReviewModal(true);
      }

      await loadGlobalData(syncedUser.id);
    } catch (err: any) {
       showToast(`Tasdiqlash bajarilmadi: ${err.message}`);
    } finally {
       setLoadingAction(null);
    }
  };

  const dbGetUserLocal = (id: string) => {
     const p = profiles.find(pr => pr.user.id === id);
     return p ? p.user : null;
  };

  // Submit Trust Review stars feedback
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncedUser || !reviewTargetUser) return;

    try {
      setLoadingAction('Foydalanuvchi reyting yulduzchalari va reputatsiya ma\'lumotlari hisoblanmoqda...');
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: syncedUser.id,
          targetId: reviewTargetUser.id,
          rating: reviewRating,
          text: reviewText,
          skillSwapped: reviewSkill
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast(`Fikr qoldirildi! @${reviewTargetUser.firstName} ishonch reytingi muvaffaqiyatli oshirildi.`);
      setShowReviewModal(false);
      await loadGlobalData(syncedUser.id);
    } catch (err: any) {
      showToast(`Fikr bildirish amalga oshmadi: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // --- Admin Capabilities ---
  const fetchAdminStats = async () => {
    try {
      setAdminLoading(true);
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch (e) {
      console.error('Error fetching admin statistics:', e);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("Haqiqatan ham ushbu foydalanuvchini platformadan butunlay o'chirib tashlamoqchimisiz?")) return;
    try {
      setLoadingAction("Foydalanuvchi profilini o'chirish...");
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid })
      });
      if (res.ok) {
        showToast("Foydalanuvchi muvaffaqiyatli o'chirildi.");
        fetchAdminStats();
        if (syncedUser) {
          loadGlobalData(syncedUser.id);
        }
      }
    } catch (e: any) {
      showToast(`O'chirishda xatolik: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeletePost = async (pid: string) => {
    if (!window.confirm("Haqiqatan ham ushbu kvest/postni o'chirib tashlamoqchimisiz?")) return;
    try {
      setLoadingAction("Kvestni o'chirish...");
      const res = await fetch('/api/admin/posts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: pid })
      });
      if (res.ok) {
        showToast("Kvest muvaffaqiyatli o'chirildi.");
        fetchAdminStats();
        if (syncedUser) {
          loadGlobalData(syncedUser.id);
        }
      }
    } catch (e: any) {
      showToast(`Postni o'chirishda xatolik: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAdminResolveAgreement = async (aid: string, outcome: 'release' | 'refund') => {
    const confirmationMsg = outcome === 'release' 
      ? "Kafolatlangan $MESH tokenlarini Mentor (Qabul qiluvchi) balansiga o'tkazmoqchimisiz?"
      : "Kafolatlangan $MESH tokenlarini Proposer (Taklif etuvchi) balansiga qaytarmoqchimisiz?";
    if (!window.confirm(confirmationMsg)) return;

    try {
      setLoadingAction("Hakamlik qarorini ijro etish...");
      const res = await fetch('/api/admin/agreements/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: aid, outcome })
      });
      if (res.ok) {
        showToast("Hakamlik qarori muvaffaqiyatli ijro etildi va hisob-kitob qoyasiga yetkazildi!");
        fetchAdminStats();
        if (syncedUser) {
          await loadGlobalData(syncedUser.id);
          // Refetch userProfile to update display credits
          const ures = await fetch(`/api/profile/${syncedUser.id}`);
          if (ures.ok) {
            const udata = await ures.json();
            setUserProfile(udata.profile);
          }
        }
      }
    } catch (e: any) {
      showToast(`Hakamlikda xatolik: ${e.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // --- Simulated Payment System Integration & Purchase ---
  const handlePurchaseMesh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncedUser) return;
    try {
      setIsProcessingPayment(true);
      await new Promise((res) => setTimeout(res, 1800));

      const res = await fetch('/api/payment/buy-mesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: syncedUser.id,
          amount: paymentAmount,
          method: paymentMethod
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.profile);
        setPaymentSuccessReceipt({
          amount: paymentAmount,
          method: paymentMethod,
          refId: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
          time: new Date().toISOString()
        });
        showToast(`Muvaffaqiyatli! Hamyoningizga +${paymentAmount} $MESH kiritildi.`);
        loadGlobalData(syncedUser.id);
      }
    } catch (err: any) {
      showToast(`To'lov xatosi: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Share Community Quest request
  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncedUser || !newPostTitle.trim()) return;

    try {
      setLoadingAction('E\'lonlar doskasi koordinatalari yuklanmoqda...');
      const res = await fetch('/api/community/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: syncedUser.id,
          title: newPostTitle,
          content: newPostContent,
          offeredSkill: newPostOffered,
          neededSkill: newPostNeeded
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast('Ekotizim ayirboshlash kvesti hamjamiyat forumiga joylandi!');
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostOffered('');
      setNewPostNeeded('');
      await loadGlobalData(syncedUser.id);
    } catch (err: any) {
      showToast(`Kvest yaratishda xatolik: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Like forum post
  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch('/api/community/posts/like', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ postId })
      });
      const data = await res.json();
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: data.likes } : p));
    } catch (err) {
       console.error(err);
    }
  };

  // Load comments
  const handleOpenComments = async (postId: string) => {
    setSelectedPostIdForComments(postId);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`);
      const data = await res.json();
      if (Array.isArray(data)) {
         setActivePostComments(data);
      }
    } catch (err) {
       console.error(err);
    }
  };

  // Post comment
  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncedUser || !selectedPostIdForComments || !newCommentText.trim()) return;

    try {
      const res = await fetch('/api/community/comments/create', {
        method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            postId: selectedPostIdForComments,
            authorId: syncedUser.id,
            content: newCommentText
         })
      });
      const data = await res.json();
      setActivePostComments(prev => [...prev, data]);
      setNewCommentText('');
      
      // increment count locally
      setPosts(prev => prev.map(p => p.id === selectedPostIdForComments ? { ...p, commentsCount: p.commentsCount + 1 } : p));
      showToast('Maslahat/taklifingiz foydalanuvchi bilan o\'rtoqlashildi.');
    } catch (err) {
       showToast('Fikr qoldirish amalga oshmadi.');
    }
  };

  // Post to AI Guildmaster Assistant Chatbot
  const handleSendAssistantMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim() || !syncedUser) return;

    const query = assistantInput;
    setAssistantInput('');
    setAssistantMessages(prev => [...prev, { sender: 'user', text: query, timestamp: new Date().toISOString() }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai-assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: syncedUser.id,
          message: query,
          history: assistantMessages
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAssistantMessages(prev => [...prev, { sender: 'bot', text: data.text, timestamp: data.timestamp }]);
    } catch (err: any) {
      setAssistantMessages(prev => [...prev, { 
        sender: 'bot', 
        text: `Konsultatsiya to'xtatildi: ${err.message}. Mening o'ta o'lchamli tranzistorlarim hozir sovuq ishlamoqda. Hozirgi ishonch reytingingiz bilan faxrlaning!`, 
        timestamp: new Date().toISOString() 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Dismiss notification
  const handleMarkNotificationRead = async (id: string, link?: string) => {
     try {
       await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: id })
       });
       if (link) {
          setActiveTab(link as any);
          setShowNotificationsModal(false);
       }
       await loadGlobalData(syncedUser!.id);
     } catch (err) {
        console.error(err);
     }
  };

  // Helper arrays for filters
  const CATEGORIES = [
    { label: 'Barchasi', value: 'All' },
    { label: 'Dasturlash', value: 'Programming' },
    { label: 'Tillar', value: 'Languages' },
    { label: 'Dizayn', value: 'Design' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Biznes', value: 'Business' }
  ];

  const filteredExploreProfiles = profiles.filter(wrap => {
    const matchesSearch = 
      wrap.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wrap.profile.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wrap.profile.offeredSkills.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      wrap.profile.neededSkills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = 
      filterCategory === 'All' || 
      wrap.profile.offeredSkills.some(s => s.category.toLowerCase() === filterCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  // Hot bootstrap defaults to avoid long setup steps for testing
  const runDefaultDemo = (type: 'devon' | 'elena' | 'newbie') => {
     if (type === 'devon') {
        setCustomTelegramId('1204');
        setCustomUsername('devon_codes');
        setCustomFirstName('Devon');
        setCustomLastName('Zhao');
        handleAuthSync({ id: '1204', username: 'devon_codes', firstName: 'Devon', lastName: 'Zhao' });
     } else if (type === 'elena') {
        setCustomTelegramId('3090');
        setCustomUsername('elena_english');
        setCustomFirstName('Elena');
        setCustomLastName('Vasilieva');
        handleAuthSync({ id: '3090', username: 'elena_english', firstName: 'Elena', lastName: 'Vasilieva' });
     } else {
        setCustomTelegramId('73327');
        setCustomUsername('shox_jaxon');
        setCustomFirstName('Shoxjaxon');
        setCustomLastName('Mirzakamolov');
        handleAuthSync({ id: '73327', username: 'shox_jaxon', firstName: 'Shoxjaxon', lastName: 'Mirzakamolov' });
     }
  };

  return (
    <div className="relative min-h-screen bg-[#020202] text-white flex items-center justify-center font-['Inter',_sans-serif] overflow-x-hidden pb-12 pt-8 px-4">
      
      {/* Dynamic Background Premium Glows */}
      <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-[#F5B933] opacity-[0.02] blur-[140px] pointer-events-none rounded-full"></div>
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-[#F5B933] opacity-[0.03] blur-[150px] pointer-events-none rounded-full"></div>

      {/* Global Toast Alerts */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#1B1B1B] text-[#F5B933] px-6 py-4 rounded-2xl border border-gradient z-50 flex items-center gap-3 shadow-2xl transition-all animate-bounce max-w-sm">
          <Sparkles className="w-5 h-5 animate-pulse text-[#F5B933]" />
          <p className="text-xs font-semibold tracking-wide text-white leading-relaxed">{toastMessage}</p>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingAction && (
        <div className="fixed inset-0 bg-[#050505]/95 z-50 flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-t-[#F5B933] border-r-transparent border-b-[#F5B933] border-l-transparent animate-spin p-1">
             <div className="w-full h-full rounded-full bg-[#111111] flex items-center justify-center">
                <span className="text-[#F5B933] text-[10px] uppercase font-black tracking-widest italic">SM</span>
             </div>
          </div>
          <p className="text-xs uppercase tracking-widest text-[#A0A0A0] font-semibold">{loadingAction}</p>
        </div>
      )}

      {/* Outer surrounding wrapper simulating responsive high fidelity desktop workspace framework */}
      <div className="w-full max-w-md bg-[#050505] rounded-[48px] border-[6px] border-[#161616]/90 relative shadow-[0_15px_60px_-15px_rgba(245,185,51,0.15)] flex flex-col overflow-hidden h-[790px]">
        
        {/* Status Bar Indicator emulation */}
        <div className="h-10 flex items-center justify-between px-8 pt-4 w-full opacity-60 text-[10px] font-semibold tracking-wide shrink-0">
          <span>9:41 AM</span>
          <div className="flex gap-2 items-center">
            <span className="text-[9px] uppercase tracking-widest text-[#F5B933]">5G</span>
            <div className="w-4 h-2.5 bg-white/70 rounded-xs flex p-0.5">
               <div className="w-full h-full bg-black rounded-xs"></div>
            </div>
          </div>
        </div>

        {/* Brand Header */}
        <div id="sm-navbar" className="flex items-center justify-between px-6 py-3 border-b border-white/[0.04] bg-[#070707] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full border border-[#F5B933] p-0.5 shadow-[0_0_12px_rgba(245,185,51,0.2)]">
              <div className="w-full h-full bg-[#161616] rounded-full flex items-center justify-center text-[#F5B933] font-black text-xs italic tracking-tighter">SM</div>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-[#F5B933] uppercase">SkillMesh</h1>
              <div className="flex items-center gap-1 opacity-60 text-[8px] uppercase tracking-widest font-semibold text-white/80">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span>Tarmoq Faol</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Wallet Quick view */}
            {syncedUser && (
              <button 
                onClick={() => setActiveTab('wallet')}
                className="bg-[#111] px-3 py-1.5 rounded-full border border-white/[0.06] flex items-center gap-1.5 hover:border-[#F5B933]/50 transition cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5 text-[#F5B933] animate-pulse" />
                <span className="text-white text-xs font-bold">{userProfile?.credits ?? 0}</span>
                <span className="text-[8px] uppercase text-[#A0A0A0] font-black tracking-wider">MESH</span>
              </button>
            )}

            {/* Admin Shield Console */}
            {syncedUser && (
              <button 
                onClick={() => setActiveTab(activeTab === 'admin' ? 'home' : 'admin')}
                className={`relative w-8 h-8 rounded-full border flex items-center justify-center transition cursor-pointer ${
                  activeTab === 'admin' 
                    ? 'bg-[#F5B933] text-black border-[#F5B933] shadow-[0_0_12px_rgba(245,185,51,0.4)] animate-pulse' 
                    : 'bg-[#111] text-white/80 border-white/[0.06] hover:border-[#F5B933]/50'
                }`}
                title="Boshqaruv Operator Pulti"
              >
                <Shield className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Notifications Alert Bell */}
            {syncedUser && (
              <button 
                onClick={() => setShowNotificationsModal(true)}
                className="relative w-8 h-8 rounded-full bg-[#111] border border-white/[0.06] flex items-center justify-center hover:border-white/20 transition cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-white/80" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse border border-[#050505]">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* -------------------------------------- */}
        {/* INTERACTIVE SCREENS WORKSPACE */}
        {/* -------------------------------------- */}
        <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col pb-4 bg-[#050505] relative">
          
          {/* A. SPLASH SCREEN & ONBOARDING */}
          {showSplash && (
            <div className="absolute inset-0 bg-[#050505] z-30 flex flex-col p-6 overflow-y-auto justify-between">
              <div className="flex flex-col items-center text-center mt-12 gap-8">
                
                {/* Glowing Premium Logo */}
                <div className="relative">
                  <div className="absolute inset-0 w-24 h-24 bg-[#F5B933] opacity-25 rounded-full blur-2xl"></div>
                  <div className="w-24 h-24 rounded-[32px] border-2 border-[#F5B933] bg-[#111111] flex items-center justify-center shadow-[0_0_40px_rgba(245,185,51,0.25)] relative z-10 p-1">
                    <div className="w-full h-full rounded-[24px] bg-[#161616] flex flex-col items-center justify-center border border-[#F5B933]/20">
                      <span className="text-3xl font-black italic tracking-tighter text-[#F5B933]">SM</span>
                      <span className="text-[7.5px] font-black tracking-widest text-white/50 uppercase -mt-1">MESH DARVOZA</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-black text-white tracking-tight uppercase">SkillMesh Platformasi</h1>
                  <p className="text-[#A0A0A0] text-xs max-w-xs leading-relaxed">
                    Global <span className="text-white font-semibold">Inson Kapitali Ayirboshlash Tarmog'iga</span> xush kelibsiz. Mutaxassislik qobiliyatingizni almashing, ishonchli reyting ochkolarini to'plang va xavfsiz tokenlarni garovga qo'ying. Naqd pul talab etilmaydi.
                  </p>
                </div>

                {/* Instant Login Block */}
                <div className="w-full bg-[#111] rounded-2xl p-5 border border-white/[0.06] flex flex-col gap-3.5">
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#F5B933] text-left">Autentifikatsiya Sozlamalari</span>
                  
                  {/* Manual Inputs block */}
                  <div className="flex flex-col gap-3 text-left">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-white/50 mb-1 block">Telegram Foydalanuvchi ID</label>
                      <input 
                        type="text" 
                        value={customTelegramId}
                        onChange={e => setCustomTelegramId(e.target.value)}
                        className="w-full bg-[#161616] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5B933]"
                        placeholder="Masalan: 73327"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] mb-1 block">Foydalanuvchi nomi</label>
                        <input 
                          type="text" 
                          value={customUsername}
                          onChange={e => setCustomUsername(e.target.value)}
                          className="w-full bg-[#161616] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-[#F5B933]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] mb-1 block">Ism</label>
                        <input 
                          type="text" 
                          value={customFirstName}
                          onChange={e => setCustomFirstName(e.target.value)}
                          className="w-full bg-[#161616] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5B933]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button 
                  onClick={() => handleAuthSync()}
                  className="w-full bg-gradient-to-r from-[#F5B933] to-[#FFD573] text-[#050505] font-black text-xs py-4 rounded-2xl uppercase tracking-widest shadow-[0_4px_25px_rgba(245,185,51,0.25)] hover:opacity-90 transition cursor-pointer"
                >
                  Xavfsiz Sinxronizatsiya
                </button>
                <span className="text-[9px] text-[#A0A0A0] text-center uppercase tracking-widest opacity-60">Telegram Mini App API Ulandi</span>
              </div>
            </div>
          )}

          {/* B. HOME DASHBOARD TAB */}
          {activeTab === 'home' && syncedUser && (
            <div className="px-5 py-2 flex flex-col gap-5">
              
              {/* Premium Reputation Progress Status */}
              <div className="bg-[#111111] rounded-[24px] p-5 border border-white/[0.04] relative overflow-hidden shadow-xl mt-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle,rgba(245,185,51,0.12)_0%,transparent_70%)]"></div>
                
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold">REPUTATSIYA MAQOMI</span>
                    <span className="text-[15px] font-black flex items-center gap-1.5 text-white">
                      {syncedUser.isPremium ? 'Elite Uyushma Masteri' : 'Katta Mesh Hunarmandi'} 
                      <span className="text-[#F5B933]">★</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold">Ishonch reytingi</span>
                    <span className="text-2xl font-black text-[#F5B933]/90 italic select-none">
                      {userProfile?.trustScore ?? 80}.0
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-[#1A1A1A] rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full bg-gradient-to-r from-[#F5B933] to-[#FFD573] shadow-[0_0_12px_rgba(245,185,51,0.6)] rounded-full transition-all duration-1000"
                    style={{ width: `${userProfile?.trustScore ?? 80}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-[#A0A0A0] uppercase tracking-widest font-bold">
                   <span>Ikki tomonlama almashinuv ko'rsatkichlari</span>
                   <button 
                      onClick={() => setEditProfileOpen(true)}
                      className="text-[#F5B933] hover:underline cursor-pointer font-bold"
                   >
                     Malakani yangilash
                   </button>
                </div>
              </div>

              {/* Admin Panel Quick Access Button card */}
              <div 
                onClick={() => setActiveTab('admin')}
                className="bg-gradient-to-r from-yellow-950/25 to-[#F5B933]/15 border border-[#F5B933]/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-[#F5B933]/50 transition group shadow-[0_0_15px_rgba(245,185,51,0.05)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-black/40 flex items-center justify-center text-[#F5B933] border border-[#F5B933]/20 shadow-[0_0_8px_rgba(245,185,51,0.15)]">
                    <Shield className="w-4.5 h-4.5 group-hover:scale-110 transition duration-300" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Tizim Operator Pulti (Admin)</h4>
                    <p className="text-[9px] text-[#A0A0A0] leading-tight mt-0.5">Foydalanuvchilar, kvestlar hamda nizolarni arbitraj va nazorat qilish.</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#F5B933]/70 group-hover:translate-x-1 transition" />
              </div>

              {/* Quick Actions Panel */}
              <div className="grid grid-cols-2 gap-3.5">
                 <button 
                   onClick={() => setActiveTab('matches')} 
                   className="bg-[#161616] border border-white/[0.04] p-4 rounded-2xl flex flex-col gap-1.5 text-left hover:border-[#F5B933]/30 transition cursor-pointer"
                 >
                    <Sparkles className="w-5 h-5 text-[#F5B933]" />
                    <span className="text-xs font-bold text-white mb-0.5 mt-1">AI Mukammal Moslik</span>
                    <span className="text-[9px] text-[#A0A0A0] font-medium leading-relaxed">Ikki tomonlama moslik matritsalarini bir zumda hisoblang.</span>
                 </button>
                 <button 
                   onClick={() => setActiveTab('assistant')} 
                   className="bg-[#161616] border border-white/[0.04] p-4 rounded-2xl flex flex-col gap-1.5 text-left hover:border-[#F5B933]/30 transition animate-pulse cursor-pointer"
                 >
                    <Activity className="w-5 h-5 text-[#F5B933]" />
                    <span className="text-xs font-bold text-white mb-0.5 mt-1">Uyushma Nazoratchisi</span>
                    <span className="text-[9px] text-[#A0A0A0] font-medium leading-relaxed">Gemini AI dan maxsus takliflar yozishni so'rang.</span>
                 </button>
              </div>

              {/* AI PERFECT MESH OF THE DAY HERO DISPLAY */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-[10px] font-black tracking-widest uppercase text-white/80">AI MUKAMMAL MOSLIK TAVSIYALARI</h2>
                  <span className="text-[9px] text-[#F5B933] font-black tracking-wider animate-pulse">ALMASHINUV KANALLARI FAOL</span>
                </div>
                
                <div className="bg-[#161616] rounded-3xl p-1 border border-white/[0.04] shadow-md">
                  <div className="bg-[#1B1B1B] rounded-[22px] p-4.5 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#222] to-[#111] border border-[#F5B933]/20 flex items-center justify-center text-md font-bold text-[#F5B933]">
                         {profiles.length > 0 ? profiles[0]?.user.firstName.substring(0, 1) : 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-md truncate text-white">{profiles.length > 0 ? `${profiles[0]?.user.firstName} ${profiles[0]?.user.lastName}` : 'Alisher V.'}</span>
                          <span className="bg-[#F5B933]/10 text-[#F5B933] text-[8px] px-2 py-0.5 rounded-full border border-[#F5B933]/20 font-black">99% Moslik</span>
                        </div>
                        <p className="text-[#A0A0A0] text-[10px] truncate font-medium">{profiles.length > 0 ? `${profiles[0]?.profile.location}` : 'Full-Stack muhandis • Zurich'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-[#111] p-3 rounded-xl border border-white/[0.02]">
                      <div className="text-center flex-1">
                        <p className="text-[8px] uppercase font-bold text-[#A0A0A0] mb-1 tracking-wider">TAKLIF ETADI</p>
                        <p className="text-[10px] font-bold text-[#F5B933] truncate">
                           {profiles.length > 0 ? profiles[0]?.profile.offeredSkills.map(s => s.name).join(', ') : 'Next.js 15 / AI Arch'}
                        </p>
                      </div>
                      <div className="text-[#F5B933] text-sm font-light px-3 select-none">↔</div>
                      <div className="text-center flex-1">
                        <p className="text-[8px] uppercase font-bold text-[#A0A0A0] mb-1 tracking-wider">TALAB ETADI</p>
                        <p className="text-[10px] font-bold text-white truncate">
                           {profiles.length > 0 ? profiles[0]?.profile.neededSkills.join(', ') : 'Sohaviy Dizayn'}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => profiles.length > 0 ? handleInitiateComputeMatch(profiles[0]?.user.id) : null}
                      className="w-full bg-[#F5B933] text-[#050505] font-black text-xs py-3 rounded-xl uppercase tracking-widest shadow-[0_4px_15px_rgba(245,185,51,0.2)] hover:opacity-90 transition cursor-pointer"
                    >
                      AI Moslashtirishni Boshlash
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTIVE MEMORY AGREEMENTS LOG */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[10px] font-black tracking-widest uppercase text-white/80">Faol Eskrou Kelishuvlari ({myAgreements.length})</h2>
                  <button onClick={() => setActiveTab('wallet')} className="text-[9px] text-[#A0A0A0] hover:underline uppercase font-bold cursor-pointer">Tranzaksiyalar Jurnali</button>
                </div>
                
                {myAgreements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 bg-[#111]/40 rounded-2xl border border-white/[0.03] text-center gap-2">
                     <FileText className="w-5 h-5 text-[#A0A0A0]/60" />
                     <p className="text-[10px] text-[#A0A0A0] uppercase font-bold tracking-wider">Faol eskrou kelishuvlari topilmadi</p>
                     <p className="text-[9px] text-white/40 max-w-[200px]">Ishonchli va xavfsiz kelishuvlarni amalga oshirish uchun foydalanuvchi profilida eskrou shartnomasi tuzing.</p>
                  </div>
                ) : (
                  myAgreements.slice(0, 3).map((ag: any) => (
                    <div key={ag.id} className="p-4 bg-[#111] rounded-2xl border border-white/[0.03] flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white truncate">{ag.title}</p>
                          <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-wider ${
                            ag.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            ag.status === 'agreed' ? 'bg-amber-500/10 text-amber-400 border border-[#F5B933]/20 animate-pulse' :
                            'bg-gray-500/10 text-gray-400 border border-white/10'
                          }`}>
                            {ag.status === 'completed' ? 'Yakunlangan' : ag.status === 'agreed' ? 'Imzolangan' : 'Kutilmoqda'}
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-[#A0A0A0] mt-1 font-medium italic">
                           {ag.offeredSkill} ↔ {ag.neededSkill}
                        </p>

                        <div className="flex items-center gap-1.5 mt-2 text-[9px]">
                          <Coins className="w-3 h-3 text-[#F5B933]" />
                          <span className="font-semibold text-white/80">{ag.creditStaked} $MESH muzlatilgan</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                         {ag.status === 'pending' && !ag.receiverSigned && ag.receiverId === syncedUser.id && (
                            <button 
                              onClick={() => handleSignAgreement(ag.id)}
                              className="px-2.5 py-1.5 bg-[#F5B933] text-black text-[9px] font-black uppercase tracking-wider rounded-lg hover:opacity-90 transition cursor-pointer"
                            >
                               Imzolash
                            </button>
                         )}
                         {ag.status === 'agreed' && (
                            <button 
                              onClick={() => handleCompleteAgreement(ag)}
                              className="px-2.5 py-1.5 bg-green-500 text-black text-[9px] font-black uppercase tracking-wider rounded-lg hover:opacity-90 transition cursor-pointer"
                            >
                               Yakunlash
                            </button>
                         )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* C. MATCHES & SEARCH TAB */}
          {activeTab === 'matches' && syncedUser && (
            <div className="px-5 py-2 flex flex-col gap-4">
              
              {/* If previewing details of a specific computed AI match */}
              {selectedMatchData ? (
                 <div className="flex flex-col gap-4">
                   <button 
                     onClick={() => setSelectedMatchData(null)}
                     className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-[#A0A0A0] hover:text-white mb-2 self-start cursor-pointer"
                   >
                     <ChevronRight className="w-4 h-4 rotate-180" /> Izlanishga Qaytish
                   </button>

                   {/* Golden Core Hologram card */}
                   <div className="bg-[#161616] rounded-3xl p-5 border border-[#F5B933]/30 relative overflow-hidden flex flex-col items-center text-center">
                     <div className="absolute top-0 left-0 w-full h-1/2 bg-[linear-gradient(180deg,rgba(245,185,51,0.08)_0%,transparent_100%)]"></div>
                     
                     <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-[#1b1b1b] to-[#111] p-1 border-2 border-[#F5B933] shadow-[0_0_25px_rgba(245,185,51,0.25)] mb-3">
                       <img 
                         src={selectedMatchData.user.photoUrl} 
                         alt={selectedMatchData.user.firstName} 
                         className="w-full h-full rounded-full object-cover"
                       />
                     </div>

                     <span className="text-[10px] uppercase font-black tracking-widest text-[#F5B933]">AI KOGNITIV JUFTLIK INDEXI</span>
                     <h2 className="text-xl font-black text-white mt-1 ">{selectedMatchData.user.firstName} {selectedMatchData.user.lastName}</h2>
                     <p className="text-xs text-[#A0A0A0] font-medium">{selectedMatchData.profile.location}</p>

                     <div className="mt-4 bg-[#0A0A0A] border border-white/[0.04] px-4 py-2 rounded-full relative z-10">
                        <span className="text-2xl font-black text-[#F5B933] italic">{selectedMatchData.match.compatibilityScore}%</span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-white/50 ml-1.5">Sinergiya darajasi</span>
                     </div>
                   </div>

                   {/* AI Reasoning commentary card */}
                   <div className="bg-[#111] rounded-2xl p-5 border border-white/[0.04] flex flex-col gap-3">
                     <div className="flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-[#F5B933] shrink-0 animate-pulse" />
                       <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Nazoratchi AI Hevristik Tahlili</span>
                     </div>
                     <p className="text-xs text-white/95 leading-relaxed font-normal whitespace-pre-line text-left bg-black/30 p-3 rounded-xl border border-white/[0.02]">
                        {selectedMatchData.match.reasoning}
                     </p>
                   </div>

                   {/* Mutual skills parameters side-by-side */}
                   <div className="grid grid-cols-2 gap-3">
                     <div className="bg-[#111] p-4 rounded-2xl border border-white/5 text-center">
                       <span className="text-[8px] uppercase tracking-wider text-white/40 block mb-2 font-black">ALMASHINUV UCHUN TAKLIF ETADI</span>
                       <div className="flex flex-wrap gap-1 justify-center">
                         {selectedMatchData.match.offeredMatch.map((s, idx) => (
                           <span key={idx} className="bg-[#F5B933]/10 text-[#F5B933] rounded-lg text-[9px] px-2 py-1 border border-[#F5B933]/20 font-semibold">{s}</span>
                         ))}
                       </div>
                     </div>
                     <div className="bg-[#111] p-4 rounded-2xl border border-white/5 text-center">
                       <span className="text-[8px] uppercase tracking-wider text-white/40 block mb-2 font-black">EVZIGA SIZ TAKLIF ETASIZ</span>
                       <div className="flex flex-wrap gap-1 justify-center">
                         {selectedMatchData.match.neededMatch.map((s, idx) => (
                           <span key={idx} className="bg-white/5 text-white/90 rounded-lg text-[9px] px-2 py-1 border border-white/10 font-semibold">{s}</span>
                         ))}
                       </div>
                     </div>
                   </div>

                   {/* Bottom Actions */}
                   <div className="flex flex-col gap-2 mt-2">
                     {selectedMatchData.match.status === 'pending' ? (
                       <button 
                         onClick={() => handleConnectMatch(selectedMatchData.match.id)}
                         className="w-full bg-[#F5B933] text-black font-black text-xs py-4 rounded-2xl uppercase tracking-widest shadow-[0_4px_20px_rgba(245,185,51,0.25)] hover:opacity-90 transition"
                       >
                         Muloqot Kanalini Ochish
                       </button>
                     ) : (
                       <button 
                         onClick={() => {
                           // Navigate straight to thread
                           const matchConvo = conversations.find(
                             c => (c.participantA_id === syncedUser.id && c.participantB_id === selectedMatchData.user.id) ||
                                  (c.participantA_id === selectedMatchData.user.id && c.participantB_id === syncedUser.id)
                           );
                           if (matchConvo) {
                              setActiveConvoId(matchConvo.id);
                              setActiveTab('chat');
                           } else {
                              showToast('Conversational thread loading, please wait.');
                           }
                         }}
                         className="w-full bg-green-500 text-black font-black text-xs py-4 rounded-2xl uppercase tracking-widest hover:bg-opacity-80 transition"
                       >
                         Kanal faol: Suhbatni Ochish
                       </button>
                     )}

                     {/* Set up Escrow Agreement quickly */}
                     {selectedMatchData.match.status === 'connected' && (
                       <button 
                          onClick={() => {
                            setAgreementTargetUser(selectedMatchData.user);
                            setAgreementTitle(`Skill Swap with ${selectedMatchData.user.firstName}`);
                            setAgreementOffer(selectedMatchData.match.neededMatch[0] || '');
                            setAgreementNeed(selectedMatchData.match.offeredMatch[0] || '');
                            setAgreementStake(50);
                            setShowAgreementModal(true);
                          }}
                          className="w-full bg-transparent text-[#F5B933] border border-[#F5B933]/30 font-black text-xs py-3.5 rounded-2xl uppercase tracking-widest hover:bg-[#F5B933]/10 transition"
                       >
                         Draft Escrow Proposal
                       </button>
                     )}
                   </div>

                 </div>
              ) : (
                 // Grid listing of explore directory
                 <div className="flex flex-col gap-4">
                   
                    {/* Search Controls */}
                    <div className="flex flex-col gap-3 mt-1">
                      <div className="relative">
                        <Search className="absolute top-1/2 -translate-y-1/2 left-4 w-4 h-4 text-white/40" />
                        <input 
                          type="text" 
                          placeholder="Skillarni qidirish, masalan: Figma, React, IELTS..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full bg-[#111] border border-white/[0.06] rounded-2xl py-3.5 pl-11 pr-5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#F5B933]/50 focus:ring-1 focus:ring-[#F5B933]/30"
                        />
                      </div>
                      
                      {/* Horizontally scrolling quick category selection chips */}
                      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 shrink-0">
                        {CATEGORIES.map(cat => (
                          <button 
                            key={cat.value}
                            onClick={() => setFilterCategory(cat.value)}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 transition cursor-pointer ${
                              filterCategory === cat.value 
                                ? 'bg-[#F5B933] text-black border border-[#F5B933]' 
                                : 'bg-[#111] text-white/60 border border-white/[0.04] hover:text-white'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Explore Results directory */}
                    <div className="flex flex-col gap-3">
                       <h3 className="text-[10px] font-black tracking-widest text-[#A0A0A0] uppercase px-1">Global Mahorat Egalari Ro'yxati ({filteredExploreProfiles.length})</h3>
                       
                       {filteredExploreProfiles.length === 0 ? (
                         <div className="text-center bg-[#111]/30 p-8 rounded-2xl border border-white/5">
                            <p className="text-xs text-white/50">Ushbu qidiruv bo'yicha kvest kashfiyoti topilmadi.</p>
                         </div>
                       ) : (
                         filteredExploreProfiles.map(wrap => (
                           <div 
                             key={wrap.user.id}
                             onClick={() => handleInitiateComputeMatch(wrap.user.id)}
                             className="p-4 bg-[#111111] rounded-2xl border border-white/[0.04] hover:border-[#F5B933]/30 cursor-pointer transition-all duration-300 flex flex-col gap-3 hover:translate-y-[-2px]"
                           >
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl overflow-hidden relative border border-white/10 shrink-0 bg-[#222]">
                                     <img src={wrap.user.photoUrl} alt={wrap.user.firstName} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                     <div className="flex items-center gap-1.5">
                                        <p className="font-bold text-xs text-white">{wrap.user.firstName}</p>
                                        <span className="text-[8px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded-md uppercase font-black tracking-wider">IR {wrap.profile.trustScore}</span>
                                     </div>
                                     <p className="text-[9px] text-[#A0A0A0] font-medium">{wrap.profile.location}</p>
                                  </div>
                                </div>

                                <div className="text-right">
                                   <span className="text-[9px] text-[#A0A0A0] font-bold block uppercase">Faollik</span>
                                   <span className="text-[9px] text-green-400 font-bold uppercase">{wrap.profile.activityLevel === 'High' ? 'Yuqori' : wrap.profile.activityLevel === 'Medium' ? 'O\'rtacha' : 'Past'}</span>
                                </div>
                              </div>

                              <p className="text-[10px] text-white/70 leading-relaxed truncate font-normal">
                                 {wrap.profile.bio}
                              </p>

                              {/* Skills indicators bar */}
                              <div className="pt-2 border-t border-white/[0.03] flex flex-wrap justify-between items-center gap-2">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[8px] uppercase tracking-wider text-white/40 block">TAKLIF ETADI</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {wrap.profile.offeredSkills.slice(0, 2).map((s, idx) => (
                                        <span key={idx} className="bg-[#F5B933]/10 text-[#F5B933] text-[8px] font-bold px-2 py-0.5 rounded-md border border-[#F5B933]/10">{s.name}</span>
                                      ))}
                                    </div>
                                 </div>
                                 <div className="flex flex-col gap-1 shrink-0">
                                    <span className="text-[8px] uppercase tracking-wider text-white/40 block text-right">TALAB ETADI</span>
                                    <div className="flex gap-1 flex-wrap justify-end">
                                      {wrap.profile.neededSkills.slice(0, 2).map((s, idx) => (
                                        <span key={idx} className="bg-white/5 text-white/80 text-[8px] font-bold px-2 py-0.5 rounded-md border border-white/10">{s}</span>
                                      ))}
                                    </div>
                                 </div>
                              </div>

                           </div>
                         ))
                       )}
                    </div>

                 </div>
              )}

            </div>
          )}

          {/* D. CHAT DIRECT SYSTEM & ARCHIVES */}
          {activeTab === 'chat' && syncedUser && (
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              
              {!activeConvoId ? (
                // Convos List Screen
                <div className="px-5 py-2 flex flex-col gap-3 flex-1 overflow-y-auto scrollbar-none">
                  <h3 className="text-[10px] font-black tracking-widest text-[#A0A0A0] uppercase px-1 mt-1">To'g'ridan-to'g'ri Muloqot Kanallari</h3>
                  
                  {conversations.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                       <MessageSquare className="w-12 h-12 text-[#A0A0A0]/40" />
                       <p className="text-xs text-[#A0A0A0] font-bold uppercase">Hozircha faol muloqot kanallari yo'q</p>
                       <p className="text-[10px] text-white/40 max-w-xs leading-normal">Hamkorlar bo'limiga o'ting va hamkorlar bilan moslikni hisoblab muloqotni boshlang!</p>
                       <button onClick={() => setActiveTab('matches')} className="px-4 py-2 bg-[#F5B933] text-black text-[10px] font-black uppercase rounded-lg">Hamkorlarni topish</button>
                    </div>
                  ) : (
                    conversations.map(convo => {
                      const unread = convo.participantA_id === syncedUser.id ? convo.unreadCountA : convo.unreadCountB;
                      return (
                        <div 
                          key={convo.id}
                          onClick={() => setActiveConvoId(convo.id)}
                          className="p-4 bg-[#111] rounded-2xl border border-white/[0.04] hover:border-[#F5B933]/30 cursor-pointer transition flex items-center justify-between gap-3 "
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[#222] border border-white/10">
                              <img src={convo.partner?.photoUrl} alt={convo.partner?.firstName} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-white truncate">{convo.partner?.firstName} {convo.partner?.lastName}</p>
                              <p className="text-[10px] text-[#A0A0A0] truncate font-medium mt-0.5">{convo.lastMessage || 'Muloqot boshlandi'}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-1.5">
                             <span className="text-[8px] text-[#A0A0A0] font-semibold">
                                {convo.lastMessageTime ? new Date(convo.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                             </span>
                             {unread > 0 && (
                               <span className="bg-[#F5B933] text-black font-black text-[9px] px-1.5 py-0.5 rounded-full select-none animate-pulse">
                                  {unread}
                               </span>
                             )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                // Inside Specific Conversation Room
                <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-hidden min-h-[500px]">
                   
                   {/* Chat Title bar header */}
                   {(() => {
                      const activeConvo = conversations.find(c => c.id === activeConvoId);
                      return (
                        <div className="px-4 py-2 border-b border-white/[0.04] bg-[#0A0A0A] flex items-center justify-between shrink-0">
                          <button 
                            onClick={() => {
                              setActiveConvoId(null);
                              loadGlobalData(syncedUser.id);
                            }}
                            className="text-[#A0A0A0] hover:text-white flex items-center text-[10px] uppercase font-black tracking-widest cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4 rotate-180" /> Orqaga
                          </button>

                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full overflow-hidden bg-[#222]">
                               <img src={activeConvo?.partner?.photoUrl} alt={activeConvo?.partner?.firstName} className="w-full h-full object-cover" />
                             </div>
                             <div className="text-left">
                               <p className="text-xs font-bold text-white">{activeConvo?.partner?.firstName} <span className="font-light text-[9px] text-[#F5B933]">★ {activeConvo?.partnerProfile?.trustScore}</span></p>
                               <span className="text-[8px] text-[#A0A0A0] block -mt-0.5">{activeConvo?.partnerProfile?.location}</span>
                             </div>
                          </div>

                          <button 
                            onClick={() => {
                              setAgreementTargetUser(activeConvo?.partner);
                              setAgreementTitle(`Skill Swap with ${activeConvo?.partner?.firstName}`);
                              setAgreementOffer(activeConvo?.partnerProfile?.neededSkills[0] || 'Python basics');
                              setAgreementNeed(activeConvo?.partnerProfile?.offeredSkills[0]?.name || 'English coaching');
                              setAgreementStake(50);
                              setShowAgreementModal(true);
                            }}
                            className="bg-[#F5B933]/10 text-[#F5B933] border border-[#F5B933]/25 px-2.5 py-1.5 rounded-lg text-[9px] uppercase tracking-wider font-black hover:bg-[#F5B933]/25 transition"
                          >
                             Hamkorlik Taklifi
                          </button>
                        </div>
                      );
                   })()}

                   {/* Scrollable chat body bubble elements */}
                   <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3.5 scrollbar-none bg-[#050505]/30">
                     {activeConvoMessages.map(msg => {
                        const isMe = msg.senderId === syncedUser.id;
                        const isSystem = msg.senderId === 'system';

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="mx-auto max-w-[85%] text-center py-2 px-3.5 rounded-xl bg-[#111] border border-white/5 text-[9px] uppercase tracking-wider font-bold text-[#F5B933]/90 leading-relaxed shadow-lg">
                               {msg.text}
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} text-left`}
                          >
                            <div className={`max-w-[78%] rounded-2xl p-3.5 text-xs relative ${
                              isMe 
                                ? 'bg-[#1b1b1b] text-white border border-white/10 rounded-br-xs' 
                                : 'bg-gradient-to-br from-[#161616] to-[#0A0A0A] text-white border border-white/5 rounded-bl-xs'
                            }`}>
                              
                              {/* If image attachment exists */}
                              {msg.attachmentUrl && (
                                <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                   <img src={msg.attachmentUrl} alt="attachment" className="w-full h-auto object-cover max-h-36" />
                                </div>
                              )}

                              <p className="leading-relaxed whitespace-pre-line font-normal text-[11px]">{msg.text}</p>
                              
                              <div className="flex justify-end items-center gap-1.5 mt-1.5 opacity-50 text-[8px] tracking-wide">
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && (msg.isRead ? <CheckCircle2 className="w-2.5 h-2.5 text-[#F5B933]" /> : <Clock className="w-2.5 h-2.5 text-white/40" />)}
                              </div>

                            </div>
                          </div>
                        );
                     })}
                     <div ref={chatEndRef} />
                   </div>

                   {/* Audio voice player simulation or drafting guides */}
                   <div className="bg-[#0A0A0A] border-t border-white/[0.04] p-3 shrink-0 flex flex-col gap-2">
                     <div className="flex gap-2 justify-center">
                        <button 
                           onClick={() => handleSendAttachment('voice')} 
                           className="flex items-center gap-1 px-3 py-1 bg-[#111] hover:bg-neutral-800 rounded-lg text-[9px] uppercase tracking-wider font-bold text-[#F5B933]"
                        >
                           <Volume2 className="w-3 h-3" /> Ovozli Xabar
                        </button>
                        <button 
                           onClick={() => handleSendAttachment('demo')} 
                           className="flex items-center gap-1 px-3 py-1 bg-[#111] hover:bg-neutral-800 rounded-lg text-[9px] uppercase tracking-wider font-bold text-white/70"
                        >
                           <Paperclip className="w-3 h-3" /> Portfolio.fig yuborish
                        </button>
                     </div>

                     <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Almashinuv maslahatini yozing yoki kerakli soatni so'rang..."
                          value={messageInput}
                          onChange={e => setMessageInput(e.target.value)}
                          className="flex-1 bg-[#111111] border border-white/[0.08] rounded-xl px-3.5 py-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F5B933]/50"
                        />
                        <button 
                          type="submit"
                          className="bg-[#F5B933] text-[#050505] p-3 rounded-xl hover:opacity-90 transition cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                     </form>
                   </div>

                </div>
              )}

            </div>
          )}

          {/* E. CREDITS WALLET TAB */}
          {activeTab === 'wallet' && syncedUser && (
            <div className="px-5 py-2 flex flex-col gap-4">
              
              {/* Massive Holographic gold Balance widget */}
              <div className="bg-gradient-to-br from-[#1b1b1b] to-[#0A0A0A] rounded-[28px] p-6 border border-[#F5B933]/30 text-center relative overflow-hidden mt-2">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#F5B933] opacity-[0.05] blur-[80px] rounded-full"></div>
                 
                 <span className="text-[10px] uppercase font-black tracking-widest text-[#A0A0A0]">Global Inson Kapitali Token Rezervi</span>
                 
                 <div className="my-4 flex items-center justify-center gap-2">
                    <Coins className="w-7 h-7 text-[#F5B933] animate-bounce" />
                    <span className="text-4xl font-extrabold italic text-white tracking-tighter">
                      {userProfile?.credits ?? 0}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-[#F5B933] pt-2">$MESH</span>
                 </div>

                 <p className="text-[10px] text-white/50 max-w-xs mx-auto mb-5 leading-normal">
                    Ushbu balans hamkorlik almashinuvidan shakllanadi. Shartnomalarda MESH garovini muzlatish xavfsiz yetkazib berish kafolatidir. Reputatsiyani oshirish ishonch darajasini yuksaltiradi.
                 </p>

                 <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleClaimFaucet()}
                      className="bg-[#222]/80 text-[#F5B933] font-bold border border-white/5 text-[9px] uppercase tracking-wider py-3 rounded-xl hover:bg-[#333] transition cursor-pointer"
                    >
                       Alish Bonus (+20)
                    </button>
                    {!syncedUser.isPremium ? (
                      <button 
                        onClick={() => handleUpgradePremium()}
                        className="bg-[#222]/80 text-white font-bold border border-[#F5B933]/15 text-[9.3px] uppercase tracking-wider py-3 rounded-xl hover:bg-white/[0.04] transition cursor-pointer"
                      >
                         Premium Elite
                      </button>
                    ) : (
                      <div className="bg-[#1a1a1a] text-amber-300 border border-amber-500/20 text-[9.5px] font-bold uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-1.5 select-none font-black">
                         <Shield className="w-3.5 h-3.5 text-[#F5B933]" /> Elite Status
                      </div>
                    )}
                 </div>

                 {/* Buy MESH Token direct payment gateway trigger */}
                 <button 
                   onClick={() => {
                     setPaymentSuccessReceipt(null);
                     setShowPaymentModal(true);
                   }}
                   className="w-full mt-3 bg-gradient-to-r from-[#F5B933] to-[#FFD573] text-[#050505] font-black text-[10px] uppercase tracking-widest py-3 rounded-xl shadow-[0_4px_18px_rgba(245,185,51,0.15)] hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                 >
                    <CreditCard className="w-3.5 h-3.5" /> Hamyonni To'ldirish (Click, Payme, Cards)
                 </button>
              </div>

              {/* Transactions list header */}
              <div className="flex flex-col gap-2.5">
                 <h4 className="text-[10px] font-black tracking-widest text-white/80 uppercase px-1">Tranzaksiyalar Daftari</h4>

                 {transactions.length === 0 ? (
                   <p className="text-[10px] text-[#A0A0A0] px-1 italic">Hozircha balans tarixi jurnali mavjud emas.</p>
                 ) : (
                    <div className="flex flex-col gap-2">
                      {transactions.map(tx => (
                        <div key={tx.id} className="p-3.5 bg-[#111] rounded-xl border border-white/[0.02] flex items-center justify-between text-left">
                          <div>
                            <p className="text-xs font-bold text-white leading-normal">{tx.description === "Daily ecosystem gold faucet drop" ? "Kunlik ekotizim bonus tokeni minalandi" : tx.description === "VIP premium status upgrade bonus reward" ? "VIP premium darajasiga o'tish bonusi" : tx.description}</p>
                            <span className="text-[8px] text-[#A0A0A0] uppercase font-semibold block mt-0.5">
                               {tx.type === "deposit" ? "Kirim" : "Chiqim"} • {new Date(tx.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className={`text-[13px] font-black italic tracking-tighter ${
                              tx.amount > 0 ? 'text-green-400' : 'text-amber-400'
                            }`}>
                              {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                 )}
              </div>

            </div>
          )}

          {/* F. COMMUNITY FORUM / TRADE QUESTS PANEL */}
          {activeTab === 'community' && syncedUser && (
            <div className="px-5 py-2 flex flex-col gap-4">
              
              {/* Publish Quest proposal form container */}
              <div className="bg-[#111111] p-4.5 rounded-[24px] border border-white/[0.04]">
                <h3 className="text-[10px] font-black tracking-widest text-[#F5B933] uppercase mb-3">Ikki tomonlama e'lonni chop etish</h3>
                <form onSubmit={handleCreateQuest} className="flex flex-col gap-2.5">
                   <input 
                      type="text" 
                      placeholder="Mavzu, masalan: Dasturlash darsi yoki dizayn tahlili"
                      value={newPostTitle}
                      onChange={e => setNewPostTitle(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#F5B933]/50"
                   />
                   <textarea 
                      placeholder="Almashinuv shartlari va almashtiriladigan mahoratingizni batafsil yozining..."
                      value={newPostContent}
                      onChange={e => setNewPostContent(e.target.value)}
                      rows={2}
                      className="w-full bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#F5B933]/50 text-left"
                   />
                   <div className="grid grid-cols-2 gap-2">
                      <input 
                         type="text" 
                         placeholder="Men taklif etayotgan mahorat"
                         value={newPostOffered}
                         onChange={e => setNewPostOffered(e.target.value)}
                         className="bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2.5 text-[10px] text-white focus:outline-none"
                      />
                      <input 
                         type="text" 
                         placeholder="Men izlayotgan mahorat"
                         value={newPostNeeded}
                         onChange={e => setNewPostNeeded(e.target.value)}
                         className="bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2.5 text-[10px] text-white focus:outline-none"
                      />
                   </div>
                   <button 
                      type="submit"
                      className="w-full bg-[#F5B933] text-black font-black text-[10px] uppercase py-2.5 rounded-xl hover:opacity-90 transition cursor-pointer"
                   >
                      Kvest e'lonini tarqatish
                   </button>
                </form>
              </div>

              {/* Feed Display */}
              <div className="flex flex-col gap-3">
                 <h4 className="text-[10px] font-black tracking-widest text-[#A0A0A0] uppercase px-1">Ekotizim Kvestlari Doskasi</h4>

                 {posts.map(post => {
                   const isMe = post.authorId === syncedUser.id;
                   const isCommentsOpen = selectedPostIdForComments === post.id;
                   
                   return (
                     <div key={post.id} className="p-4 bg-[#111] rounded-2xl border border-white/[0.03] flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-[#222]">
                                 <img src={post.authorPhotoUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${post.authorUsername}`} alt={post.authorName} className="w-full h-full object-cover" />
                              </div>
                              <div className="text-left">
                                 <p className="text-[11px] font-bold text-white">{post.authorName}</p>
                                 <span className="text-[8px] text-[#A0A0A0] block">@{post.authorUsername}</span>
                              </div>
                           </div>
                           <span className="text-[8px] text-white/30 font-semibold">{new Date(post.timestamp).toLocaleDateString()}</span>
                        </div>

                        <div className="text-left">
                           <h5 className="text-xs font-bold text-white mb-1">{post.title}</h5>
                           <p className="text-[10px] text-white/70 leading-relaxed font-normal">{post.content}</p>
                        </div>

                        {/* Trade badge markers */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                           <span className="bg-[#F5B933]/15 text-[#F5B933] text-[8px] font-bold px-2 py-1 rounded border border-[#F5B933]/10">Taklif etadi: {post.offeredSkill}</span>
                           <span className="text-white/40 text-[9px]">↔</span>
                           <span className="bg-white/5 text-white/90 text-[8px] font-bold px-2 py-1 rounded border border-white/10">Talab etadi: {post.neededSkill}</span>
                        </div>

                        {/* Social interactive controls */}
                        <div className="flex items-center gap-3 pt-2.5 border-t border-white/[0.02] text-[10px]">
                           <button 
                             onClick={() => handleLikePost(post.id)}
                             className="flex items-center gap-1 text-[#A0A0A0] hover:text-white transition"
                           >
                              <ThumbsUp className="w-3.5 h-3.5 text-[#F5B933]" />
                              <span className="font-bold">{post.likes}</span>
                           </button>

                           <button 
                             onClick={() => isCommentsOpen ? setSelectedPostIdForComments(null) : handleOpenComments(post.id)}
                             className="flex items-center gap-1 text-[#A0A0A0] hover:text-white transition"
                           >
                              <MessageSquare className="w-3.5 h-3.5 text-white/60" />
                              <span className="font-bold">{post.commentsCount} Muhokama</span>
                           </button>

                           {!isMe && (
                             <button 
                               onClick={() => handleInitiateComputeMatch(post.authorId)}
                               className="ml-auto flex items-center gap-1 text-[#F5B933] font-bold text-[9px] uppercase tracking-wider"
                             >
                               Almashish <ChevronRight className="w-3 h-3" />
                             </button>
                           )}
                        </div>

                        {/* Expand comments thread drawer */}
                        {isCommentsOpen && (
                           <div className="mt-3 pt-3 border-t border-white/5 bg-black/20 p-3 rounded-xl flex flex-col gap-2">
                              <span className="text-[8px] uppercase font-black text-[#A0A0A0] tracking-widest text-left">Fikr-mulohazalar ({activePostComments.length})</span>
                              
                              {activePostComments.length === 0 ? (
                                 <p className="text-[9px] text-white/40 italic text-left">Hozircha tavsiyalar qoldirilmagan.</p>
                              ) : (
                                 <div className="flex flex-col gap-2 max-h-40 overflow-y-auto scrollbar-none text-left">
                                   {activePostComments.map(c => (
                                     <div key={c.id} className="text-[10px] bg-[#111] p-2.5 rounded-lg border border-white/[0.02]">
                                        <div className="flex justify-between font-bold text-[#F5B933] text-[9.5px]">
                                           <span>{c.authorName}</span>
                                           <span className="text-white/30 text-[8px]">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-white/80 font-normal mt-0.5">{c.content}</p>
                                     </div>
                                   ))}
                                 </div>
                              )}

                              <form onSubmit={handleCreateComment} className="flex gap-2.5 mt-1">
                                 <input 
                                   type="text" 
                                   placeholder="Maslahat yozing yoki darsni kelishib oling..."
                                   value={newCommentText}
                                   onChange={e => setNewCommentText(e.target.value)}
                                   required
                                   className="flex-1 bg-black/60 border border-white/[0.06] rounded-lg px-2.5 py-2 text-[10px] text-white focus:outline-none"
                                 />
                                 <button type="submit" className="bg-[#F5B933] text-black px-3 rounded-lg text-xs font-black">
                                    <Send className="w-3 h-3" />
                                 </button>
                              </form>
                           </div>
                        )}

                     </div>
                   );
                 })}
              </div>

            </div>
          )}

          {/* G. AI GUILDMASTER BOT ASSISTANT */}
          {activeTab === 'assistant' && syncedUser && (
            <div className="flex-1 flex flex-col h-full overflow-hidden relative min-h-[500px]">
              
              {/* Guild Master status banner bar */}
              <div className="px-4 py-3 bg-[#0A0A0A] border-b border-white/[0.04] flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#161616] to-[#010101] border-2 border-[#F5B933] p-0.5 shrink-0 shadow-[0_0_12px_rgba(245,185,51,0.25)]">
                       <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center text-[#F5B933] font-black text-[9px] italic">G</div>
                    </div>
                    <div className="text-left">
                       <p className="text-xs font-black text-white">Uyushma Masteri AI Moslashtiruvchi</p>
                       <span className="text-[8px] text-green-400 block -mt-0.5">Powered by Gemini 3.5</span>
                    </div>
                 </div>

                 {/* Reset thread */}
                 <button 
                   onClick={() => setAssistantMessages([
                     {
                       sender: 'bot',
                       text: "Ecosystem reset complete. Ask me any partnership strategies, bio rewrites, or explain digital ledger actions!",
                       timestamp: new Date().toISOString()
                     }
                   ])}
                   className="text-[8px] uppercase tracking-wider text-white/40 hover:text-[#F5B933]"
                 >
                   Tozalash
                 </button>
              </div>

              {/* Chat log */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-none bg-[#050505]/20">
                 {assistantMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} text-left`}>
                       <div className={`max-w-[85%] p-3.5 rounded-2xl text-[11px] font-normal leading-relaxed ${
                         msg.sender === 'user' 
                           ? 'bg-neutral-900 text-white rounded-br-none border border-white/5' 
                           : 'bg-[#111] text-white/95 rounded-bl-none border border-[#F5B933]/15 shadow-md relative overflow-hidden'
                       }`}>
                          {msg.sender === 'bot' && (
                            <div className="absolute top-0 right-0 w-16 h-16 bg-[radial-gradient(circle,rgba(245,185,51,0.06)_0%,transparent_70%)]"></div>
                          )}
                          <p className="whitespace-pre-line text-[11px]">{msg.text}</p>
                          <span className="block text-right text-[8.5px] opacity-40 mt-1.5">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                    </div>
                 ))}
                 
                 {isTyping && (
                    <div className="flex justify-start text-left">
                      <div className="p-3 bg-[#111] rounded-2xl text-[10px] text-[#A0A0A0] flex items-center gap-1.5 border border-[#F5B933]/10">
                         <span className="w-2 h-2 rounded-full bg-[#F5B933]/80 animate-bounce"></span>
                         <span className="w-2 h-2 rounded-full bg-[#F5B933]/80 animate-bounce delay-150"></span>
                         <span className="w-2 h-2 rounded-full bg-[#F5B933]/80 animate-bounce delay-300"></span>
                         <span className="text-[9px] uppercase tracking-widest font-black text-white ml-1">AI O'ylamoqda...</span>
                      </div>
                    </div>
                 )}
                 <div ref={assistantEndRef} />
              </div>

              {/* Sample Chips */}
              <div className="p-2 gap-1.5 overflow-x-auto scrollbar-none bg-[#060606] border-t border-white/[0.04] flex shrink-0">
                 <button 
                   onClick={() => setAssistantInput("SkillMesh kelishuvlarida kreditlar qanday ishlaydi?")} 
                   className="px-3 py-1 bg-[#111] border border-white/5 hover:border-[#F5B933]/30 rounded-lg text-[9px] text-[#A0A0A0] truncate max-w-[170px]"
                 >
                   Kreditlar qanday ishlaydi?
                 </button>
                 <button 
                   onClick={() => setAssistantInput("Tizimdagi yuqori ishonchli hamkorlarni tavsiya eting.")} 
                   className="px-3 py-1 bg-[#111] border border-white/5 hover:border-[#F5B933]/30 rounded-lg text-[9px] text-[#A0A0A0] truncate max-w-[170px]"
                 >
                   Ishonchli hamkorlar tavsiyasi
                 </button>
                 <button 
                   onClick={() => setAssistantInput("Figma tahlili uchun IELTS darsini almashtirishga muloqot taklifi yozib bering.")} 
                   className="px-3 py-1 bg-[#111] border border-white/5 hover:border-[#F5B933]/30 rounded-lg text-[9px] text-[#A0A0A0] truncate max-w-[170px]"
                 >
                   Taklif shablonini tayyorlash
                 </button>
              </div>

              {/* Chat Form */}
              <form onSubmit={handleSendAssistantMessage} className="p-3 bg-black flex gap-2 shrink-0 border-t border-white/[0.04]">
                  <input 
                     type="text"
                     placeholder="Hamkorlik darslari, bio ma'lumotlarni tahrirlash..."
                     value={assistantInput}
                     onChange={e => setAssistantInput(e.target.value)}
                     className="flex-1 bg-[#111111] border border-white/[0.08] rounded-xl px-3.5 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#F5B933]/50"
                  />
                  <button 
                    type="submit"
                    className="p-3 rounded-xl bg-[#F5B933] text-[#050505] hover:opacity-90 transition cursor-pointer"
                  >
                     <Send className="w-4 h-4 animate-pulse" />
                  </button>
              </form>

            </div>
          )}

          {/* G. ADMINISTRATIVE OPERATOR PANEL (ADMIN) */}
          {activeTab === 'admin' && syncedUser && (
            <div className="px-5 py-4 flex flex-col gap-5">
              
              {/* Header section with back button */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col text-left">
                  <span className="text-[8px] uppercase tracking-widest text-[#F5B933] font-black">NAZORAT VA ARBITRAJ</span>
                  <h3 className="text-md font-black text-white">Tizim Boshqaruv Pulti</h3>
                </div>
                <button 
                  onClick={() => setActiveTab('home')}
                  className="bg-[#111] px-3 py-1.5 rounded-xl border border-white/5 text-[9px] uppercase tracking-widest text-white/70 hover:text-white cursor-pointer"
                >
                  Yopish
                </button>
              </div>

              {/* Loader or dynamic stats */}
              {adminLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-t-[#F5B933] border-r-transparent border-b-[#F5B933] border-l-transparent animate-spin"></div>
                  <span className="text-[10px] text-[#A0A0A0] uppercase tracking-widest font-bold">Ma'lumotlar yuklanmoqda...</span>
                </div>
              ) : (
                <>
                  {/* Stats highlights banner */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#111] border border-white/[0.04] p-3 rounded-xl flex flex-col gap-1 text-left">
                      <span className="text-[8px] uppercase font-black text-[#A0A0A0] tracking-wider">Foydalanuvchilar (Nodes)</span>
                      <span className="text-lg font-black text-white italic">{adminStats?.counts?.users ?? 0}</span>
                      <span className="text-[7.5px] font-semibold text-green-500 uppercase tracking-widest">● LIVE XOTIRA</span>
                    </div>
                    <div className="bg-[#111] border border-white/[0.04] p-3 rounded-xl flex flex-col gap-1 text-left">
                      <span className="text-[8px] uppercase font-black text-[#A0A0A0] tracking-wider">Kvestlar / Postlar</span>
                      <span className="text-lg font-black text-white italic">{adminStats?.counts?.posts ?? 0}</span>
                      <span className="text-[7.5px] font-semibold text-[#F5B933] uppercase tracking-widest">Faol e'lonlar</span>
                    </div>
                    <div className="bg-[#111] border border-white/[0.04] p-3 rounded-xl flex flex-col gap-1 text-left">
                      <span className="text-[8px] uppercase font-black text-[#A0A0A0] tracking-wider">Eskrou Bloklari</span>
                      <span className="text-lg font-black text-white italic">{adminStats?.agreements?.length ?? 0}</span>
                      <span className="text-[7.5px] font-semibold text-yellow-500 uppercase tracking-widest">Kafolatlangan</span>
                    </div>
                    <div className="bg-[#111] border border-white/[0.04] p-3 rounded-xl flex flex-col gap-1 text-left">
                      <span className="text-[8px] uppercase font-black text-[#A0A0A0] tracking-wider">Hamkorlik Nizolari</span>
                      <span className="text-lg font-black text-white italic">
                        {adminStats?.agreements?.filter((a: any) => a.status === 'agreed').length ?? 0}
                      </span>
                      <span className="text-[7.5px] font-semibold text-red-400 uppercase tracking-widest">Arbitrajda</span>
                    </div>
                  </div>

                  {/* Section: Escrow dispute arbitrations */}
                  <div className="flex flex-col gap-2 text-left">
                    <h4 className="text-[10px] font-black tracking-widest text-[#F5B933] uppercase">Arbitraj Nizolarini Hal Qilish</h4>
                    {(!adminStats?.agreements || adminStats.agreements.length === 0) ? (
                      <p className="text-[10px] italic text-[#A0A0A0] bg-[#111]/40 p-4 rounded-xl text-center">Hozirda hech qanday faol muzlatilgan shartnomalar yo'q.</p>
                    ) : (
                      <div className="flex flex-col gap-2.5 max-h-[180px] overflow-y-auto scrollbar-none pr-1">
                        {adminStats.agreements.map((ag: any) => {
                          const statusColors: Record<string, string> = {
                            pending: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
                            agreed: "text-[#F5B933] bg-[#F5B933]/10 border-[#F5B933]/20",
                            completed: 'text-green-400 bg-green-500/10 border-green-500/20',
                            cancelled: 'text-red-300 bg-red-500/10 border-red-500/20'
                          };
                          return (
                            <div key={ag.id} className="p-3 bg-[#111] border border-white/[0.04] rounded-xl flex flex-col gap-2">
                              <div className="flex justify-between items-start gap-1">
                                <div className="min-w-0">
                                  <h5 className="text-[11px] font-bold text-white uppercase leading-snug truncate">{ag.title}</h5>
                                  <span className="text-[8px] text-[#A0A0A0] uppercase font-bold block mt-0.5">Garov: {ag.creditStaked} MESH • {ag.hours} s • Status: {ag.status}</span>
                                </div>
                                <span className={`text-[8.5px] shrink-0 px-2 py-0.5 rounded-full border font-black uppercase ${statusColors[ag.status]}`}>
                                  {ag.status}
                                </span>
                              </div>
                              
                              {/* Disputes trigger buttons */}
                              {ag.status === 'agreed' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAdminResolveAgreement(ag.id, 'release')}
                                    className="flex-1 bg-[#F5B933] text-black text-[8px] font-black uppercase py-1.5 rounded-lg transition"
                                  >
                                    Yechish / Mentorga
                                  </button>
                                  <button
                                    onClick={() => handleAdminResolveAgreement(ag.id, 'refund')}
                                    className="flex-1 bg-black text-[#A0A0A0] border border-red-950 text-[8px] font-black uppercase py-1.5 rounded-lg transition hover:text-red-400"
                                  >
                                    Bekorlash / Qaytarish
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section: Users system directory moderation */}
                  <div className="flex flex-col gap-2 text-left">
                    <h4 className="text-[10px] font-black tracking-widest text-[#F5B933] uppercase">Tizim Foydalanuvchilari (Memory Directory)</h4>
                    {(!adminStats?.users || adminStats.users.length === 0) ? (
                      <p className="text-[10px] italic text-[#A0A0A0] bg-[#111]/40 p-4 rounded-xl text-center">Profil ro'yxati bo'sh.</p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto scrollbar-none pr-1">
                        {adminStats.users.map((item: any) => (
                          <div key={item.user.id} className="p-3 bg-[#111] border border-white/[0.04] rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#222] border border-white/10 shrink-0">
                                <img src={item.user.photoUrl} alt={item.user.firstName} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-white truncate">{item.user.firstName} {item.user.lastName || ''}</p>
                                <span className="text-[8px] text-[#A0A0A0] block -mt-0.5 uppercase tracking-wider font-semibold">
                                  Hamyon: {item.profile?.credits ?? 0} MESH • Reyting: {item.profile?.trustScore ?? 80}
                                </span>
                              </div>
                            </div>

                            {/* Deletion protection: Can't delete self */}
                            {syncedUser.id !== item.user.id ? (
                              <button
                                onClick={() => handleDeleteUser(item.user.id)}
                                className="w-7 h-7 bg-red-950/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg flex items-center justify-center transition shrink-0"
                                title="Foydalanuvchini o'chirib tashlash"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[8px] uppercase tracking-wider font-black text-green-400 bg-green-500/10 px-2 py-1 rounded">ADMIN</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Community quests moderation */}
                  <div className="flex flex-col gap-2 text-left">
                    <h4 className="text-[10px] font-black tracking-widest text-[#F5B933] uppercase">Hamjamiyat Kvestlari Moderatsiyasi</h4>
                    {(!adminStats?.posts || adminStats.posts.length === 0) ? (
                      <p className="text-[10px] italic text-[#A0A0A0] bg-[#111]/40 p-4 rounded-xl text-center font-bold">Faol forum e'lonlari topilmadi.</p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto scrollbar-none pr-1">
                        {adminStats.posts.map((post: any) => (
                          <div key={post.id} className="p-3 bg-[#111] border border-white/[0.04] rounded-xl flex items-center justify-between gap-3">
                            <div className="min-w-0 text-left">
                              <p className="font-bold text-xs text-white truncate leading-relaxed">{post.title}</p>
                              <p className="text-[8px] text-[#A0A0A0] truncate -mt-0.5">Muallif: @{post.authorUsername} • {post.likes} Likes • {post.commentsCount} Comments</p>
                            </div>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="w-7 h-7 bg-red-950/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg flex items-center justify-center transition shrink-0"
                              title="Postni o'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </>
              )}

            </div>
          )}

        </div>

        {/* -------------------------------------- */}
        {/* BOTTOM NAVIGATION FOOTER TAB BAR BAR */}
        {/* -------------------------------------- */}
        {syncedUser && (
          <div id="sm-tabbar" className="h-20 bg-[#070707] border-t border-white/[0.04] flex items-center justify-around px-2 pb-3 shrink-0 relative z-20">
            
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer transition flex-1 py-1 ${activeTab === 'home' ? 'text-[#F5B933]' : 'text-white/40 hover:text-white/75'}`}
            >
              <Briefcase className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase tracking-wider">Lobby</span>
            </button>

            <button 
              onClick={() => setActiveTab('matches')}
              className={`flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer transition flex-1 py-1 ${activeTab === 'matches' ? 'text-[#F5B933]' : 'text-white/40 hover:text-white/75'}`}
            >
              <Search className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase tracking-wider font-extrabold">Qidiruv</span>
            </button>

            {/* AI Assistant Special highlight center item */}
            <button 
              onClick={() => setActiveTab('assistant')}
              className="relative -mt-9 flex flex-col items-center justify-center cursor-pointer shrink-0 z-35"
            >
               <div className="w-13 h-13 rounded-full bg-[#111] border-2 border-[#F5B933] flex items-center justify-center shadow-[0_4px_22px_rgba(245,185,51,0.35)] hover:scale-105 transition duration-300">
                  <Sparkles className="w-5 h-5 text-[#F5B933]" />
               </div>
               <span className="text-[8px] mt-1.5 font-black uppercase text-[#F5B933] tracking-widest animate-pulse">AI MARKAZ</span>
            </button>

            <button 
              onClick={() => {
                setActiveTab('chat');
                setActiveConvoId(null); // List active threads
              }}
              className={`flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer transition flex-1 py-1 ${activeTab === 'chat' ? 'text-[#F5B933]' : 'text-white/40 hover:text-white/75'}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase tracking-wider font-extrabold">Chat</span>
            </button>

            <button 
              onClick={() => setActiveTab('community')}
              className={`flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer transition flex-1 py-1 ${activeTab === 'community' ? 'text-[#F5B933]' : 'text-white/40 hover:text-white/75'}`}
            >
              <Users className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase tracking-wider font-extrabold">Kvestlar</span>
            </button>

          </div>
        )}

        {/* Home Indicator line simulation */}
        <div id="sm-indicator" className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full select-none pointer-events-none z-30"></div>

      </div>

      {/* SURROUNDING DECORATIVE INSTRUCTION CARDS ON DESKTOP RIGHT VIEWPORT */}
      <div className="hidden lg:flex flex-col gap-4 max-w-xs ml-8">
         
         {/* Live Platform Stats */}
         <div className="bg-[#111]/80 rounded-2xl p-5 border border-white/[0.04]">
            <span className="text-[9px] uppercase tracking-widest text-[#F5B933] font-black">TIZIM TELEMETRIYA KO'RSATKICHLARI</span>
            <h2 className="text-sm font-black text-white mt-1 mb-3">Sinxron Platforma Holati</h2>
            
            <div className="flex flex-col gap-2.5 text-xs text-white/70">
               <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="font-medium text-white/50">Node Server Porti:</span>
                  <span className="font-mono text-white">3000 (Routed)</span>
               </div>
               <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="font-medium text-white/50">Ma'lumotlar Bazasi:</span>
                  <span className="text-green-400 font-bold uppercase">DOIMIY JSON</span>
               </div>
               <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                  <span className="font-medium text-white/50">Faol Foydalanuvchilar:</span>
                  <span className="text-white font-bold">4 ta Tasdiqlangan Hamkor</span>
               </div>
               <div className="flex justify-between pb-1">
                  <span className="font-medium text-white/50">AI Dvigateli:</span>
                  <span className="text-[#F5B933] font-bold">Gemini 3.5 Flash</span>
               </div>
            </div>
         </div>

         {/* Guild-Master Tips */}
         <div className="bg-[#111111]/80 rounded-2xl p-5 border border-white/[0.04] relative overflow-hidden">
            <span className="text-[9px] uppercase tracking-widest text-[#F5B933] font-black">UYUSHMA MASTERI QOIDALARI</span>
            <h4 className="text-xs font-black text-white mt-1 mb-2">Ikki tomonlama Eskrou Qoidalari</h4>
            <p className="text-[10px] text-white/60 leading-relaxed font-normal">
              Klassik pul bozorlaridan farqli o'laroq, SkillMesh almashinuvlari eskrou shartnomalari ichida ikki tomonlama muzlatiladi. Kelishuv yakunlangandan so'ng, ikkala tomon ham buni raqamli imzo orqali tasdiqlaydi va bu profildagi ishonch reytingini avtomatik ravishda oshiradi.
            </p>
            <div className="mt-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5B933] animate-pulse"></span>
              <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">AI Studio sinov muhiti</span>
            </div>
         </div>

      </div>

      {/* ========================================== */}
      {/* DIALOG DETAILS MODALS PANEL */}
      {/* ========================================== */}

      {/* 1. NOTIFICATIONS DIALOG LIST */}
      {showNotificationsModal && syncedUser && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-45 flex items-center justify-center p-4">
            <div className="bg-[#111] max-w-md w-full rounded-[24px] border border-white/10 p-5 relative max-h-[85vh] overflow-y-auto flex flex-col scrollbar-none">
              <button 
                onClick={() => setShowNotificationsModal(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white"
              >
                 <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-black uppercase tracking-widest text-[#F5B933] mb-4">Ekotizim Bildirishnomalari ({notifications.length})</h3>

              {notifications.length === 0 ? (
                 <p className="text-xs text-white/40 italic p-4 text-center">Hozircha tizim bildirishnomalari mavjud emas.</p>
              ) : (
                <div className="flex flex-col gap-3">
                   {notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => handleMarkNotificationRead(n.id, n.linkToTab)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                          n.isRead 
                            ? 'bg-transparent border-white/5 opacity-60' 
                            : 'bg-[#1b1b1b]/80 border-[#F5B933]/20'
                        }`}
                      >
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#F5B933]">{n.title}</span>
                            <span className="text-[8px] text-[#A0A0A0]">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         </div>
                         <p className="text-xs text-white/90 leading-relaxed font-normal">{n.message}</p>
                         {n.linkToTab && !n.isRead && (
                            <span className="text-[8px] text-[#F5B933] font-bold block mt-1 uppercase tracking-widest">O'TISH UCHUN CHERTING</span>
                         )}
                      </div>
                   ))}
                </div>
              )}
            </div>
         </div>
      )}

      {/* 2. DRAFT NEW ESCROW AGREEMENT MODAL */}
      {showAgreementModal && syncedUser && agreementTargetUser && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-45 flex items-center justify-center p-4">
            <form 
               onSubmit={handleProposeAgreement}
               className="bg-[#111] max-w-sm w-full rounded-[24px] border border-[#F5B933]/30 p-5 relative text-left flex flex-col gap-4"
            >
              <button 
                type="button"
                onClick={() => setShowAgreementModal(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white bg-transparent border-0"
              >
                 <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                 <span className="text-[8px] uppercase tracking-widest text-[#F5B933] font-black block">ESKROU SHARTNOMA LOYIHASI</span>
                 <h3 className="text-md font-black text-white mt-1">To'g'ridan-to'g'ri Almashinuv Shartnomasi</h3>
                 <p className="text-[10px] text-[#A0A0A0] mt-0.5">Hamkor {agreementTargetUser.firstName} bilan</p>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                   <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block mb-1">Shartnoma Mavzusi</label>
                   <input 
                      type="text"
                      placeholder="Masalan: Ingliz tili va React tahlili darsi"
                      value={agreementTitle}
                      onChange={e => setAgreementTitle(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F5B933]"
                   />
                </div>

                <div className="grid grid-cols-2 gap-2">
                   <div>
                     <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block mb-1">Siz taklif etadigan mahorat</label>
                     <input 
                        type="text"
                        value={agreementOffer}
                        onChange={e => setAgreementOffer(e.target.value)}
                        required
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white uppercase focus:outline-none"
                     />
                   </div>
                   <div>
                     <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block mb-1">Ular taklif etadigan mahorat</label>
                     <input 
                        type="text"
                        value={agreementNeed}
                        onChange={e => setAgreementNeed(e.target.value)}
                        required
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white uppercase focus:outline-none"
                     />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                   <div>
                     <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block mb-1">Dars Soatlari</label>
                     <input 
                        type="number"
                        min={1}
                        max={40}
                        value={agreementHours}
                        onChange={e => setAgreementHours(Number(e.target.value))}
                        required
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                     />
                   </div>
                   <div>
                     <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block mb-1">MESH Eskrou Garov Miqdori</label>
                     <input 
                        type="number"
                        min={10}
                        max={300}
                        value={agreementStake}
                        onChange={e => setAgreementStake(Number(e.target.value))}
                        required
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-[#F5B933] font-bold focus:outline-none"
                     />
                   </div>
                </div>
              </div>

              <div className="bg-[#050505] p-3 rounded-xl border border-white/[0.02]">
                 <ul className="text-[9px] text-[#A0A0A0] flex flex-col gap-1 list-disc pl-3">
                   <li>Taqdim etilgandan so'ng, balansingizdan {agreementStake} $MESH eskrou vasiyligida muzlatiladi.</li>
                   <li>Shartnoma faollashishi uchun ikkala tomon ham buni raqamli imzolashi shart.</li>
                   <li>Yakunlangan soatlar kafolat sifatida tokenlarni mentorga yo'naltiradi.</li>
                </ul>
              </div>

              <button 
                 type="submit"
                 className="w-full bg-[#F5B933] text-black font-black text-xs py-3 rounded-xl uppercase tracking-widest shadow-[0_4px_15px_rgba(245,185,51,0.2)] hover:opacity-90 transition"
              >
                 Muzlatish va Shartnomani Yuborish
              </button>
            </form>
         </div>
      )}

      {/* 3. PEER STAR REVIEW SUBMISSION FORM */}
      {showReviewModal && syncedUser && reviewTargetUser && (
         <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-45 flex items-center justify-center p-4">
            <form 
               onSubmit={handleSubmitReview}
               className="bg-[#111] max-w-sm w-full rounded-[24px] border border-white/10 p-5 relative text-left flex flex-col gap-4"
            >
              <div className="text-center">
                 <span className="text-[8px] uppercase tracking-widest text-[#F5B933] font-black block">IKKI TOMONLAMA ALMASHINUV BAHOSI</span>
                 <h3 className="text-md font-black text-white mt-1">Yulduzli Reputatsiyani Yuborish</h3>
                 <p className="text-[10px] text-[#A0A0A0] mt-0.5">O'qitish tajribasini baholash: {reviewTargetUser.firstName}</p>
              </div>

              <div className="flex flex-col gap-3">
                 <div>
                    <label className="text-[9px] uppercase tracking-wider text-white/50 block mb-1 font-bold">Baholash Mezonlari</label>
                    <div className="flex gap-2 justify-center py-2">
                       {[1, 2, 3, 4, 5].map(starValue => (
                          <button 
                            type="button"
                            key={starValue}
                            onClick={() => setReviewRating(starValue)}
                            className="bg-transparent border-0 cursor-pointer text-xl"
                          >
                             <Star className={`w-6 h-6 ${
                                starValue <= reviewRating ? 'fill-[#F5B933] text-[#F5B933]' : 'text-white/20'
                             }`} />
                          </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="text-[9px] uppercase tracking-wider text-white/50 block mb-1 font-bold">O'rganilgan Soha / Mavzu</label>
                    <input 
                      type="text"
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      value={reviewSkill}
                      onChange={e => setReviewSkill(e.target.value)}
                      required
                    />
                 </div>

                 <div>
                    <label className="text-[9px] uppercase tracking-wider text-white/50 block mb-1 font-bold">Yozma Tavsiyanoma</label>
                    <textarea 
                      rows={3}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      placeholder="Masalan: Devon Zhao React skriptlari va loyihasini ajoyib tushuntirdi. Yuqori darajadagi ekspert sifatida tavsiya etaman!"
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                    />
                 </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#F5B933] text-black font-black text-xs py-3.5 rounded-xl uppercase tracking-widest transition"
              >
                 Tavsiyanomani Chop Etish
              </button>
            </form>
         </div>
      )}

      {/* 4. EDIT REPUTATION PROFILE MODAL OVERLAY */}
      {editProfileOpen && syncedUser && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-45 flex items-center justify-center p-4">
            <form 
               onSubmit={handleProfileSave}
               className="bg-[#111] max-w-sm w-full rounded-[24px] border border-white/10 p-5 relative text-left flex flex-col gap-4 max-h-[90vh] overflow-y-auto scrollbar-none"
            >
              <button 
                type="button"
                onClick={() => setEditProfileOpen(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white bg-transparent border-0"
              >
                 <X className="w-5 h-5" />
              </button>

              <div className="text-center border-b border-white/[0.04] pb-2">
                 <span className="text-[8px] uppercase tracking-widest text-[#F5B933] font-black block">OBRO'-E'TIBOR MA'LUMOTLARINI TAHRIRLASH</span>
                 <h3 className="text-md font-black text-white mt-1">Profil Xususiyatlari</h3>
              </div>

              <div className="flex flex-col gap-3">
                 <div>
                    <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block mb-1">Raqamli Tarjimai Hol (Bio)</label>
                    <textarea 
                      rows={3}
                      value={editBio}
                      onChange={e => setEditBio(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F5B933]"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block mb-1">Geografik Manzil / Hudud</label>
                      <input 
                         type="text"
                         value={editLocation}
                         onChange={e => setEditLocation(e.target.value)}
                         className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block mb-1">Gaplashadigan Tillar</label>
                      <input 
                         type="text"
                         value={editLanguage}
                         onChange={e => setEditLanguage(e.target.value)}
                         className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                 </div>

                 <div>
                    <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block mb-1">Ekotizim Faolligi</label>
                    <select 
                      value={editActivityLevel} 
                      onChange={e => setEditActivityLevel(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                       <option value="High" className="bg-[#111]">Yuqori Faollik</option>
                       <option value="Medium" className="bg-[#111]">O'rtacha Faollik</option>
                       <option value="Low" className="bg-[#111]">Past Faollik</option>
                    </select>
                 </div>

                 {/* Edit Offered talents with basic layout */}
                 <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block">Siz taklif etayotgan qobiliyatlar ro'yxati</label>
                      <button 
                        type="button"
                        onClick={() => {
                           const template = SKILL_TEMPLATES[Math.floor(Math.random() * SKILL_TEMPLATES.length)];
                           if (!editOfferedSkills.some(s => s.name === template.name)) {
                              setEditOfferedSkills([...editOfferedSkills, { name: template.name, category: template.category, level: 'Expert' }]);
                           }
                        }}
                        className="text-[8px] bg-[#F5B933]/15 text-[#F5B933] px-2 py-0.5 rounded uppercase font-black"
                      >
                         + Qo'shish
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 bg-black/30 p-2.5 rounded-xl border border-white/5 min-h-[50px]">
                       {editOfferedSkills.length === 0 ? (
                          <span className="text-[9px] text-white/30 italic">Hozircha malakalar kiritilmagan. Yangi qo'shish tugmasini bosing.</span>
                       ) : (
                          editOfferedSkills.map((s, idx) => (
                            <span key={idx} className="bg-[#F5B933]/15 text-[#F5B933] border border-[#F5B933]/20 text-[8.5px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              {s.name}
                              <button 
                                type="button" 
                                onClick={() => setEditOfferedSkills(editOfferedSkills.filter((_, i) => i !== idx))}
                                className="text-white hover:text-red-400 font-bold bg-transparent border-0 ml-1 ml-auto"
                              >
                                 ×
                              </button>
                            </span>
                          ))
                       )}
                    </div>
                 </div>

                 {/* Needed skills tag list edit */}
                 <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold block">Siz o'rganmoqchi bo'lgan qobiliyatlar ro'yxati</label>
                      <button 
                        type="button"
                        onClick={() => {
                           const template = SKILL_TEMPLATES[Math.floor(Math.random() * SKILL_TEMPLATES.length)];
                           if (!editNeededSkills.includes(template.name)) {
                              setEditNeededSkills([...editNeededSkills, template.name]);
                           }
                        }}
                        className="text-[8px] bg-white/10 text-white px-2 py-0.5 rounded uppercase font-black"
                      >
                         + Qo'shish
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 bg-black/30 p-2.5 rounded-xl border border-white/5 min-h-[50px]">
                       {editNeededSkills.length === 0 ? (
                          <span className="text-[9px] text-white/30 italic">Hozircha talab qilinayotgan malakalar kiritilmagan.</span>
                       ) : (
                          editNeededSkills.map((s, idx) => (
                            <span key={idx} className="bg-white/10 text-white border border-white/15 text-[8.5px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              {s}
                              <button 
                                type="button" 
                                onClick={() => setEditNeededSkills(editNeededSkills.filter((_, i) => i !== idx))}
                                className="text-white hover:text-red-400 font-bold bg-transparent border-0 ml-1 ml-auto"
                              >
                                 ×
                              </button>
                            </span>
                          ))
                       )}
                    </div>
                 </div>
              </div>

              <button 
                 type="submit"
                 className="w-full bg-[#F5B933] text-black font-black text-xs py-3 rounded-xl uppercase tracking-widest hover:opacity-90 transition mt-2"
              >
                 Profilni Saqlash & Yangilash
              </button>
            </form>
         </div>
      )}

      {/* 5. IMMERSIVE HOLOGRAPHIC GOLDEN CHECKOUT MODAL */}
      {showPaymentModal && syncedUser && (
         <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-45 flex items-center justify-center p-4">
            <div className="bg-[#111] max-w-sm w-full rounded-[30px] border border-[#F5B933]/30 p-5 relative text-left flex flex-col gap-4 max-h-[90vh] overflow-y-auto scrollbar-none shadow-[0_0_50px_rgba(245,185,51,0.15)]">
               
               <button 
                 type="button"
                 onClick={() => {
                   setShowPaymentModal(false);
                   setPaymentSuccessReceipt(null);
                 }}
                 className="absolute top-4 right-4 text-white/50 hover:text-white bg-transparent border-0 cursor-pointer"
               >
                  <X className="w-5 h-5" />
               </button>

               <div className="text-center border-b border-white/[0.04] pb-3">
                  <span className="text-[8px] uppercase tracking-widest text-[#F5B933] font-black block">MULOQOT VA CAPITAL</span>
                  <h3 className="text-md font-black text-white mt-1">Hamyon Balansini To'ldirish</h3>
                  <p className="text-[9.5px] text-[#A0A0A0] mt-0.5">Xavfsiz O'zbekiston & Xalqaro gateway orqali $MESH sotib oling</p>
               </div>

               {paymentSuccessReceipt ? (
                 // Visual Invoice receipt for successful payments
                 <div className="flex flex-col gap-4 text-center py-2 animate-fadeIn">
                   <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center mx-auto shadow-md">
                     <CheckCircle className="w-7 h-7" />
                   </div>
                   
                   <div>
                     <span className="text-[9px] uppercase tracking-widest text-green-400 font-bold block">TO'LOV QABUL QILINDI</span>
                     <h4 className="text-xl font-extrabold text-white mt-0.5">+{paymentSuccessReceipt.amount} $MESH</h4>
                     <p className="text-[10px] text-[#A0A0A0]">Xaridingiz muvaffaqiyatli himoyalandi va balansga qo'shildi.</p>
                   </div>

                   <div className="bg-black/40 border border-white/[0.04] rounded-xl p-3 text-left flex flex-col gap-1.5 text-[10px] font-mono text-[#A0A0A0]">
                     <div className="flex justify-between">
                       <span>Kvitansiya ID:</span>
                       <span className="text-white font-bold">{paymentSuccessReceipt.refId}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>To'lov Turi:</span>
                       <span className="text-[#F5B933] font-black">{paymentSuccessReceipt.method} Gateway</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Vaqti:</span>
                       <span className="text-white">{new Date(paymentSuccessReceipt.time).toLocaleTimeString()}</span>
                     </div>
                     <div className="flex justify-between border-t border-white/[0.05] pt-1.5 mt-0.5 font-sans">
                       <span>Status:</span>
                       <span className="text-green-400 font-bold uppercase tracking-wider text-[8px] flex items-center gap-1">● TASDIQLANDI</span>
                     </div>
                   </div>

                   <button 
                     onClick={() => {
                       setShowPaymentModal(false);
                       setPaymentSuccessReceipt(null);
                     }}
                     className="w-full bg-[#111] hover:bg-[#1f1f1f] border border-white/10 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-widest transition cursor-pointer"
                   >
                     Yopish va Qaytish
                   </button>
                 </div>
               ) : (
                 // Standard Interactive payment checkout form
                 <form onSubmit={handlePurchaseMesh} className="flex flex-col gap-4">
                    
                    {/* 1. Package selection volumes dropdown */}
                    <div className="flex flex-col gap-1 text-left">
                       <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold">Token Paketini Tanlang</label>
                       <div className="grid grid-cols-2 gap-2 mt-1">
                          {[
                            { tokens: 100, price: "10,000 UZS", label: "Kichik bo'g'in" },
                            { tokens: 250, price: "22,000 UZS", label: "O'rta hunarmand" },
                            { tokens: 500, price: "40,000 UZS", label: "Katta ustoz" },
                            { tokens: 1000, price: "75,000 UZS", label: "Uyushma masteri" }
                          ].map(pack => (
                            <div 
                              key={pack.tokens}
                              onClick={() => setPaymentAmount(pack.tokens)}
                              className={`p-3 rounded-xl border text-center cursor-pointer transition flex flex-col justify-center ${
                                paymentAmount === pack.tokens 
                                  ? 'bg-[#F5B933]/15 border-[#F5B933] shadow-[0_0_12px_rgba(245,185,51,0.1)]' 
                                  : 'bg-black/35 border-white/[0.04] hover:border-white/15'
                              }`}
                            >
                               <span className="text-[8px] font-black uppercase text-[#A0A0A0] tracking-wider block -mb-0.5">{pack.label}</span>
                               <span className="text-[13px] font-extrabold text-white mt-0.5">{pack.tokens} MESH</span>
                               <span className="text-[9px] font-mono font-bold text-[#F5B933] mt-0.5 block">{pack.price}</span>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* 2. Choose payment Gateway method */}
                    <div className="flex flex-col gap-1 text-left mt-1">
                       <label className="text-[9px] uppercase tracking-wider text-[#A0A0A0] font-bold">To'lov Provayderini Tanlang</label>
                       <div className="grid grid-cols-4 gap-1.5 mt-1">
                          {[
                            { name: 'Payme', color: 'border-[#1bcae5]/80 text-[#1bcae5]', bg: 'bg-[#1bcae5]/5' },
                            { name: 'Click', color: 'border-[#008fcc]/80 text-[#008fcc]', bg: 'bg-[#008fcc]/5' },
                            { name: 'Stripe', color: 'border-[#625df5]/80 text-[#625df5]', bg: 'bg-[#625df5]/5' },
                            { name: 'Telegram Stars', color: 'border-[#F5B933]/80 text-[#F5B933]', bg: 'bg-[#F5B933]/5' }
                          ].map((prov: any) => (
                            <button 
                              type="button"
                              key={prov.name}
                              onClick={() => setPaymentMethod(prov.name)}
                              className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer bg-transparent ${
                                paymentMethod === prov.name 
                                  ? `${prov.color} ${prov.bg} border-opacity-100` 
                                  : 'border-white/[0.04] opacity-50 hover:opacity-100'
                              }`}
                            >
                               <CreditCard className="w-3.5 h-3.5" />
                               <span className="text-[8px] font-bold truncate leading-none mt-1">{prov.name}</span>
                            </button>
                          ))}
                       </div>
                    </div>

                    {/* 3. Secure confirmation and processing states */}
                    <div className="mt-2 text-center">
                       {isProcessingPayment ? (
                         <div className="bg-black/35 border border-white/[0.04] p-3 rounded-xl flex flex-col items-center justify-center gap-2 text-center">
                            <div className="w-5 h-5 rounded-full border border-t-[#F5B933] border-r-transparent border-b-[#F5B933] border-l-transparent animate-spin"></div>
                            <p className="text-[9px] text-white/90 uppercase font-black tracking-widest">{paymentMethod} orqali ulanmoqda...</p>
                            <span className="text-[8px] text-[#A0A0A0] block">Tranzaksiya shifrlanmoqda, kuting...</span>
                         </div>
                       ) : (
                         <button 
                           type="submit"
                           className="w-full bg-[#F5B933] text-black font-black text-xs py-3.5 rounded-xl uppercase tracking-widest hover:opacity-90 transition cursor-pointer"
                         >
                            To'lovni Amalga Oshirish
                         </button>
                       )}
                    </div>
                 </form>
               )}

            </div>
         </div>
      )}

    </div>
  );
}
