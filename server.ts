import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { db } from './server/db.ts';
import { computeAiCompatibility, getGuildMasterResponse } from './server/gemini.ts';
import { User, Skill, Profile, Message, ExchangeAgreement, Review, CommunityPost, CommunityComment, Notification } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = 3000; // Hardcoded container port

app.use(express.json());

// Simple logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// API ROUTES
// ==========================================

// --- Health Check & UptimeRobot Monitoring ---
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
// Sync Telegram webapp user or fallback mock
app.post('/api/auth/sync', (req: Request, res: Response) => {
  try {
    const { id, username, first_name, last_name, photo_url, language_code } = req.body;
    
    if (!id) {
       return res.status(400).json({ error: 'User ID is required' });
    }

    const userId = `tg-${id}`;
    const normalizedUser: User = {
      id: userId,
      telegramId: String(id),
      username: username || `tg_${id}`,
      firstName: first_name || 'Anonymous',
      lastName: last_name || '',
      photoUrl: photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
      languageCode: language_code || 'en',
      isPremium: false,
      joinDate: new Date().toISOString().split('T')[0]
    };

    const synced = db.createUser(normalizedUser);
    const profile = db.getProfile(userId);

    return res.status(200).json({ user: synced, profile });
  } catch (error: any) {
    console.error('Auth sync error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update profile
app.post('/api/profile/update', (req: Request, res: Response) => {
  try {
    const { userId, bio, location, language, activityLevel, offeredSkills, neededSkills } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

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

// GET profile
app.get('/api/profile/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = db.getUser(userId);
    const profile = db.getProfile(userId);

    if (!user || !profile) {
      return res.status(404).json({ error: 'Profile metadata not found' });
    }

    // Include average star reviews
    const revs = db.getReviews().filter(r => r.targetId === userId);
    return res.status(200).json({ user, profile, reviews: revs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// List all profiles for matching/explore index
app.get('/api/profiles', (req: Request, res: Response) => {
  try {
    const currentUserId = req.query.exclude as string;
    const users = db.getUsers();
    const profiles = db.getProfiles();

    const output = profiles
      .filter(p => p.id !== currentUserId)
      .map(p => {
        const u = users.find(user => user.id === p.id);
        return {
          user: u,
          profile: p
        };
      });

    return res.status(200).json(output);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Toggle premium
app.post('/api/profile/premium', (req: Request, res: Response) => {
  try {
    const { userId, isPremium } = req.body;
    const u = db.updateUserPremium(userId, isPremium);
    if (!u) return res.status(404).json({ error: 'User not found' });
    
    // Reward Premium sign bonus credits
    if (isPremium) {
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
app.post('/api/matches/compute', async (req: Request, res: Response) => {
  try {
    const { currentUserId, targetUserId } = req.body;
    
    const uA = db.getUser(currentUserId);
    const pA = db.getProfile(currentUserId);
    const uB = db.getUser(targetUserId);
    const pB = db.getProfile(targetUserId);

    if (!uA || !pA || !uB || !pB) {
      return res.status(404).json({ error: 'Profile pairings missing' });
    }

    // Check if match already has computed record
    const existing = db.getMatches().find(
      m => (m.userA_id === currentUserId && m.userB_id === targetUserId) ||
           (m.userA_id === targetUserId && m.userB_id === currentUserId)
    );

    if (existing) {
      return res.status(200).json(existing);
    }

    // Compute fresh AI Match
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

// Fetch active matched status
app.get('/api/matches/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const allMatches = db.getMatches();
    const users = db.getUsers();
    const profiles = db.getProfiles();

    // Find and format matches involving this user
    const formatted = allMatches
      .filter(m => m.userA_id === userId || m.userB_id === userId)
      .map(m => {
        const otherId = m.userA_id === userId ? m.userB_id : m.userA_id;
        const otherUser = users.find(u => u.id === otherId);
        const otherProfile = profiles.find(p => p.id === otherId);
        return {
          match: m,
          user: otherUser,
          profile: otherProfile
        };
      });

    return res.status(200).json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/matches/connect', (req: Request, res: Response) => {
  try {
    const { matchId } = req.body;
    const matches = db.getMatches();
    const match = matches.find(m => m.id === matchId);
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    match.status = 'connected';
    
    // Auto provision conversation for chatting
    const convo = db.getOrCreateConversation(match.userA_id, match.userB_id);

    // Send first system message initiating
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
// List convo logs
app.get('/api/chat/conversations/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const convos = db.getConversations().filter(
      c => c.participantA_id === userId || c.participantB_id === userId
    );

    const users = db.getUsers();
    const profiles = db.getProfiles();

    const result = convos.map(c => {
      const partnerId = c.participantA_id === userId ? c.participantB_id : c.participantA_id;
      const partnerUser = users.find(u => u.id === partnerId);
      const partnerProfile = profiles.find(p => p.id === partnerId);
      return {
        ...c,
        partner: partnerUser,
        partnerProfile
      };
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET messages
app.get('/api/chat/messages/:conversationId', (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query; // to clear unreads
    const messages = db.getMessages(conversationId);
    
    if (userId) {
      db.clearUnreads(conversationId, userId as string);
    }

    return res.status(200).json(messages);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Send custom message / supporting attachment and voice mocks
app.post('/api/chat/messages/send', (req: Request, res: Response) => {
  try {
    const { conversationId, senderId, text, voiceUrl, attachmentUrl } = req.body;
    
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

    // Alert other participant
    const convo = db.getConversations().find(c => c.id === conversationId);
    if (convo) {
      const receiverId = convo.participantA_id === senderId ? convo.participantB_id : convo.participantA_id;
      const senderObj = db.getUser(senderId);
      db.createNotification({
        id: `notif-chat-${Date.now()}`,
        userId: receiverId,
        title: `Message from ${senderObj?.firstName || 'Partenr'}`,
        message: text ? (text.length > 40 ? text.substring(0, 37) + '...' : text) : 'Sent a file.',
        type: 'message',
        isRead: false,
        timestamp: new Date().toISOString(),
        linkToTab: 'chat'
      });
    }

    return res.status(200).json(message);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- Exchange Agreements ---
app.get('/api/agreements/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const ags = db.getAgreements().filter(
      a => a.proposerId === userId || a.receiverId === userId
    );
    const users = db.getUsers();
    
    const formatted = ags.map(a => {
       const partnerId = a.proposerId === userId ? a.receiverId : a.proposerId;
       const partnerUser = users.find(u => u.id === partnerId);
       return {
         ...a,
         partner: partnerUser
       };
    });
    return res.status(200).json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Propose exchange agreement
app.post('/api/agreements/propose', (req: Request, res: Response) => {
  try {
    const { conversationId, proposerId, receiverId, title, offeredSkill, neededSkill, hours, creditStaked } = req.body;
    
    // Verify proposer has sufficient credits if staking
    const proposerProf = db.getProfile(proposerId);
    if (!proposerProf || (creditStaked > 0 && proposerProf.credits < creditStaked)) {
      return res.status(400).json({ error: 'Insufficient credits in wallet to stake' });
    }

    const ag = db.createAgreement({
      id: `ag-${Date.now()}`,
      conversationId: conversationId || `convo-ag-${Date.now()}`,
      proposerId,
      receiverId,
      title: title || 'Bilateral Skill Exchange Agreement',
      offeredSkill,
      neededSkill,
      hours: Number(hours) || 1,
      creditStaked: Number(creditStaked) || 0,
      status: 'pending',
      proposerSigned: true, // proposer signs immediately
      receiverSigned: false,
      createdAt: new Date().toISOString()
    });

    const proposerUser = db.getUser(proposerId);
    db.createNotification({
      id: `notif-ag-${Date.now()}`,
      userId: receiverId,
      title: 'Exchange Proposed!',
      message: `${proposerUser?.firstName || 'Partner'} proposed a Skill Trade with ${creditStaked} MESH staking!`,
      type: 'agreement',
      isRead: false,
      timestamp: new Date().toISOString(),
      linkToTab: 'agreements'
    });

    // Also inject into message logs for reference
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
    return res.status(500).json({ error: error.message });
  }
});

// Sign agreement
app.post('/api/agreements/sign', (req: Request, res: Response) => {
  try {
    const { agreementId, userId } = req.body;
    const ag = db.signAgreement(agreementId, userId);
    if (!ag) return res.status(404).json({ error: 'Agreement not found' });

    if (ag.status === 'agreed') {
      // Both signed!
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
        text: `⚡ Shartnoma imzolandi va FAOLLASHTIRILDI: "${ag.title}". Kreditlar Escrowda muzlatildi. Almashinuvni yakunlab, quyidagi "Bajarildi" (Complete) tugmasini bosing!`,
        timestamp: new Date().toISOString(),
        isRead: false
      });
    }

    return res.status(200).json(ag);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Complete and release credits
app.post('/api/agreements/complete', (req: Request, res: Response) => {
  try {
    const { agreementId, userId } = req.body;
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

    // Notify receiving user
    const otherId = ag.proposerId === userId ? ag.receiverId : ag.proposerId;
    db.createNotification({
      id: `notif-ag-comp-${Date.now()}`,
      userId: otherId,
      title: 'Almashinuv yakunlandi! 🎖️',
      message: `"${ag.title}" muvaffaqiyatli yakunlandi. ${ag.creditStaked} MESH kreditlari o'tkazib berildi. O'zaro ishonch ballingiz oshdi.`,
      type: 'credit',
      isRead: false,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json(ag);
  } catch (error: any) {
     return res.status(500).json({ error: error.message });
  }
});

// --- Credits Wallet ---
app.post('/api/credits/faucet', (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const profile = db.getProfile(userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Validate if claimed too recently
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

app.get('/api/credits/transactions/:userId', (req: Request, res: Response) => {
  try {
     const txs = db.getTransactions(req.params.userId).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
     return res.status(200).json(txs);
  } catch (error: any) {
     return res.status(500).json({ error: error.message });
  }
});

// --- Reviews ---
app.post('/api/reviews/submit', (req: Request, res: Response) => {
  try {
    const { authorId, targetId, rating, text, skillSwapped } = req.body;
    
    if (!authorId || !targetId || !rating) {
      return res.status(400).json({ error: 'Muallif, maqsadli profil va baho kiritilishi shart' });
    }

    const review = db.createReview({
      id: `rev-${Date.now()}`,
      authorId,
      targetId,
      rating: Number(rating),
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
app.get('/api/community/posts', (req: Request, res: Response) => {
  try {
     return res.status(200).json(db.getPosts());
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/community/posts/create', (req: Request, res: Response) => {
  try {
    const { authorId, title, content, neededSkill, offeredSkill } = req.body;
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

app.post('/api/community/posts/like', (req: Request, res: Response) => {
  try {
    const { postId } = req.body;
    const likes = db.likePost(postId);
    return res.status(200).json({ postId, likes });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/community/posts/:postId/comments', (req: Request, res: Response) => {
  try {
     return res.status(200).json(db.getComments(req.params.postId));
  } catch (error: any) {
     return res.status(500).json({ error: error.message });
  }
});

app.post('/api/community/comments/create', (req: Request, res: Response) => {
  try {
    const { postId, authorId, content } = req.body;
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

    // Notify post author if different
    const post = db.getPosts().find(p => p.id === postId);
    if (post && post.authorId !== authorId) {
      db.createNotification({
        id: `notif-com-${Date.now()}`,
        userId: post.authorId,
        title: 'Yangi sharh qoldirildi!',
        message: `${authorUser.firstName} sizning e'loningizga fikr bildirdi: "${content.substring(0,25)}..."`,
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

// --- System Notifications ---
app.get('/api/notifications/:userId', (req: Request, res: Response) => {
  try {
     return res.status(200).json(db.getNotifications(req.params.userId));
  } catch (error: any) {
     return res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/read', (req: Request, res: Response) => {
  try {
    const { notificationId } = req.body;
    db.markNotificationRead(notificationId);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- AI Chatbot Assistant ---
app.post('/api/ai-assistant/message', async (req: Request, res: Response) => {
  try {
    const { userId, message, history } = req.body;
    const user = db.getUser(userId);
    const profile = db.getProfile(userId);

    if (!user || !profile) {
      return res.status(404).json({ error: 'AI index requires synchronized profile.' });
    }

    const compiledHistory = (history || []).map((h: any) => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    const responseText = await getGuildMasterResponse(user, profile, compiledHistory, message);
    return res.status(200).json({ text: responseText, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('AI assistant route error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// --- Admin Capabilities ---
app.get('/api/admin/stats', (req: Request, res: Response) => {
  try {
    const users = db.getUsers();
    const profiles = db.getProfiles();
    const posts = db.getPosts();
    const agreements = db.getAgreements();
    const reviews = db.getReviews();
    
    // Compile users with profiles for admin control table
    const fullUsers = users.map(u => {
      const p = profiles.find(p => p.id === u.id);
      return {
        user: u,
        profile: p
      };
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

app.post('/api/admin/users/delete', (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });
    const success = db.deleteUser(userId);
    return res.status(200).json({ success });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/posts/delete', (req: Request, res: Response) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: 'Post ID is required' });
    const success = db.deletePost(postId);
    return res.status(200).json({ success });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/agreements/resolve', (req: Request, res: Response) => {
  try {
    const { agreementId, outcome } = req.body;
    if (!agreementId || !outcome) {
      return res.status(400).json({ error: 'agreementId and outcome are required' });
    }
    const updated = db.forceResolveAgreement(agreementId, outcome);
    if (!updated) return res.status(404).json({ error: 'Agreement not found' });
    return res.status(200).json({ success: true, agreement: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- Payment System Simulator ---
app.post('/api/payment/buy-mesh', (req: Request, res: Response) => {
  try {
    const { userId, amount, method } = req.body;
    if (!userId || !amount || !method) {
      return res.status(400).json({ error: 'userId, amount, and method are required' });
    }
    const p = db.buyMesh(userId, Number(amount), method);
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
    // Serve build static files directly
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Automatically import development middleware inside async bootstrap
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

