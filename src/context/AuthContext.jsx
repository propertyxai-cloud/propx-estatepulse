import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';

const NATIVE_AUTH_CALLBACK = 'com.propertyxai.marketplace://auth/callback';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setProfile(null);
      return null;
    }
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,display_name,full_name,avatar_url,role,bio,phone,company_name,suspended_at,preferred_country_code,preferred_city,preferred_currency_code,preferred_timezone,preferred_language')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      setProfile(data ?? null);
      return data ?? null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !Capacitor.isNativePlatform()) return undefined;
    let alive = true;
    let listener;

    CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!alive || typeof url !== 'string' || !url.startsWith(NATIVE_AUTH_CALLBACK)) return;
      try {
        const callbackUrl = new URL(url);
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) throw error;

        if (callbackUrl.searchParams.get('type') === 'recovery') {
          window.location.replace('/login?recovery=1');
        } else {
          window.location.replace('/agent-portal');
        }
      } catch (error) {
        console.error('PropertyX native authentication callback failed:', error);
      }
    }).then((value) => {
      if (alive) listener = value;
      else value.remove();
    }).catch((error) => {
      console.error('Could not register PropertyX native auth callback:', error);
    });

    return () => {
      alive = false;
      listener?.remove();
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    const initialise = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const nextUser = data.session?.user ?? null;
        if (!alive) return;
        setUser(nextUser);
        if (nextUser) await loadProfile(nextUser.id);
      } catch (error) {
        console.error('Could not restore PropertyX session:', error);
      } finally {
        if (alive) setLoading(false);
      }
    };
    initialise();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
      } else {
        // Defer network work out of the auth event callback.
        queueMicrotask(() => loadProfile(nextUser.id).catch((error) => {
          console.error('Could not refresh profile:', error);
        }));
      }
    });
    return () => {
      alive = false;
      subscription?.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Authentication is not configured on this deployment.');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    setUser(data.user ?? null);
    if (data.user) await loadProfile(data.user.id);
    return data;
  };

  const signUp = async (email, password, displayName, role = 'buyer') => {
    if (!supabase) throw new Error('Authentication is not configured on this deployment.');
    if (!['buyer', 'seller', 'investor', 'agent'].includes(role)) {
      throw new Error('Choose a valid account type.');
    }
    const redirectTo = Capacitor.isNativePlatform()
      ? NATIVE_AUTH_CALLBACK
      : (typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { display_name: displayName?.trim() || email.trim(), full_name: displayName?.trim() || email.trim(), role },
      },
    });
    if (error) throw error;
    if (data.user && data.session) {
      setUser(data.user);
      await loadProfile(data.user.id);
    }
    return data;
  };

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Authentication is not configured on this deployment.');
    const isNative = Capacitor.isNativePlatform();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: isNative ? NATIVE_AUTH_CALLBACK : `${window.location.origin}/agent-portal`,
        skipBrowserRedirect: isNative,
      },
    });
    if (error) throw error;
    if (isNative) {
      if (!data?.url) throw new Error('The identity provider did not return an authorization URL.');
      await Browser.open({ url: data.url });
    }
  };

  const resetPassword = async (email) => {
    if (!supabase) throw new Error('Authentication is not configured on this deployment.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Capacitor.isNativePlatform() ? NATIVE_AUTH_CALLBACK : `${window.location.origin}/login?recovery=1`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password) => {
    if (!supabase) throw new Error('Authentication is not configured on this deployment.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = useCallback(() => loadProfile(user?.id), [loadProfile, user?.id]);
  const value = useMemo(() => ({
    user, profile, loading, profileLoading, signIn, signUp, signInWithGoogle,
    resetPassword, updatePassword, signOut, refreshProfile,
  }), [user, profile, loading, profileLoading, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
