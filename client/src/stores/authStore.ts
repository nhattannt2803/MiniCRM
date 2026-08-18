import { create } from 'zustand';
import { User, Business } from '../types';
import api from '../services/api';

interface ActiveBiz {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  role: string;
  roleName?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  businesses: Business[];
  activeBiz: ActiveBiz | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (data: { email: string; pass: string; firstName: string; lastName: string; phone?: string }) => Promise<any>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  switchBiz: (bizId: string) => Promise<void>;
  switchBizBySlug: (slug: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,
  businesses: [],
  activeBiz: null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true,

  register: async ({ email, pass, firstName, lastName, phone }) => {
    const res: any = await api.post('/auth/register', { email, password: pass, firstName, lastName, phone });
    const { token, user, businesses, activeBiz } = res.data;
    localStorage.setItem('token', token);
    set({
      token,
      user,
      businesses: businesses || [],
      activeBiz: activeBiz || null,
      isAuthenticated: true,
      isLoading: false,
    });
    return res.data;
  },

  login: async (email, password) => {
    const res: any = await api.post('/auth/login', { email, password });
    const { token, user, businesses, activeBiz } = res.data;
    localStorage.setItem('token', token);
    if (activeBiz) {
      localStorage.setItem('activeBizId', activeBiz.id);
    }
    set({
      token,
      user,
      businesses: businesses || [],
      activeBiz: activeBiz || null,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeBizId');
    set({ token: null, user: null, businesses: [], activeBiz: null, isAuthenticated: false, isLoading: false });
  },

  fetchMe: async () => {
    try {
      if (!localStorage.getItem('token')) {
        set({ isLoading: false });
        return;
      }
      const res: any = await api.get('/auth/me');
      const userData = res.data;
      
      // Fetch businesses list
      let businesses: Business[] = [];
      try {
        const bizRes: any = await api.get('/businesses');
        businesses = bizRes.data || [];
      } catch (err) {
        // User has no business membership
      }

      // Determine activeBiz
      const savedBizId = localStorage.getItem('activeBizId');
      let active: ActiveBiz | null = null;

      if (businesses.length > 0) {
        let match = businesses.find((b: any) => b.id === savedBizId);
        if (!match) {
          match = businesses.find((b: any) => b.isDefault) || businesses[0];
        }
        if (match) {
          active = {
            id: match.id,
            name: match.name,
            slug: match.slug,
            logo: match.logo,
            role: (match as any).roleCode || 'SALES',
            roleName: (match as any).roleName,
          };
          localStorage.setItem('activeBizId', match.id);
        }
      }

      set({ user: userData, businesses, activeBiz: active, isAuthenticated: true, isLoading: false });
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('activeBizId');
      set({ token: null, user: null, businesses: [], activeBiz: null, isAuthenticated: false, isLoading: false });
    }
  },

  switchBiz: async (bizId: string) => {
    const { businesses } = get();
    const match = businesses.find((b) => b.id === bizId);
    if (match) {
      localStorage.setItem('activeBizId', bizId);
      set({
        activeBiz: {
          id: match.id,
          name: match.name,
          slug: match.slug,
          logo: match.logo,
          role: (match as any).roleCode || 'SALES',
          roleName: (match as any).roleName,
        },
      });
      try {
        await api.patch('/businesses/switch', { bizId });
      } catch (e) {
        console.warn('Could not update default biz on server', e);
      }
    }
  },

  switchBizBySlug: (slug: string) => {
    const { businesses, activeBiz } = get();
    if (activeBiz?.slug === slug) return true;
    const match = businesses.find((b: any) => b.slug === slug);
    if (match) {
      localStorage.setItem('activeBizId', match.id);
      set({
        activeBiz: {
          id: match.id,
          name: match.name,
          slug: match.slug,
          logo: match.logo,
          role: (match as any).roleCode || 'SALES',
          roleName: (match as any).roleName,
        },
      });
      return true;
    }
    return false;
  },
}));
