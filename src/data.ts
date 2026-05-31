import { Profile, User, CommunityPost, Review, Skill } from './types';

export const INITIAL_USERS: User[] = [];

export const INITIAL_PROFILES: Profile[] = [];

export const INITIAL_REVIEWS: Review[] = [];

export const INITIAL_POSTS: CommunityPost[] = [];


export const SKILL_TEMPLATES = [
  { name: 'Python veb-skraping', category: 'Programming' },
  { name: 'React asoslari', category: 'Programming' },
  { name: 'SQL va ma\'lumotlar bazasi loyihasi', category: 'Programming' },
  { name: 'Ingliz tili muloqoti', category: 'Languages' },
  { name: 'IELTS tayyorgarlik', category: 'Languages' },
  { name: 'Ispan tili amaliyoti', category: 'Languages' },
  { name: 'Raqamli marketing', category: 'Marketing' },
  { name: 'SEO optimallashtirish', category: 'Marketing' },
  { name: 'Kopirayting', category: 'Marketing' },
  { name: 'Figma UX dizayn', category: 'Design' },
  { name: 'Mobil ilovalar interaktiv dizayni', category: 'Design' },
  { name: 'Illustratsiya', category: 'Design' },
  { name: 'Sun\'iy intellekt muhandisligi', category: 'Programming' },
  { name: 'Taqdimot tayyorlash', category: 'Business' },
  { name: 'Startap investitsiya jalb qilish', category: 'Business' }
];
