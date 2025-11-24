import { create } from 'zustand';
import { supabase } from '@lib/supabase/client';
import { User, UserRole } from '@lib/types';

interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<User>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  error: null,

  signUp: async (email: string, password: string, displayName: string, role: UserRole) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, role },
        },
      });

      if (error) throw error;

      const supabaseUser = data.user;
      if (!supabaseUser?.id) {
        throw new Error('Unable to complete sign up. Missing Supabase user data.');
      }

      const profilePayload = {
        id: supabaseUser.id,
        email,
        role,
        display_name: displayName,
      };

      const { error: insertError } = await supabase.from('users').insert(profilePayload);
      if (insertError) throw insertError;

      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (fetchError) throw fetchError;

      let session = data.session;
      if (!session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError.message?.includes('Email not confirmed')
            ? new Error('Please confirm your email address to finish signing up.')
            : signInError;
        }

        session = signInData.session;
      }

      set({ session, user: userData });
      return userData;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        set({ session: data.session, user: userData });
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, session: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  checkSession: async () => {
    set({ loading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({ session, user: userData, loading: false });
      } else {
        set({ session: null, user: null, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
}));
