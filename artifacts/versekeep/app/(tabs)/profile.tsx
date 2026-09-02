import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch, Share,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { T, FONTS } from '../../constants/theme';
import { AppIcon } from '../../components/AppIcon';
import { ResponsiveContent } from '../../components/ResponsiveContent';

type UserInfo = {
  name:  string;
  email: string;
  initials: string;
};

export default function ProfileScreen() {
  const [user,       setUser]       = useState<UserInfo | null>(null);
  const [darkMode,   setDarkMode]   = useState(true);
  const [notifDaily, setNotifDaily] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const u = session.user;
      const fullName = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Friend';
      const initials = fullName
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      setUser({ name: fullName, email: u.email ?? '', initials });
    });
  }, []);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    Alert.alert(
      error ? 'Could not send email' : 'Check your inbox',
      error ? error.message : `We sent a password reset link to ${user.email}.`,
    );
  };

  const handleExport = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;
    const { data, error } = await supabase
      .from('verses')
      .select('reference, translation, verse_text, note, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Export failed', error.message);
      return;
    }
    if (!data?.length) {
      Alert.alert('Nothing to export', 'Save a verse first, then come back here.');
      return;
    }

    const message = data.map((verse, index) => [
      `${index + 1}. ${verse.reference} (${verse.translation})`,
      `"${verse.verse_text}"`,
      verse.note?.trim() ? `Reflection: ${verse.note.trim()}` : '',
    ].filter(Boolean).join('\n')).join('\n\n');
    await Share.share({ title: 'VerseKeep journal', message });
  };

  const handleDeleteJournal = () => {
    Alert.alert(
      'Delete journal data',
      'This permanently removes your saved verses, reflections, tasks, and reminders. Your account will remain active.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete data',
          style: 'destructive',
          onPress: async () => {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) return;
            const { error } = await supabase.from('verses').delete().eq('user_id', session.user.id);
            await supabase.from('reminders').delete().eq('user_id', session.user.id);
            if (error) {
              Alert.alert('Could not delete data', error.message);
              return;
            }
            Alert.alert('Journal cleared', 'Your VerseKeep journal data has been removed.');
          },
        },
      ],
    );
  };

  const handleShareApp = async () => {
    await Share.share({
      title: 'VerseKeep',
      message: 'I use VerseKeep to keep my favorite Bible verses and reflections close: https://versekeep.vercel.app',
    });
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/auth');
        },
      },
    ]);
  };

  const MENU_SECTIONS = [
    {
      title: 'App',
      items: [
        { icon:'notifications-outline', label:'Reminder settings', sub:'Set your daily devotion time', onPress:() => router.push('/reminders') },
        { icon:'book-outline', label:'Bible translations', sub:'NIV · KJV · ESV · NLT · NKJV', onPress:() => Alert.alert('Bible translations', 'Choose a translation while searching or saving a verse.') },
        { icon:'globe-outline', label:'Language', sub:'English', onPress:() => Alert.alert('Language', 'English is currently the only available language.') },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon:'lock-closed-outline', label:'Change password', sub:'Email me a secure reset link', onPress:handlePasswordReset },
        { icon:'share-outline', label:'Export my verses', sub:'Share a text copy of your journal', onPress:handleExport },
        { icon:'trash-outline', label:'Delete journal data', sub:'Remove verses and reflections', onPress:handleDeleteJournal },
      ],
    },
    {
      title: 'Share & support',
      items: [
        { icon:'paper-plane-outline', label:'Share VerseKeep', sub:'Invite friends to the app', onPress:handleShareApp },
        { icon:'star-outline', label:'Rate on Play Store', sub:'Love the app? Leave a review', onPress:() => Alert.alert('Thank you', 'Ratings will be available when VerseKeep is published to the Play Store.') },
        { icon:'help-circle-outline', label:'Help & support', sub:'Tips for using your journal', onPress:() => Alert.alert('Help & support', 'Save verses from Search, add reflections in the verse detail view, and use the bookmark icon to keep favorites close.') },
        { icon:'information-circle-outline', label:'About', sub:'Version 1.0.0 · VerseKeep', onPress:() => Alert.alert('VerseKeep', 'A personal space for Scripture, reflection, and daily practice.') },
      ],
    },
  ];

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <ResponsiveContent style={s.content}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>PROFILE</Text>
        </View>

        {/* User card */}
        <View style={s.userCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.initials ?? '?'}</Text>
          </View>
          <View style={s.userInfo}>
            <Text style={s.userName}>{user?.name ?? 'Loading...'}</Text>
            <Text style={s.userEmail}>{user?.email}</Text>
          </View>
          <View style={s.badgeContainer}>
            <View style={s.freeBadge}>
              <Text style={s.freeBadgeText}>FREE</Text>
            </View>
          </View>
        </View>

        {/* Toggles */}
        <View style={s.toggleSection}>
          <View style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <AppIcon name="moon-outline" size={21} color={T.creamDim} />
              <View>
                <Text style={s.toggleLabel}>Dark mode</Text>
                <Text style={s.toggleSub}>App appearance</Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: T.surfaceEl, true: T.redBorder }}
              thumbColor={darkMode ? T.red : T.creamMute}
              ios_backgroundColor={T.surfaceEl}
            />
          </View>

          <View style={[s.toggleRow, { borderTopWidth:0.5, borderTopColor:T.border }]}>
            <View style={s.toggleLeft}>
              <AppIcon name="notifications-outline" size={21} color={T.creamDim} />
              <View>
                <Text style={s.toggleLabel}>Daily reminders</Text>
                <Text style={s.toggleSub}>Push notifications</Text>
              </View>
            </View>
            <Switch
              value={notifDaily}
              onValueChange={setNotifDaily}
              trackColor={{ false: T.surfaceEl, true: T.redBorder }}
              thumbColor={notifDaily ? T.red : T.creamMute}
              ios_backgroundColor={T.surfaceEl}
            />
          </View>
        </View>

        {/* Menu sections */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={s.menuSection}>
            <Text style={s.menuSectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={s.menuCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.menuRow, i < section.items.length - 1 && s.menuRowBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={s.menuIcon}><AppIcon name={item.icon} size={21} color={T.creamDim} /></View>
                  <View style={s.menuContent}>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    <Text style={s.menuSub}>{item.sub}</Text>
                  </View>
                  <Text style={s.menuChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={s.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>

        <Text style={s.version}>VerseKeep v1.0.0 · Made for daily practice</Text>

        <View style={{ height: 80 }} />
        </ResponsiveContent>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:              { flex:1, backgroundColor:T.black },
  scroll:            { paddingBottom:30 },
  content:           { paddingHorizontal:0 },
  header:            { paddingTop:18, paddingBottom:14, borderBottomWidth:0.5, borderBottomColor:T.border },
  headerTitle:       { fontFamily:FONTS.display, fontSize:28, color:T.cream, letterSpacing:1.5 },
  userCard:          { margin:20, backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:4, padding:16, flexDirection:'row', alignItems:'center', gap:14 },
  avatar:            { width:52, height:52, backgroundColor:T.red, borderRadius:4, alignItems:'center', justifyContent:'center', flexShrink:0 },
  avatarText:        { fontFamily:FONTS.display, fontSize:24, color:T.white, letterSpacing:1 },
  userInfo:          { flex:1 },
  userName:          { fontSize:16, fontWeight:'600', color:T.cream, fontFamily:FONTS.body },
  userEmail:         { fontSize:12, color:T.creamDim, fontFamily:FONTS.body, marginTop:2 },
  badgeContainer:    { flexShrink:0 },
  freeBadge:         { backgroundColor:T.surfaceEl, borderWidth:0.5, borderColor:T.border, borderRadius:10, paddingHorizontal:9, paddingVertical:4 },
  freeBadgeText:     { fontSize:10, color:T.creamMute, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:1 },
  toggleSection:     { marginHorizontal:20, marginBottom:20, backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:4 },
  toggleRow:         { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:14 },
  toggleLeft:        { flexDirection:'row', alignItems:'center', gap:12, flex:1 },
  toggleLabel:       { fontSize:14, color:T.cream, fontFamily:FONTS.body, fontWeight:'500' },
  toggleSub:         { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, marginTop:1 },
  menuSection:       { marginHorizontal:20, marginBottom:16 },
  menuSectionTitle:  { fontSize:10, color:T.creamMute, letterSpacing:1.2, fontWeight:'700', fontFamily:FONTS.body, marginBottom:8 },
  menuCard:          { backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:4, overflow:'hidden' },
  menuRow:           { flexDirection:'row', alignItems:'center', padding:14, gap:12 },
  menuRowBorder:     { borderBottomWidth:0.5, borderBottomColor:T.border },
  menuIcon:          { width:28, alignItems:'center' },
  menuContent:       { flex:1 },
  menuLabel:         { fontSize:14, color:T.cream, fontFamily:FONTS.body, fontWeight:'500' },
  menuSub:           { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, marginTop:2 },
  menuChevron:       { fontSize:20, color:T.creamMute },
  signOutBtn:        { marginHorizontal:20, marginBottom:14, borderWidth:1.5, borderColor:T.red, borderRadius:4, paddingVertical:14, alignItems:'center' },
  signOutText:       { color:T.red, fontSize:13, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:1 },
  version:           { textAlign:'center', fontSize:11, color:T.creamMute, fontFamily:FONTS.body, fontStyle:'italic' },
});
