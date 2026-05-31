import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { db } from './server/db.ts';
import { computeAiCompatibility, getGuildMasterResponse } from './server/gemini.ts';
import {
  verifyTelegramInitData,
  resolveRole,
  signToken,
  requireAuth,
  requireAdmin,
  ALLOW_DEV_AUTH,
  AuthedRequest,
  TelegramUserData
} from './server/auth.ts';
import { User } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = 3000; // Hardcoded container port

app.use(express.json());

// Simple logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Joriy autentifikatsiya qilingan foydalanuvchi id'sini olish (requireAuth dan keyin doim mavjud)
function authId(req: Request): string {
  return (req as AuthedRequest).authUser!.id;
}

// ==========================================
// API ROUTES
// ==========================================

// --- Health Check & UptimeRobot Monitoring (ochiq) ---
app.get('/api/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/ping', (req: Request, res: Response) => {
  return res.status(200).send('pong');
});

// --- Auth & Users ---
// Telegram WebApp initData ni tekshirib, JWT chiqaradi (yagona ochiq login yo'li)
app.post('/api/auth/sync', (req: Request, res: Response) => {
  try {
    let tg: TelegramUserData | null = null;

    if (req.body && req.body.initData) {
      // Haqiqiy Telegram Mini App oqimi — imzo serverda tekshiriladi
      tg = verifyTelegramInitData(req.body.initData);
    } else if (ALLOW_DEV_AUTH) {
      // Faqat lokal sinov uchun (ALLOW_DEV_AUTH=true). Productionda o'chirilgan.
      const { id, username, first_name, last_name, photo_url, language_code } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'Dev auth: foydalanuvchi id majburiy.' });
      }
      tg = { id, username, first_name, last_name, photo_url, language_code };
    } else {
      return res.status(401).json({
        error: 'Telegram initData talab qilinadi. Iltimos, ilovani Telegram bot orqali oching.'
      });
    }

    const userId = `tg-${tg.id}`;
    const role = resolveRole(tg.id);

    const normalizedUser: User = {
      id: userId,
      telegramId: String(tg.id),
      username: tg.username || `tg_${tg.id}`,
      firstName: tg.first_name || 'Anonymous',
      lastName: tg.last_name || '',
      photoUrl: tg.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${tg.id}`,
      languageCode: tg.language_code || 'en',
      isPremium: !!tg.is_premium,
      joinDate: new Date().toISOString().split('T')[0],
      role
    };

    const synced = db.createUser(normalizedUser);
    // Mavjud foydalanuvchining rolini env adminlar ro'yxatiga moslab yangilab qo'yamiz
    db.updateUserRole(userId, role);
    synced.role = role;

    const profile = db.getProfile(userId);
    const token = signToken({ id: userId, role });

    return res.status(200).json({ token, user: synced, profile });
  } catch (error: any) {
    console.error('Auth sync error:', error.message);
    return res.status(401).json({ error: error.message });
  }
});

// Update profile (faqat o'z profilini)
app.post('/api/profile/update', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = authId(req);
    const { bio, location, language, activityLevel, offeredSkills, neededSkills } = req.body;

    const updatedProfile = db.updateProfile(userId, {
      bio,
      location,
      language,
      activityLevel,
      offeredSkills,
      neededSkills
    });

    if (!updatedProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.status(200).json({ profile: updatedProfile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET profile (har qanday autentifikatsiyalangan foydalanuvchi ko'ra oladi)
app.get('/api/profile/:userId', requireAuth, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = db.getUser(userId);
    const profile = db.getProfile(userId);

    if (!user || !profile) {
      return res.status(404).json({ error: 'Profile metadata not found' });
    }

    const revs = db.getReviews().filter(r => r.targetId === userId);
    return res.status(200).json({ user, profile, reviews: revs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// List all profiles for matching/explore index
app.get('/api/profiles', requireAuth, (req: Request, res: Response) => {
  try {
    const currentUserId = authId(req);
    const users = db.getUsers();
    const profiles = db.getProfiles();

    const output = profiles
      .filter(p => p.id !== currentUserId)
      .map(p => {
        const u = users.find(user => user.id === p.id);
        return { user: u, profile: p };
      });

    return res.status(200).json(output);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Toggle premium (faqat o'zi; bir martalik bonus farming oldini olingan)
app.post('/api/profile/premium', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = authId(req);
    const { isPremium } = req.body;
    const u = db.updateUserPremium(userId, !!isPremium);
    if (!u) return res.status(404).json({ error: 'User not found' });

    // Premium bonus krediti faqat BIR MARTA beriladi (toggle bilan farming qilib bo'lmaydi)
    if (isPremium && !db.hasPremiumBonus(userId)) {
      const p = db.getProfile(userId);
      if (p) {
        p.credits += 150;
        db.createTransaction({
          id: `tx-prem-${Date.now()}`,
          userId,
          amount: 150,
          type: 'premium_buy',
          description: 'Premium Elite Tier Unlocked & Credits Awarded',
          timestamp: new Date().toISOString()
        });
      }
    }

    return res.status(200).json({ user: u, profile: db.getProfile(userId) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- AI Matching & Matches ---
app.post('/api/matches/compute', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUserId = authId(req);
    const { targetUserId } = req.body;

    const uA = db.getUser(currentUserId);
    const pA = db.getProfile(currentUserId);
    const uB = db.getUser(targetUserId);
    const pB = db.getProfile(targetUserId);

    if (!uA || !pA || !uB || !pB) {
      return res.status(404).json({ error: 'Profile pairings missing' });
    }

    const existing = db.getMatches().find(
      m => (m.userA_id === currentUserId && m.userB_id === targetUserId) ||
           (m.userA_id === targetUserId && m.userB_id === currentUserId)
    );

    if (existing) {
      return res.status(200).json(existing);
    }

    const report = await computeAiCompatibility(uA, pA, uB, pB);

    const newMatch = db.createMatch({
      id: `match-${Date.now()}`,
      userA_id: currentUserId,
      userB_id: targetUserId,
      compatibilityScore: report.compatibilityScore,
      offeredMatch: report.offeredMatch,
      neededMatch: report.neededMatch,
      reasoning: report.reasoning,
      status: 'pending'
    });

    db.createNotification({
      id: `notif-match-${Date.now()}`,
      userId: targetUserId,
      title: 'Yaqin AI Mosligi Aniqlandi!',
      message: `Siz va ${uA.firstName} o'rtasida ${report.compatibilityScore}% SkillMesh mosligi aniqlandi!`,
      type: 'match',
      isRead: false,
      timestamp: new Date().toISOString(),
      linkToTab: 'matches'
    });

    return res.status(200).json(newMatch);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Fetch active matched status (faqat o'zi)
app.get('/api/matches/:userId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    if (userId !== authId(req)) {
      return res.status(403).json({ error: 'Ruxsat yo\'q.' });
    }
    const allMatches = db.getMatches();
    const users = db.getUsers();
    const profiles = db.getProfiles();

    const formatted = allMatches
      .filter(m => m.userA_id === userId || m.userB_id === userId)
      .map(m => {
        const otherId = m.userA_id === userId ? m.userB_id : m.userA_id;
        const otherUser = users.find(u => u.id === otherId);
        const otherProfile = profiles.find(p => p.id === otherId);
        return { match: m, user: otherUser, profile: otherProfile };
      });

    return res.status(200).json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/matches/connect', requireAuth, (req: Request, res: Response) => {
  try {
    const { matchId } = req.body;
    const matches = db.getMatches();
    const match = matches.find(m => m.id === matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    // Faqat ushbu match ishtirokchisi ulanish amalini bajara oladi
    const me = authId(req);
    if (match.userA_id !== me && match.userB_id !== me) {
      return res.status(403).json({ error: 'Siz bu moslik ishtirokchisi emassiz.' });
    }

    match.status = 'connected';

    const convo = db.getOrCreateConversation(match.userA_id, match.userB_id);

    db.createMessage({
      id: `system-msg-${Date.now()}`,
      conversationId: convo.id,
      senderId: 'system',
      text: `Let's Swap! Agreement channels unlocked. You can draft safe escrow swaps using MESH credits in the agreements console.`,
      timestamp: new Date().toISOString(),
      isRead: false
    });

    db.createNotification({
      id: `notif-conn-${Date.now()}`,
      userId: match.userA_id,
      title: 'Mesh Exchange Accepted!',
      message: `You are now connected! Open Chat to state exchange terms.`,
      type: 'message',
      isRead: false,
      timestamp: new Date().toISOString(),
      linkToTab: 'chat'
    });

    db.createNotification({
      id: `notif-conn2-${Date.now()}`,
      userId: match.userB_id,
      title: 'Mesh Exchange Accepted!',
      message: `You are now connected! Open Chat to state exchange terms.`,
      type: 'message',
      isRead: false,
      timestamp: new Date().toISOString(),
      linkToTab: 'chat'
    });

    return res.status(200).json({ match, conversationId: convo.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- Chat System ---
// List convo logs (faqat o'zi)
app.get('/api/chat/conversations/:userId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    if (userId !== authId(req)) {
      return res.status(403).json({ error: 'Ruxsat yo\'q.' });
    }
    const convos = db.getConversations().filter(
      c => c.participantA_id === userId || c.participantB_id === userId
    );

    const users = db.getUsers();
    const profiles = db.getProfiles();

    const result = convos.map(c => {
      const partnerId = c.participantA_id === userId ? c.participantB_id : c.participantA_id;
      const partnerUser = users.find(u => u.id === partnerId);
      const partnerProfile = profiles.find(p => p.id === partnerId);
      return { ...c, partner: partnerUser, partnerProfile };
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET messages (faqat suhbat ishtirokchisi)
app.get('/api/chat/messages/:conversationId', requireAuth, (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const me = authId(req);

    const convo = db.getConversations().find(c => c.id === conversationId);
    if (!convo) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (convo.participantA_id !== me && convo.participantB_id !== me) {
      return res.status(403).json({ error: 'Siz bu suhbat ishtirokchisi emassiz.' });
    }

    const messages = db.getMessages(conversationId);
    db.clearUnreads(conversationId, me);

    return res.status(200).json(messages);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Send message (jo'natuvchi = autentifikatsiyalangan foydalanuvchi)
app.post('/api/chat/messages/send', requireAuth, (req: Request, res: Response) => {
  try {
    const senderId = authId(req);
    const { conversationId, text, voiceUrl, attachmentUrl } = req.body;

    const convo = db.getConversations().find(c => c.id === conversationId);
    if (!convo) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (convo.participantA_id !== senderId && convo.participantB_id !== senderId) {
      return res.status(403).json({ error: 'Siz bu suhbat ishtirokchisi emassiz.' });
    }

    const message = db.createMessage({
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      text: text || (voiceUrl ? '🎤 Voice Message' : '📎 Attachment'),
      timestamp: new Date().toISOString(),
      isRead: false,
      voiceUrl,
      attachmentUrl
    });

    const receiverId = convo.participantA_id === senderId ? convo.participantB_id : convo.participantA_id;
    const senderObj = db.getUser(senderId);
    db.createNotification({
      id: `notif-chat-${Date.now()}`,
      userId: receiverId,
      title: `Message from ${senderObj?.firstName || 'Partner'}`,
      message: text ? (text.length > 40 ? text.substring(0, 37) + '...' : text) : 'Sent a file.',
      type: 'message',
      isRead: false,
      timestamp: new Date().toISOString(),
      linkToTab: 'chat'
    });

    return res.status(200).json(message);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- Exchange Agreements ---
app.get('/api/agreements/:userId', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    if (userId !== authId(req)) {
      return res.status(403).json({ error: 'Ruxsat yo\'q.' });
    }
    const ags = db.getAgreements().filter(
      a => a.proposerId === userId || a.receiverId === userId
    );
    const users = db.getUsers();

    const formatted = ags.map(a => {
      const partnerId = a.proposerId === userId ? a.receiverId : a.proposerId;
      const partnerUser = users.find(u => u.id === partnerId);
      return { ...a, partner: partnerUser };
    });
    return res.status(200).json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Propose exchange agreement (proposer = autentifikatsiyalangan foydalanuvchi)
app.post('/api/agreements/propose', requireAuth, (req: Request, res: Response) => {
  try {
    const proposerId = authId(req);
    const { receiverId, title, offeredSkill, neededSkill, hours, creditStaked } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: 'Qabul qiluvchi (receiverId) ko\'rsatilishi shart.' });
    }
    if (receiverId === proposerId) {
      return res.status(400).json({ error: 'O\'zingiz bilan kelishuv tuzib bo\'lmaydi.' });
    }

    const stake = Number(creditStaked) || 0;
    const proposerProf = db.getProfile(proposerId);
    if (!proposerProf || (stake > 0 && proposerProf.credits < stake)) {
      return res.status(400).json({ error: 'Garov uchun hisobingizda yetarli MESH kredit yo\'q.' });
    }

    // Kelishuvni HAQIQIY suhbatga bog'laymiz (tizim xabarlari real chatda ko'rinishi uchun)
    const convo = db.getOrCreateConversation(proposerId, receiverId);

    const ag = db.createAgreement({
      id: `ag-${Date.now()}`,
      conversationId: convo.id,
      proposerId,
      receiverId,
      title: title || 'Bilateral Skill Exchange Agreement',
      offeredSkill,
      neededSkill,
      hours: Number(hours) || 1,
      creditStaked: stake,
      status: 'pending',
      proposerSigned: true, // taklif qiluvchi darhol imzolaydi
      receiverSigned: false,
      createdAt: new Date().toISOString()
    });

    const proposerUser = db.getUser(proposerId);
    db.createNotification({
      id: `notif-ag-${Date.now()}`,
      userId: receiverId,
      title: 'Exchange Proposed!',
      message: `${proposerUser?.firstName || 'Partner'} proposed a Skill Trade with ${stake} MESH staking!`,
      type: 'agreement',
      isRead: false,
      timestamp: new Date().toISOString(),
      linkToTab: 'agreements'
    });

    db.createMessage({
      id: `msg-ag-${Date.now()}`,
      conversationId: ag.conversationId,
      senderId: 'system',
      text: `📜 Agreement Proposed: "${ag.title}" to trade ${ag.offeredSkill} ↔ ${ag.neededSkill} (${ag.hours} hours). Requires signature check. Proposed with ${ag.creditStaked} MESH staking.`,
      timestamp: new Date().toISOString(),
      isRead: false
    });

    return res.status(200).json(ag);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Sign agreement (imzolovchi = autentifikatsiyalangan foydalanuvchi)
app.post('/api/agreements/sign', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = authId(req);
    const { agreementId } = req.body;
    const ag = db.signAgreement(agreementId, userId);
    if (!ag) return res.status(404).json({ error: 'Agreement not found' });

    if (ag.status === 'agreed') {
      db.createNotification({
        id: `notif-ag-sig-${Date.now()}`,
        userId: ag.proposerId,
        title: 'Shartnoma Faollashdi! 🚀',
        message: `Har ikki tomon "${ag.title}" shartnomasini imzoladi. Ish kreditlari MESH kafolati (escrow) ostida saqlandi.`,
        type: 'agreement',
        isRead: false,
        timestamp: new Date().toISOString()
      });

      db.createMessage({
        id: `msg-ag-act-${Date.now()}`,
        conversationId: ag.conversationId,
        senderId: 'system',
        text: `⚡ Shartnoma imzolandi va FAOLLASHTIRILDI: "${ag.title}". Kreditlar Escrowda muzlatildi. Almashinuvni yakunlab, "Bajarildi" (Complete) tugmasini bosing!`,
        timestamp: new Date().toISOString(),
        isRead: false
      });
    }

    return res.status(200).json(ag);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Complete and release credits (faqat ishtirokchi)
app.post('/api/agreements/complete', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = authId(req);
    const { agreementId } = req.body;
    const ag = db.completeAgreement(agreementId, userId);
    if (!ag) return res.status(404).json({ error: 'Agreement not found' });

    db.createMessage({
      id: `msg-ag-comp-${Date.now()}`,
      conversationId: ag.conversationId,
      senderId: 'system',
      text: `✅ Shartnoma BAJARILDI deb belgilandi: "${ag.title}". Garovdagi ${ag.creditStaked} MESH kreditlari o'qituvchiga o'tkazildi. Iltimos, o'zaro taqriz qoldiring!`,
      timestamp: new Date().toISOString(),
      isRead: false
    });

    const otherId = ag.proposerId === userId ? ag.receiverId : ag.proposerId;
    db.createNotification({
      id: `notif-ag-comp-${Date.now()}`,
      userId: otherId,
      title: 'Almashinuv yakunlandi! 🎖️',
      message: `"${ag.title}" muvaffaqiyatli yakunlandi. ${ag.creditStaked} MESH kreditlari o'tkazib berildi.`,
      type: 'credit',
      isRead: false,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json(ag);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// --- Credits Wallet ---
app.post('/api/credits/faucet', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = authId(req);
    const profile = db.getProfile(userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const txs = db.getTransactions(userId).filter(t => t.type === 'faucet');
    if (txs.length > 0) {
      const lastTx = txs.reduce((latest, current) => {
        return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
      });
      const hoursSince = (Date.now() - new Date(lastTx.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        return res.status(400).json({ error: `Navbatdagi bepul kredit olish imkoniyati ${Math.round(24 - hoursSince)} soatdan keyin ochiladi.` });
      }
    }

    profile.credits += 20;
    const faucetTx = db.createTransaction({
      id: `tx-faucet-${Date.now()}`,
      userId,
      amount: 20,
      type: 'faucet',
      description: 'Kunlik ekotizim krani bonusi olindi',
      timestamp: new Date().toISOString()
    });

    db.createNotification({
      id: `notif-fau-${Date.now()}`,
      userId,
      title: '+20 MESH olindi! 🪙',
      message: 'Kunlik global ishonch bonusingizni muvaffaqiyatli qabul qildingiz.',
      type: 'credit',
      isRead: false,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({ profile, transaction: faucetTx });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/credits/transactions/:userId', requireAuth, (req: Request, res: Response) => {
  try {
    if (req.params.userId !== authId(req)) {
      return res.status(403).json({ error: 'Ruxsat yo\'q.' });
    }
    const txs = db.getTransactions(req.params.userId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return res.status(200).json(txs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- Reviews ---
app.post('/api/reviews/submit', requireAuth, (req: Request, res: Response) => {
  try {
    const authorId = authId(req);
    const { targetId, rating, text, skillSwapped } = req.body;

    if (!targetId || !rating) {
      return res.status(400).json({ error: 'Maqsadli profil va baho kiritilishi shart' });
    }
    if (targetId === authorId) {
      return res.status(400).json({ error: 'O\'zingizga baho bera olmaysiz.' });
    }
    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Baho 1 dan 5 gacha bo\'lishi kerak.' });
    }

    const review = db.createReview({
      id: `rev-${Date.now()}`,
      authorId,
      targetId,
      rating: numRating,
      text: text || 'O\'zaro almashinuv ajoyib tarzda yakunlandi!',
      timestamp: new Date().toISOString(),
      skillSwapped: skillSwapped || 'Ikki tomonlama almashinuv'
    });

    db.createNotification({
      id: `notif-rev-${Date.now()}`,
      userId: targetId,
      title: 'Yangi yulduzli baho! ★',
      message: `${review.rating} yulduzli baho berildi: ${review.skillSwapped}. Obro'ingiz ko'rsatkichi yangilandi.`,
      type: 'system',
      isRead: false,
      timestamp: new Date().toISOString(),
      linkToTab: 'profile'
    });

    return res.status(200).json(review);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- Community Feed ---
app.get('/api/community/posts', requireAuth, (req: Request, res: Response) => {
  try {
    return res.status(200).json(db.getPosts());
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/community/posts/create', requireAuth, (req: Request, res: Response) => {
  try {
    const authorId = authId(req);
    const { title, content, neededSkill, offeredSkill } = req.body;
    const authorUser = db.getUser(authorId);

    if (!authorUser) {
      return res.status(404).json({ error: 'Author profile not found' });
    }

    const post = db.createPost({
      id: `post-${Date.now()}`,
      authorId,
      authorName: authorUser.firstName,
      authorUsername: authorUser.username,
      authorPhotoUrl: authorUser.photoUrl,
      title: title || 'Yangi almashinuv e\'loni',
      content: content || '',
      neededSkill: neededSkill || 'Har qanday mahoratni o\'rganishga tayyor!',
      offeredSkill: offeredSkill || 'Ochiq almashinuv',
      likes: 0,
      commentsCount: 0,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json(post);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/community/posts/like', requireAuth, (req: Request, res: Response) => {
  try {
    const { postId } = req.body;
    const likes = db.likePost(postId);
    return res.status(200).json({ postId, likes });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/community/posts/:postId/comments', requireAuth, (req: Request, res: Response) => {
  try {
    return res.status(200).json(db.getComments(req.params.postId));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/community/comments/create', requireAuth, (req: Request, res: Response) => {
  try {
    const authorId = authId(req);
    const { postId, content } = req.body;
    const authorUser = db.getUser(authorId);
    if (!authorUser) return res.status(404).json({ error: 'Author not found' });

    const comment = db.createComment({
      id: `comm-${Date.now()}`,
      postId,
      authorId,
      authorName: authorUser.firstName,
      authorUsername: authorUser.username,
      content,
      timestamp: new Date().toISOString()
    });

    const post = db.getPosts().find(p => p.id === postId);
    if (post && post.authorId !== authorId) {
      db.createNotification({
        id: `notif-com-${Date.now()}`,
        userId: post.authorId,
        title: 'Yangi sharh qoldirildi!',
        message: `${authorUser.firstName} sizning e'loningizga fikr bildirdi: "${(content || '').substring(0, 25)}..."`,
        type: 'system',
        isRead: false,
        timestamp: new Date().toISOString(),
        linkToTab: 'community'
      });
    }

    return res.status(200).json(comment);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- System Notifications (faqat o'zi) ---
app.get('/api/notifications/:userId', requireAuth, (req: Request, res: Response) => {
  try {
    if (req.params.userId !== authId(req)) {
      return res.status(403).json({ error: 'Ruxsat yo\'q.' });
    }
    return res.status(200).json(db.getNotifications(req.params.userId));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/read', requireAuth, (req: Request, res: Response) => {
  try {
    const { notificationId } = req.body;
    db.markNotificationRead(notificationId);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- AI Chatbot Assistant ---
app.post('/api/ai-assistant/message', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = authId(req);
    const { message, history } = req.body;
    const user = db.getUser(userId);
    const profile = db.getProfile(userId);

    if (!user || !profile) {
      return res.status(404).json({ error: 'AI index requires synchronized profile.' });
    }

    // Tarixni Gemini formatiga o'tkazamiz va MAJBURIY 'user' rolidan boshlanishini ta'minlaymiz
    let compiledHistory = (history || []).map((h: any) => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));
    // Boshidagi 'model' (bot salomi) xabarlarini olib tashlaymiz — Gemini contents 'user' dan boshlanishi shart
    while (compiledHistory.length > 0 && compiledHistory[0].role !== 'user') {
      compiledHistory.shift();
    }

    const responseText = await getGuildMasterResponse(user, profile, compiledHistory, message);
    return res.status(200).json({ text: responseText, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('AI assistant route error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// --- Admin Capabilities (faqat admin roli) ---
app.get('/api/admin/stats', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const users = db.getUsers();
    const profiles = db.getProfiles();
    const posts = db.getPosts();
    const agreements = db.getAgreements();
    const reviews = db.getReviews();

    const fullUsers = users.map(u => {
      const p = profiles.find(p => p.id === u.id);
      return { user: u, profile: p };
    });

    return res.status(200).json({
      counts: {
        users: users.length,
        posts: posts.length,
        agreements: agreements.length,
        reviews: reviews.length
      },
      users: fullUsers,
      posts,
      agreements
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users/delete', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });
    if (userId === authId(req)) {
      return res.status(400).json({ error: 'Admin o\'z hisobini o\'chira olmaydi.' });
    }
    const success = db.deleteUser(userId);
    return res.status(200).json({ success });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/posts/delete', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: 'Post ID is required' });
    const success = db.deletePost(postId);
    return res.status(200).json({ success });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/agreements/resolve', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { agreementId, outcome } = req.body;
    if (!agreementId || !outcome) {
      return res.status(400).json({ error: 'agreementId and outcome are required' });
    }
    const updated = db.forceResolveAgreement(agreementId, outcome);
    if (!updated) return res.status(404).json({ error: 'Agreement not found' });
    return res.status(200).json({ success: true, agreement: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// --- Payment System (hozircha simulyatsiya — Phase 2 da real provayder) ---
app.post('/api/payment/buy-mesh', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = authId(req);
    const { amount, method } = req.body;
    if (!amount || !method) {
      return res.status(400).json({ error: 'amount va method majburiy' });
    }
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Summa noto\'g\'ri.' });
    }
    const p = db.buyMesh(userId, numAmount, method);
    if (!p) return res.status(404).json({ error: 'User profile not found' });
    return res.status(200).json({ success: true, profile: p });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// VITE OR STATIC ASSETS ROUTING
// ==========================================

const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  // Initialize Database (loads Supabase remote state if configured)
  await db.init();

  if (isProd) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`🚀 SkillMesh Full-Stack Server active on: http://localhost:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Failed to launch SkillMesh gateway server:', err);
});
