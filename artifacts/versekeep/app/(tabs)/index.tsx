import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useOfflineVerses } from '../../lib/offline';
import { useStreak }        from '../../lib/streak';
import { T, FONTS }         from '../../constants/theme';

const DAYS = ['S','M','T','W','T','F','S'];
const QUICK = [
  { icon:'✍️', label:'Write a verse',   sub:'Add to your vault',    route:'/(tabs)/write'  },
  { icon:'🔖', label:'My bookmarks',    sub:'Pinned verses',         route:'/(tabs)/vault'  },
  { icon:'🔍', label:'Search scripture',sub:'Find by keyword',       route:'/(tabs)/search' },
  { icon:'🔔', label:'Set reminder',    sub:'Daily devotion alert',  route:'/reminders'     },
];

export default function DashboardScreen() {
  const [user,       setUser]       = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { verses, loading, isOffline } = useOfflineVerses();
  const { streak, refresh: refreshStreak } = useStreak();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/(auth)/auth'); return; }
      setUser(session.user);
    });
  }, []);

  const onRefresh = async () => { setRefreshing(true); await refreshStreak(false); setRefreshing(false); };

  const userName  = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend';
  const todayVerse= verses[0];
  const bookmarks = verses.filter(v => v.bookmarked).length;

  return (
    <View style={s.root}>
      {isOffline && <View style={s.offlineBanner}><Text style={s.offlineTxt}>📶 Offline — showing cached verses</Text></View>}
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.red}/>} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={s.greeting}>
          <View>
            <Text style={s.greetSub}>Good morning</Text>
            <View style={s.greetRow}><Text style={s.greetName}>{userName.toUpperCase()}</Text><Text style={s.greetStar}> ✦</Text></View>
          </View>
          <TouchableOpacity style={s.avatar} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={s.avatarLetter}>{userName[0]?.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Streak */}
        <View style={s.streak}>
          <View style={s.streakIcon}><Text style={s.streakEmoji}>🔥</Text></View>
          <View style={s.streakText}>
            <Text style={s.streakTitle}>{streak.count > 0 ? `${streak.count}-DAY STREAK` : 'START YOUR STREAK'}</Text>
            <Text style={s.streakSub}>{streak.todayDone ? 'You read today ✓' : 'Read a verse to keep it going'}</Text>
          </View>
          <View style={s.streakDays}>
            {DAYS.map((d,i) => (
              <View key={i} style={[s.dayBox, streak.weekDays[i] && s.dayBoxActive]}>
                <Text style={[s.dayLabel, streak.weekDays[i] && s.dayLabelActive]}>{d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Verse of the day */}
        {todayVerse && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>VERSE OF THE DAY</Text>
              <TouchableOpacity onPress={() => router.push({ pathname:'/verse/[id]', params:{ id:todayVerse.id } })}>
                <Text style={s.sectionLink}>Open →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.verseCard} onPress={() => router.push({ pathname:'/verse/[id]', params:{ id:todayVerse.id } })} activeOpacity={0.8}>
              <View style={s.cardAccent}/>
              <View style={s.cardBody}>
                <View style={s.cardHead}>
                  <Text style={s.cardRef}>{todayVerse.reference.toUpperCase()}</Text>
                  <View style={s.transBadge}><Text style={s.transBadgeText}>{todayVerse.translation}</Text></View>
                </View>
                <Text style={s.cardText}>"{todayVerse.verse_text.slice(0,120)}..."</Text>
                <View style={s.tagRow}>
                  {todayVerse.tags?.slice(0,3).map(t => <View key={t} style={s.tag}><Text style={s.tagText}>{t.toUpperCase()}</Text></View>)}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {!loading && verses.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📖</Text>
            <Text style={s.emptyTitle}>VAULT IS EMPTY</Text>
            <Text style={s.emptySub}>Save your first verse to see it here</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(tabs)/write')}><Text style={s.emptyBtnText}>WRITE A VERSE</Text></TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          {[{val:verses.length,label:'Saved'},{val:bookmarks,label:'Bookmarked'},{val:verses.filter(v=>v.note).length,label:'Reflections'}].map(st => (
            <View key={st.label} style={s.stat}><Text style={s.statNum}>{st.val}</Text><Text style={s.statLabel}>{st.label.toUpperCase()}</Text></View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>QUICK ACTIONS</Text>
          <View style={s.actionsGrid}>
            {QUICK.map(a => (
              <TouchableOpacity key={a.label} style={s.actionCard} onPress={() => router.push(a.route as any)} activeOpacity={0.8}>
                <Text style={s.actionIcon}>{a.icon}</Text>
                <Text style={s.actionLabel}>{a.label}</Text>
                <Text style={s.actionSub}>{a.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent saves */}
        {verses.length > 1 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>RECENT SAVES</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/vault')}><Text style={s.sectionLink}>See all →</Text></TouchableOpacity>
            </View>
            {verses.slice(1,5).map(v => (
              <TouchableOpacity key={v.id} style={s.recentRow} onPress={() => router.push({ pathname:'/verse/[id]', params:{ id:v.id } })} activeOpacity={0.8}>
                <View style={[s.recentAccent, v.bookmarked && s.recentAccentActive]}/>
                <View style={s.recentContent}>
                  <View style={s.recentHead}>
                    <Text style={s.recentRef}>{v.reference.toUpperCase()}</Text>
                    <Text style={s.recentDate}>{new Date(v.created_at).toLocaleDateString('en-KE',{month:'short',day:'numeric'})}</Text>
                  </View>
                  <Text style={s.recentText} numberOfLines={1}>{v.verse_text}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{height:24}}/>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:           {flex:1,backgroundColor:T.black},
  offlineBanner:  {backgroundColor:'rgba(201,146,26,0.12)',borderBottomWidth:0.5,borderBottomColor:'rgba(201,146,26,0.3)',paddingHorizontal:20,paddingVertical:8},
  offlineTxt:     {fontSize:12,color:'#C9921A',fontFamily:FONTS.body,fontWeight:'500'},
  scroll:         {paddingBottom:80},
  greeting:       {flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',paddingHorizontal:20,paddingTop:20,paddingBottom:16},
  greetSub:       {fontSize:10,color:T.creamMute,letterSpacing:1.2,textTransform:'uppercase',fontFamily:FONTS.body,marginBottom:3},
  greetRow:       {flexDirection:'row',alignItems:'baseline'},
  greetName:      {fontFamily:FONTS.display,fontSize:28,color:T.cream,letterSpacing:0.5},
  greetStar:      {fontSize:18,color:T.red},
  avatar:         {width:40,height:40,backgroundColor:T.red,borderRadius:3,alignItems:'center',justifyContent:'center'},
  avatarLetter:   {fontFamily:FONTS.display,fontSize:20,color:T.white},
  streak:         {marginHorizontal:20,marginBottom:18,backgroundColor:T.surface,borderWidth:0.5,borderColor:T.border,borderRadius:4,padding:14,flexDirection:'row',alignItems:'center',gap:12},
  streakIcon:     {width:44,height:44,backgroundColor:T.redFaint,borderWidth:0.5,borderColor:T.redBorder,borderRadius:3,alignItems:'center',justifyContent:'center',flexShrink:0},
  streakEmoji:    {fontSize:22},
  streakText:     {flex:1},
  streakTitle:    {fontFamily:FONTS.display,fontSize:18,color:T.red,letterSpacing:1},
  streakSub:      {fontSize:11,color:T.creamDim,fontFamily:FONTS.body,fontWeight:'300',marginTop:2},
  streakDays:     {flexDirection:'row',gap:3},
  dayBox:         {width:15,height:15,borderRadius:2,backgroundColor:T.surfaceEl,alignItems:'center',justifyContent:'center'},
  dayBoxActive:   {backgroundColor:T.red},
  dayLabel:       {fontSize:8,color:T.creamMute,fontWeight:'700',fontFamily:FONTS.body},
  dayLabelActive: {color:T.white},
  section:        {marginHorizontal:20,marginBottom:18},
  sectionHead:    {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  sectionTitle:   {fontSize:10,color:T.creamMute,letterSpacing:1.2,textTransform:'uppercase',fontWeight:'700',fontFamily:FONTS.body},
  sectionLink:    {fontSize:10,color:T.red,letterSpacing:0.8,textTransform:'uppercase',fontWeight:'700',fontFamily:FONTS.body},
  verseCard:      {backgroundColor:T.surface,borderWidth:0.5,borderColor:T.border,borderRadius:4,flexDirection:'row',overflow:'hidden'},
  cardAccent:     {width:3,backgroundColor:T.red},
  cardBody:       {flex:1,padding:18},
  cardHead:       {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  cardRef:        {fontFamily:FONTS.display,fontSize:18,color:T.red,letterSpacing:1},
  transBadge:     {backgroundColor:T.surfaceEl,paddingHorizontal:8,paddingVertical:2,borderRadius:2},
  transBadgeText: {fontSize:10,color:T.creamMute,letterSpacing:0.8,fontFamily:FONTS.body},
  cardText:       {fontFamily:FONTS.serif,fontStyle:'italic',fontSize:16,color:T.cream,lineHeight:28,marginBottom:12},
  tagRow:         {flexDirection:'row',gap:5,flexWrap:'wrap'},
  tag:            {borderWidth:0.5,borderColor:T.borderMd,borderRadius:2,paddingHorizontal:8,paddingVertical:3},
  tagText:        {fontSize:9,color:T.creamDim,letterSpacing:0.6,fontFamily:FONTS.body},
  statsRow:       {flexDirection:'row',gap:8,marginHorizontal:20,marginBottom:18},
  stat:           {flex:1,backgroundColor:T.surface,borderWidth:0.5,borderColor:T.border,borderRadius:3,padding:12,alignItems:'center'},
  statNum:        {fontFamily:FONTS.display,fontSize:26,color:T.red,letterSpacing:1,lineHeight:28},
  statLabel:      {fontSize:9,color:T.creamDim,marginTop:3,letterSpacing:0.8,textTransform:'uppercase',fontFamily:FONTS.body},
  actionsGrid:    {flexDirection:'row',flexWrap:'wrap',gap:8},
  actionCard:     {width:'48%',backgroundColor:T.surface,borderWidth:0.5,borderColor:T.border,borderRadius:3,padding:14},
  actionIcon:     {fontSize:20,marginBottom:7},
  actionLabel:    {fontSize:12,fontWeight:'600',color:T.cream,fontFamily:FONTS.body},
  actionSub:      {fontSize:10,color:T.creamDim,marginTop:2,fontFamily:FONTS.body,fontWeight:'300'},
  recentRow:      {backgroundColor:T.surface,borderWidth:0.5,borderColor:T.border,borderRadius:3,flexDirection:'row',marginBottom:7,overflow:'hidden'},
  recentAccent:   {width:3,backgroundColor:T.borderMd},
  recentAccentActive:{backgroundColor:T.red},
  recentContent:  {flex:1,padding:12},
  recentHead:     {flexDirection:'row',justifyContent:'space-between',marginBottom:4},
  recentRef:      {fontFamily:FONTS.display,fontSize:14,color:T.cream,letterSpacing:0.5},
  recentDate:     {fontSize:10,color:T.creamMute,fontFamily:FONTS.body},
  recentText:     {fontSize:12,color:T.creamDim,fontFamily:FONTS.body,lineHeight:18},
  emptyState:     {alignItems:'center',padding:40,gap:10},
  emptyIcon:      {fontSize:36,marginBottom:4},
  emptyTitle:     {fontFamily:FONTS.display,fontSize:20,color:T.cream,letterSpacing:1.5},
  emptySub:       {fontSize:12,color:T.creamDim,fontFamily:FONTS.body,fontWeight:'300'},
  emptyBtn:       {backgroundColor:T.red,borderRadius:3,paddingVertical:12,paddingHorizontal:24,marginTop:8},
  emptyBtnText:   {color:T.white,fontSize:12,fontFamily:FONTS.body,fontWeight:'700',letterSpacing:1},
});
