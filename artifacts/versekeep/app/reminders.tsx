// ═══════════════════════════════════════════════════
// FILE: app/reminders.tsx  — Daily reminder setup
// ═══════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Platform, Alert, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { T, FONTS } from '../constants/theme';

// How notifications are handled while app is in foreground
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

type ReminderRow = {
  id:        string;
  verse_id:  string | null;
  remind_at: string;   // "HH:MM"
  timezone:  string;
  enabled:   boolean;
};

const VERSE_TYPES = [
  { id: 'random',  label: '🎲 Random saved verse',     sub: 'Surprise yourself daily'              },
  { id: 'today',   label: '📖 Verse of the day',        sub: 'Latest saved verse'                   },
  { id: 'specific',label: '📌 A specific verse',        sub: 'Pick one from your vault'             },
];

const DAYS_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function RemindersScreen() {
  const { verseId } = useLocalSearchParams<{ verseId?: string }>();

  const [reminder,     setReminder]     = useState<ReminderRow | null>(null);
  const [enabled,      setEnabled]      = useState(false);
  const [time,         setTime]         = useState(new Date());
  const [showPicker,   setShowPicker]   = useState(false);
  const [verseType,    setVerseType]    = useState<'random'|'today'|'specific'>('random');
  const [activeDays,   setActiveDays]   = useState<number[]>([0,1,2,3,4,5,6]); // all days
  const [permission,   setPermission]   = useState<'granted'|'denied'|'undetermined'>('undetermined');
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  // ─── Request notification permission ───
  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermission(status as any);
    return status === 'granted';
  };

  // ─── Load existing reminder ───
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check/request notification permission
      const { status } = await Notifications.getPermissionsAsync();
      setPermission(status as any);

      // Load reminder from DB
      const { data } = await supabase
        .from('reminders').select('*')
        .eq('user_id', session.user.id)
        .single();

      if (data) {
        setReminder(data);
        setEnabled(data.enabled);
        // Parse HH:MM → Date
        const [h, m] = data.remind_at.split(':').map(Number);
        const d = new Date(); d.setHours(h); d.setMinutes(m);
        setTime(d);
      } else {
        // Default to 7:00 AM
        const d = new Date(); d.setHours(7); d.setMinutes(0);
        setTime(d);
      }
      setLoading(false);
    };
    init();
  }, []);

  // ─── Toggle active day ───
  const toggleDay = (day: number) => {
    setActiveDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // ─── Schedule notification ───
  const scheduleNotification = async (timeDate: Date) => {
    // Cancel all existing
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!enabled || activeDays.length === 0) return;

    const quotes = [
      'Your daily verse is waiting 📖',
      'A word of hope for your day 🙏',
      'Take a moment with scripture ✦',
      'Your morning devotion awaits',
    ];
    const body = quotes[Math.floor(Math.random() * quotes.length)];

    // Schedule for each active day
    for (const day of activeDays) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'VerseKeep — Daily Reminder',
          body,
          sound: true,
          data:  { screen: 'home' },
        },
        trigger: {
          hour:    timeDate.getHours(),
          minute:  timeDate.getMinutes(),
          weekday: day + 1,  // Expo uses 1-7 (Sun=1)
          repeats: true,
        } as any,
      });
    }
  };

  // ─── Save reminder ───
  const saveReminder = async () => {
    setSaving(true);

    // Request permission if not granted
    if (permission !== 'granted' && enabled) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Please allow notifications in your device settings for reminders to work.',
          [{ text: 'OK' }]
        );
        setSaving(false);
        return;
      }
    }

    const timeStr = `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      user_id:   session.user.id,
      remind_at: timeStr,
      timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Nairobi',
      enabled,
      verse_id:  verseType === 'specific' && verseId ? verseId : null,
    };

    if (reminder) {
      await supabase.from('reminders').update(payload).eq('id', reminder.id);
    } else {
      const { data } = await supabase.from('reminders').insert(payload).select().single();
      if (data) setReminder(data);
    }

    // Schedule or cancel local notifications
    await scheduleNotification(time);

    setSaving(false);
    Alert.alert(
      enabled ? '🔔 Reminder set!' : 'Reminder off',
      enabled
        ? `You'll receive a daily verse at ${timeStr} on ${activeDays.length} day${activeDays.length !== 1 ? 's' : ''} a week.`
        : 'Your daily reminder has been turned off.',
      [{ text: 'Got it', onPress: () => router.back() }]
    );
  };

  // ─── Format time display ───
  const formatTime = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2,'0')} ${ampm}`;
  };

  if (loading) return (
    <View style={s.center}><ActivityIndicator color={T.red} size="large" /></View>
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{top:10,bottom:10,left:10,right:10}}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>DAILY REMINDER</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Permission warning */}
        {permission === 'denied' && (
          <View style={s.permWarning}>
            <Text style={s.permWarningIcon}>⚠️</Text>
            <View style={{ flex:1 }}>
              <Text style={s.permWarningTitle}>Notifications blocked</Text>
              <Text style={s.permWarningSub}>Go to Settings → VerseKeep → Notifications to allow reminders.</Text>
            </View>
          </View>
        )}

        {/* Master toggle */}
        <View style={s.toggleCard}>
          <View style={s.toggleLeft}>
            <Text style={s.toggleIcon}>🔔</Text>
            <View>
              <Text style={s.toggleTitle}>Daily devotion reminder</Text>
              <Text style={s.toggleSub}>{enabled ? 'On — you will receive daily alerts' : 'Off — tap to enable'}</Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: T.surfaceEl, true: T.redBorder }}
            thumbColor={enabled ? T.red : T.creamMute}
            ios_backgroundColor={T.surfaceEl}
          />
        </View>

        {enabled && (
          <>
            {/* Time picker */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>REMINDER TIME</Text>
              <TouchableOpacity
                style={s.timeBtn}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.8}
              >
                <Text style={s.timeBtnLabel}>{formatTime(time)}</Text>
                <Text style={s.timeBtnSub}>Tap to change</Text>
              </TouchableOpacity>

              {showPicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selected) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (selected) setTime(selected);
                  }}
                  themeVariant="dark"
                />
              )}
            </View>

            {/* Active days */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>ACTIVE DAYS</Text>
              <View style={s.daysRow}>
                {DAYS_LABELS.map((label, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.dayBtn, activeDays.includes(i) && s.dayBtnActive]}
                    onPress={() => toggleDay(i)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.dayBtnText, activeDays.includes(i) && s.dayBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {activeDays.length === 0 && (
                <Text style={s.noDaysWarning}>Select at least one day</Text>
              )}
            </View>

            {/* Verse type */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>VERSE TO SHOW</Text>
              {VERSE_TYPES.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={[s.typeRow, verseType === v.id && s.typeRowActive]}
                  onPress={() => setVerseType(v.id as any)}
                  activeOpacity={0.8}
                >
                  <View style={[s.radio, verseType === v.id && s.radioActive]}>
                    {verseType === v.id && <View style={s.radioDot} />}
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={[s.typeLabel, verseType === v.id && s.typeLabelActive]}>{v.label}</Text>
                    <Text style={s.typeSub}>{v.sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <View style={s.preview}>
              <Text style={s.previewIcon}>👁️</Text>
              <View style={{ flex:1 }}>
                <Text style={s.previewTitle}>Preview notification</Text>
                <View style={s.previewBubble}>
                  <Text style={s.previewAppName}>VerseKeep</Text>
                  <Text style={s.previewNotifTitle}>VerseKeep — Daily Reminder</Text>
                  <Text style={s.previewNotifBody}>Your daily verse is waiting 📖</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={saveReminder}
          disabled={saving || (enabled && activeDays.length === 0)}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={T.white} />
            : <Text style={s.saveBtnText}>
                {enabled ? `SAVE REMINDER — ${formatTime(time)}` : 'SAVE (REMINDERS OFF)'}
              </Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex:1, backgroundColor:T.black },
  center:           { flex:1, backgroundColor:T.black, alignItems:'center', justifyContent:'center' },
  header:           { flexDirection:'row', alignItems:'center', gap:16, paddingHorizontal:20, paddingVertical:16, borderBottomWidth:0.5, borderBottomColor:T.border },
  back:             { fontSize:13, color:T.creamDim, fontFamily:FONTS.body },
  headerTitle:      { fontFamily:FONTS.display, fontSize:22, color:T.cream, letterSpacing:1 },
  scroll:           { flex:1 },
  scrollContent:    { padding:20, paddingBottom:40 },

  // Permission
  permWarning:      { flexDirection:'row', gap:10, backgroundColor:T.amberFaint, borderWidth:0.5, borderColor:T.amberBorder, borderRadius:4, padding:13, marginBottom:16, alignItems:'flex-start' },
  permWarningIcon:  { fontSize:18 },
  permWarningTitle: { fontSize:13, color:T.cream, fontFamily:FONTS.body, fontWeight:'600', marginBottom:3 },
  permWarningSub:   { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, lineHeight:16 },

  // Toggle
  toggleCard:       { backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:4, padding:16, flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  toggleLeft:       { flexDirection:'row', alignItems:'center', gap:14, flex:1 },
  toggleIcon:       { fontSize:26 },
  toggleTitle:      { fontSize:14, color:T.cream, fontFamily:FONTS.body, fontWeight:'600' },
  toggleSub:        { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, marginTop:2, fontWeight:'300' },

  // Section
  section:          { marginBottom:20 },
  sectionTitle:     { fontSize:10, color:T.creamMute, letterSpacing:1.2, textTransform:'uppercase', fontWeight:'700', fontFamily:FONTS.body, marginBottom:10 },

  // Time
  timeBtn:          { backgroundColor:T.surface, borderWidth:1.5, borderColor:T.red, borderRadius:4, padding:20, alignItems:'center' },
  timeBtnLabel:     { fontFamily:FONTS.display, fontSize:48, color:T.red, letterSpacing:2, lineHeight:52 },
  timeBtnSub:       { fontSize:11, color:T.creamMute, fontFamily:FONTS.body, marginTop:4, letterSpacing:0.6 },

  // Days
  daysRow:          { flexDirection:'row', gap:7, flexWrap:'wrap' },
  dayBtn:           { width:42, height:42, borderRadius:3, borderWidth:0.5, borderColor:T.border, alignItems:'center', justifyContent:'center' },
  dayBtnActive:     { backgroundColor:T.red, borderColor:T.red },
  dayBtnText:       { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'600', letterSpacing:0.4 },
  dayBtnTextActive: { color:T.white },
  noDaysWarning:    { fontSize:11, color:T.red, fontFamily:FONTS.body, marginTop:8 },

  // Verse type
  typeRow:          { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:3, padding:14, marginBottom:7 },
  typeRowActive:    { borderColor:T.red, backgroundColor:T.redFaint },
  radio:            { width:18, height:18, borderRadius:9, borderWidth:1.5, borderColor:T.creamMute, alignItems:'center', justifyContent:'center' },
  radioActive:      { borderColor:T.red },
  radioDot:         { width:8, height:8, borderRadius:4, backgroundColor:T.red },
  typeLabel:        { fontSize:13, color:T.cream, fontFamily:FONTS.body, fontWeight:'500' },
  typeLabelActive:  { color:T.red },
  typeSub:          { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, marginTop:2 },

  // Preview
  preview:          { backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:4, padding:14, flexDirection:'row', gap:12, marginBottom:24, alignItems:'flex-start' },
  previewIcon:      { fontSize:20, marginTop:2 },
  previewTitle:     { fontSize:10, color:T.creamMute, letterSpacing:1, textTransform:'uppercase', fontFamily:FONTS.body, fontWeight:'600', marginBottom:8 },
  previewBubble:    { backgroundColor:T.surfaceEl, borderRadius:10, padding:12 },
  previewAppName:   { fontSize:10, color:T.creamMute, fontFamily:FONTS.body, marginBottom:3, letterSpacing:0.5 },
  previewNotifTitle:{ fontSize:13, color:T.cream, fontFamily:FONTS.body, fontWeight:'600', marginBottom:3 },
  previewNotifBody: { fontSize:12, color:T.creamDim, fontFamily:FONTS.body, lineHeight:18 },

  // Save
  saveBtn:          { backgroundColor:T.red, borderRadius:3, paddingVertical:16, alignItems:'center' },
  saveBtnDisabled:  { opacity:0.5 },
  saveBtnText:      { color:T.white, fontSize:13, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:1, textTransform:'uppercase' },
});
