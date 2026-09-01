import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { Slot, router, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { initOfflineDb, syncVersesToCache } from '../lib/offline';
import { T } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge:  false,
    }),
  });
}

export default function RootLayout() {
  const [authReady, setAuthReady] = useState(false);
  const [session,   setSession]   = useState<any>(null);
  const notifListener     = useRef<any>(null);
  const notifRespListener = useRef<any>(null);

  const [fontsLoaded, fontError] = useFonts({
    'BebasNeue':              require('../assets/fonts/BebasNeue-Regular.ttf'),
    'PlayfairDisplay':        require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
    'PlayfairDisplay-Italic': require('../assets/fonts/PlayfairDisplay-Italic.ttf'),
    'DMSans':                 require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium':          require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-Bold':            require('../assets/fonts/DMSans-Bold.ttf'),
  });

  useEffect(() => {
    const init = async () => {
      if (!isSupabaseConfigured) {
        setAuthReady(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      await initOfflineDb();
      if (session) syncVersesToCache().catch(() => {});
      setAuthReady(true);
    };
    init();

    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) syncVersesToCache().catch(() => {});
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Notification deep-link handler
  useEffect(() => {
    if (Platform.OS === 'web') return;

    notifListener.current = Notifications.addNotificationReceivedListener(
      (notification) => console.log('[VerseKeep] Notif received:', notification.request.identifier)
    );

    notifRespListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        if (data?.verseId)         router.push({ pathname: '/verse/[id]', params: { id: data.verseId } });
        else if (data?.screen === 'reminders') router.push('/reminders');
        else                       router.replace('/');
      }
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as any;
      if (data?.verseId) setTimeout(() => router.push({ pathname: '/verse/[id]', params: { id: data.verseId } }), 500);
    });

    return () => {
      notifListener.current?.remove();
      notifRespListener.current?.remove();
    };
  }, []);

  // Save Expo push token to Supabase reminders table
  useEffect(() => {
    if (!session || Platform.OS === 'web') return;
    Notifications.getPermissionsAsync().then(async ({ status }) => {
      if (status !== 'granted') return;
      try {
        const token = await Notifications.getExpoPushTokenAsync({ projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID });
        await supabase.from('reminders').update({ expo_token: token.data }).eq('user_id', session.user.id);
      } catch (e) { console.warn('[VerseKeep] Token save failed:', e); }
    });
  }, [session]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && authReady) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, authReady]);

  const segments = useSegments();
  useEffect(() => {
    if (!authReady || (!fontsLoaded && !fontError)) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth)  router.replace('/(auth)/auth');
    else if (session && inAuth) router.replace('/');
  }, [session, authReady, fontsLoaded, fontError, segments]);

  if ((!fontsLoaded && !fontError) || !authReady) return <View style={s.splash} />;
  if (!isSupabaseConfigured) {
    return (
      <View style={s.setup}>
        <Text style={s.setupTitle}>VerseKeep needs configuration</Text>
        <Text style={s.setupBody}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to
          Vercel&apos;s Production environment, then redeploy.
        </Text>
      </View>
    );
  }
  return <Slot />;
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: T.black },
  setup: {
    flex: 1,
    backgroundColor: T.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  setupTitle: {
    color: T.white,
    fontFamily: 'DMSans-Bold',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  setupBody: {
    color: T.creamDim,
    fontFamily: 'DMSans',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 520,
  },
});
