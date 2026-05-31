import { GoogleGenAI, Type } from '@google/genai';
import { Profile, User } from '../src/types';

// Let's create an optional lazy-initialized client to avoid crashing on start if the key is missing.
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    console.warn('GEMINI_API_KEY is not set or keeps default value. Falling back to structured mock intelligence.');
    return null;
  }
  
  try {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    return aiClient;
  } catch (error) {
    console.error('Failed to initialize GoogleGenAI client:', error);
    return null;
  }
}

/**
 * AI Matching Engine
 * Uses Gemini to evaluate Offered skills of User A against Needs of User B and vice versa.
 */
export async function computeAiCompatibility(
  currentUser: User,
  currentProfile: Profile,
  targetUser: User,
  targetProfile: Profile
): Promise<{ compatibilityScore: number; reasoning: string; offeredMatch: string[]; neededMatch: string[] }> {
  
  const client = getAiClient();
  
  const offeredA = currentProfile.offeredSkills.map(s => `${s.name} (${s.level})`).join(', ');
  const neededA = currentProfile.neededSkills.join(', ');
  const offeredB = targetProfile.offeredSkills.map(s => `${s.name} (${s.level})`).join(', ');
  const neededB = targetProfile.neededSkills.join(', ');

  // Determine standard overlaps for lists
  const matchOffered = currentProfile.offeredSkills
    .filter(skill => targetProfile.neededSkills.some(need => need.toLowerCase().includes(skill.name.toLowerCase())))
    .map(s => s.name);
    
  const matchNeeded = targetProfile.offeredSkills
    .filter(skill => currentProfile.neededSkills.some(need => need.toLowerCase().includes(skill.name.toLowerCase())))
    .map(s => s.name);

  if (!client) {
    // Elegant heuristic mockup if no Gemini key is set.
    let baseScore = 40;
    if (matchOffered.length > 0) baseScore += 25;
    if (matchNeeded.length > 0) baseScore += 25;
    if (currentProfile.location.split(',')[1]?.trim() === targetProfile.location.split(',')[1]?.trim()) {
      baseScore += 5; // same country bonus
    }
    const finalScore = Math.min(98, Math.max(30, baseScore));

    const simulatedReasoning = `O'zaro manfaatlar asosida, **${currentUser.firstName}** to'g'ridan-to'g'ri **${targetUser.firstName}** ning o'quv darslariga mos keladigan **${matchOffered.length > 0 ? matchOffered.join(', ') : 'ta\'limiy yordam'}** taklif qilishi mumkin. Buning evaziga **${targetUser.firstName}** o'zining **${matchNeeded.length > 0 ? matchNeeded.join(', ') : 'asosiy mahorati'}** bo'yicha ekspert maslahatlari bilan bo'lishishi mumkin. Ushbu o'zaro almashinuv SkillMesh standartlari bo'yicha **${finalScore}%** moslik darajasini ko'rsatmoqda. Suhbatni boshlang va shartlarni kelishib oling!`;

    return {
      compatibilityScore: finalScore,
      reasoning: simulatedReasoning,
      offeredMatch: matchOffered.length > 0 ? matchOffered : ['Asosiy maslahat'],
      neededMatch: matchNeeded.length > 0 ? matchNeeded : ['Texnik ko\'mak']
    };
  }

  try {
    const prompt = `
      You are the SkillMesh Synergy AI Engine matching global experts and learners.
      Coordinate a skill trade profile exchange between:
      
      User A: ${currentUser.firstName} ${currentUser.lastName || ''} (@${currentUser.username})
      Bio: ${currentProfile.bio}
      Offers: [${offeredA}]
      Needs: [${neededA}]
      
      User B: ${targetUser.firstName} ${targetUser.lastName || ''} (@${targetUser.username})
      Bio: ${targetProfile.bio}
      Offers: [${offeredB}]
      Needs: [${neededB}]
      
      Tasks:
      1. Calculate an integer compatibility core score (0 to 100) reflecting bilateral trade efficiency. If User A offers what User B needs AND User B offers what User A needs, it is highly optimal (85-98%). If it is only single-way, it is medium (50-70%).
      2. Produce a short, highly professional, encouraging, premium markdown explanation (approx 3 sentences) in Uzbek (O'zbekcha) explaining specifically what they can trade, why they make sense together, and some inspiring action they could take.
      3. Identify exactly which specific text strings represent Offered Overlaps (User A offers, User B needs) and Needed Overlaps (User B offers, User A needs).
      
      Respond in strict JSON matching the schema below. Do not output anything else.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            compatibilityScore: { type: Type.INTEGER, description: 'Bilateral trade percentage (30 to 98)' },
            reasoning: { type: Type.STRING, description: 'Markdown scannable partnership reasoning in Uzbek' },
            offeredMatch: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Strings corresponding to A offers that B needs' },
            neededMatch: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Strings corresponding to B offers that A needs' }
          },
          required: ['compatibilityScore', 'reasoning', 'offeredMatch', 'neededMatch']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      compatibilityScore: parsed.compatibilityScore || 50,
      reasoning: parsed.reasoning || 'Ushbu hamkorlik ajoyib almashinuv imkoniyatlarini taqdim etadi. Kelishuvni boshlash uchun muloqot kanalini oching!',
      offeredMatch: (parsed.offeredMatch && parsed.offeredMatch.length > 0) ? parsed.offeredMatch : (matchOffered.length > 0 ? matchOffered : ['Mahorat darslari']),
      neededMatch: (parsed.neededMatch && parsed.neededMatch.length > 0) ? parsed.neededMatch : (matchNeeded.length > 0 ? matchNeeded : ['O\'zaro taqriz'])
    };
  } catch (error) {
    console.error('Gemini error during compute compatibility, falling back:', error);
    return {
      compatibilityScore: 78,
      reasoning: `Ikki tomonlama almashinuv yuqori samaradorlikka ega. **${currentUser.firstName}** o'z mahoratini **${targetUser.firstName}** ning maqsadlari bilan muvofiqlashtira oladi. Shartnomani rasmiylashtirish uchun suhbatni boshlang!`,
      offeredMatch: matchOffered,
      neededMatch: matchNeeded
    };
  }
}

/**
 * AI Guild Master Assistant Support Chat
 */
export async function getGuildMasterResponse(
  user: User,
  profile: Profile,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  newMessage: string
): Promise<string> {
  const client = getAiClient();
  
  const offeredStr = profile.offeredSkills.map(s => `${s.name} (${s.level})`).join(', ');
  const neededStr = profile.neededSkills.join(', ');

  const systemPrompt = `
    Siz "SkillMesh Uyushmasi Rahbari Sun'iy Intellekti" siz, oliy darajadagi martaba va hamkorlik tahlilchisiz.
    Siz SkillMesh platformasidagi (Inson qapitali almashinuvi tarmog'i) shogirdlarga yo'l ko'rsatasiz.
    
    Foydalanuvchi ma'lumotlari:
    Ism: ${user.firstName} (@${user.username})
    Taklif etayotgan mahorati: [${offeredStr || 'Hali tanlanmagan'}]
    Ehtiyojlari: [${neededStr || 'Hali tanlanmagan'}]
    Ishonch balli (Trust score): ${profile.trustScore}/100.
    Balansidagi $MESH kreditlar: ${profile.credits} MESH.
    
    Ko'rsatmalar:
    1. FAQAT O'ZBEK monitoringida, oliyjanob, professional va samimiy ohangda javob bering. Dizaynimiz qora va tilla rangli elita uslubida bo'lgani uchun, javoblaringiz ham shunga mos dabdabali/yuqori darajada bo'lsin.
    2. Foydalanuvchiga o'z mahorati bo'yicha qanday almashinuv qilish, takliflarini qanday boyitish bo'yicha aniq maslahat bering.
    3. $MESH kreditlari va ishonch ballini eslatib o'ting. Kreditlarni "Almashinuv Shartnomalari" (Exchange Agreements) ichida garov sifatida saqlash imkonini tushuntiring.
    4. Javoblarni qisqa, tushunarli va markdown formatida yozing. Keraksiz uzun so'zlardan qoching.
  `;

  if (!client) {
    // Intelligent fallback mock chat
    const lower = newMessage.toLowerCase();
    if (lower.includes('salom') || lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return `SkillMesh Uyushmasiga xush kelibsiz, hurmatli **${user.firstName}**! 
 
Men sizning Uyushma boshlig'i yordamchingizman. Profilingiz tahlili:
* Sizda **${profile.credits} MESH kreditlari** mavjud.
* Joriy ishonch ko'rsatkichingiz: **${profile.trustScore}%**.
 
Bugun sizga qanday yordam bera olaman o'zaro hamkorlikni boshlaymiz? Men sizga mos sheriklar taklif qilishim, shartnomalarni qanday tuzishni tushuntirishim yoki taqriz yozishda ko'maklashishim mumkin!`;
    }
    if (lower.includes('kredit') || lower.includes('mesh') || lower.includes('token') || lower.includes('wallet')) {
      return `SkillMesh tizimida kreditlar (**$MESH**) kafolat vazifasini bajaradi:
* **Shartnoma Garovi**: Almashinuv kelishuvini imzolaganingizda, masalan, 50 $MESH ni muzlatib (escrow) qo'yasiz.
* **Kafolatlangan yetkazib berish**: Dars yoki dasturlash vazifasi muvaffaqiyatli yakunlangach, kreditlar avtomat ravishda ikkinchi tomonga o'tkaziladi.
* **Bepul kran (Faucet)**: Har 24 soatda Hamyon (Wallet) sahifasidagi **Gold Faucet (Kran)** tugmasini bosib, 20 MESH bepul mukofot olishni unutmang!`;
    }
    if (lower.includes('hamkor') || lower.includes('sherik') || lower.includes('almash') || lower.includes('match') || lower.includes('find')) {
      return `Hozirda yangi hamkorlarni topish uchun **Qidiruv** sahifasiga o'ting. Quyidagilarni taklif qilaman:
* Qidiruv sahifasida turli toifadagi foydalanuvchilarni tekshirib ko'ring.
* O'zingiz taklif qiladigan va o'rganmoqchi bo'lgan malakalaringizni to'liq to'ldiring.
* Biznesingiz yoki loyihalaringiz uchun birgalikda kvest va kashfiyotlar e'lonini joylashtiring.

O'zingizga mos keladigan biron bir foydalanuvchi yoki o'quv yo'nalishi bo'yicha taklif xabari loyihasini yozib berishimni istaysizmi?`;
    }

    return `Ajoyib savol! Tizimda sizning takliflaringiz muvaffaqiyatli ro'yxatga olindi: **${offeredStr || 'Umumiy almashinuv'}**. 

SkillMesh obro'ingizni maksimal darajada oshirish uchun quyidagilarni tavsiya qilaman:
1. O'z profilingizni to'liq to'ldiring va mahoratlarni yangilang.
2. Quests (E'lonlar paneli) sahifasida yangi hamkorlik e'lonini joylashtiring.
3. Sherik topgach "Almashinuv Shartnomasi" tuzib, ishonchli bitimlarni garovga oling.

Profil tavsifingizni boshqalarga jozibali ko'rinishi uchun qayta yozib berishimni istasangiz, so'rashingiz mumkin!`;
  }

  try {
    // Standard chat formatting
    const formattedContents = [
      ...history,
      { role: 'user', parts: [{ text: newMessage }] }
    ] as any;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7
      }
    });

    return response.text || 'Kechirasiz, suhbatni tahlil qilishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring!';
  } catch (err) {
    console.error('Gemini Assistant error:', err);
    return `Assalomu alaykum, hurmatli **${user.firstName}**! Xabaringizni qabul qildim, biroq mening sun'iy neyronlarimda vaqtinchalik texnik cheklovlar kuzatilmoqda. Hozircha "Explore" bo'limidagi mos sheriklarni tekshirishingizni yoki tekin MESH yig'ishni davom ettirishingizni taklif qilaman!`;
  }
}
