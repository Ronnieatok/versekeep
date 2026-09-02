// ─────────────────────────────────────────────
// FILE: app/(tabs)/vault.tsx  — Saved verses & bookmarks
// ─────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { T, FONTS } from '../../constants/theme';
import { AppIcon } from '../../components/AppIcon';
import { ResponsiveContent } from '../../components/ResponsiveContent';

type Verse = {
  id: string; reference: string; translation: string;
  verse_text: string; note: string | null;
  tags: string[]; bookmarked: boolean; created_at: string;
};

export default function VaultScreen() {
  const [verses,     setVerses]     = useState<Verse[]>([]);
  const [filter,     setFilter]     = useState<'all' | 'bookmarked'>('all');
  const [sort,       setSort]       = useState<'recent' | 'oldest'>('recent');
  const [query,      setQuery]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/(auth)/auth'); return; }
    const { data } = await supabase
      .from('verses').select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setVerses(data || []);
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const toggleBookmark = async (id: string, current: boolean) => {
    await supabase.from('verses').update({ bookmarked: !current }).eq('id', id);
    setVerses(p => p.map(v => v.id === id ? { ...v, bookmarked: !current } : v));
  };

  const display = verses
    .filter(v => filter === 'all' || v.bookmarked)
    .filter(v => {
      const haystack = `${v.reference} ${v.verse_text} ${v.note ?? ''} ${(v.tags ?? []).join(' ')}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => {
      const direction = sort === 'recent' ? -1 : 1;
      return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

  const renderItem = ({ item: v }: { item: Verse }) => (
    <View style={styles.card}>
      {v.bookmarked && <View style={styles.cardTopBar} />}
      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          <View>
            <Text style={styles.cardRef}>{v.reference.toUpperCase()}</Text>
          </View>
          <View style={styles.cardHeadRight}>
            <View style={styles.transBadge}><Text style={styles.transBadgeText}>{v.translation}</Text></View>
            <TouchableOpacity onPress={() => toggleBookmark(v.id, v.bookmarked)} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                <AppIcon name={v.bookmarked ? 'bookmark' : 'bookmark-outline'} size={19} color={v.bookmarked ? T.red : T.creamMute} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.cardText} numberOfLines={3}>"{v.verse_text}"</Text>
        {v.note ? <Text style={styles.cardNote} numberOfLines={2}>{v.note}</Text> : null}
        <View style={styles.cardFoot}>
          <View style={styles.tagRow}>
            {v.tags?.slice(0,3).map(t => <View key={t} style={styles.tag}><Text style={styles.tagText}>{t.toUpperCase()}</Text></View>)}
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname:'/verse/[id]', params:{ id: v.id } })}>
            <Text style={styles.openLink}>Open →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={T.red} /></View>;

  return (
    <View style={styles.root}>
      <ResponsiveContent style={styles.topContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>MY VAULT</Text>
            <Text style={styles.headerSub}>{verses.length} verses · {verses.filter(v=>v.bookmarked).length} bookmarked</Text>
          </View>
          <AppIcon name="library-outline" size={25} color={T.red} />
        </View>

        <View style={styles.searchBox}>
          <AppIcon name="search-outline" size={18} color={T.creamMute} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search your verses..."
            placeholderTextColor={T.creamMute}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppIcon name="close-circle" size={18} color={T.creamMute} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {(['all','bookmarked'] as const).map(f => (
            <TouchableOpacity key={f} style={[styles.filterBtn, filter===f && styles.filterBtnActive]} onPress={() => setFilter(f)} activeOpacity={0.8}>
              <Text style={[styles.filterText, filter===f && styles.filterTextActive]}>
                {f === 'all' ? 'All verses' : 'Bookmarked'}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.sortGroup}>
            {(['recent', 'oldest'] as const).map(value => (
              <TouchableOpacity key={value} onPress={() => setSort(value)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={[styles.sortText, sort === value && styles.sortTextActive]}>
                  {value === 'recent' ? 'Recent' : 'Oldest'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ResponsiveContent>

      <FlatList
        data={display}
        keyExtractor={v => v.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={T.red} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppIcon name={query ? 'search-outline' : 'bookmark-outline'} size={38} color={T.red} />
            <Text style={styles.emptyTitle}>NO {filter === 'bookmarked' ? 'BOOKMARKS' : 'SAVED VERSES'}</Text>
            <Text style={styles.emptySub}>
              {query ? 'Try a different search term' : filter === 'bookmarked' ? 'Tap the bookmark icon on any verse' : 'Write your first verse to get started'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:              { flex:1, backgroundColor:T.black },
  center:            { flex:1, backgroundColor:T.black, alignItems:'center', justifyContent:'center' },
  topContent:        { paddingHorizontal:0 },
  header:            { paddingTop:18, paddingBottom:14, borderBottomWidth:0.5, borderBottomColor:T.border, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  headerTitle:       { fontFamily:FONTS.display, fontSize:28, color:T.cream, letterSpacing:1.5 },
  headerSub:         { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'300', marginTop:2 },
  searchBox:         { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:T.surface, borderWidth:0.5, borderColor:T.borderMd, borderRadius:4, paddingHorizontal:12, marginTop:2, marginBottom:10 },
  searchInput:       { flex:1, color:T.cream, fontFamily:FONTS.body, fontSize:14, paddingVertical:12 },
  filterRow:         { flexDirection:'row', alignItems:'center', gap:7, paddingBottom:12, borderBottomWidth:0.5, borderBottomColor:T.border, flexWrap:'wrap' },
  filterBtn:         { paddingVertical:6, paddingHorizontal:14, borderRadius:2, borderWidth:0.5, borderColor:T.border },
  filterBtnActive:   { borderColor:T.red, backgroundColor:T.redFaint },
  filterText:        { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:0.8, textTransform:'uppercase' },
  filterTextActive:  { color:T.red },
  sortGroup:         { flexDirection:'row', gap:10, marginLeft:'auto', paddingVertical:6 },
  sortText:          { fontSize:11, color:T.creamMute, fontFamily:FONTS.body, fontWeight:'600' },
  sortTextActive:    { color:T.cream },
  list:              { width:'100%', maxWidth:760, alignSelf:'center', paddingHorizontal:20, paddingTop:16, paddingBottom:80 },
  card:              { backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:4, marginBottom:10, overflow:'hidden' },
  cardTopBar:        { height:2.5, backgroundColor:T.red },
  cardBody:          { padding:14 },
  cardHead:          { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 },
  cardRef:           { fontFamily:FONTS.display, fontSize:17, color:T.cream, letterSpacing:0.5 },
  cardHeadRight:     { flexDirection:'row', alignItems:'center', gap:8 },
  transBadge:        { backgroundColor:T.surfaceEl, paddingHorizontal:7, paddingVertical:2, borderRadius:2 },
  transBadgeText:    { fontSize:10, color:T.creamMute, letterSpacing:0.8, fontFamily:FONTS.body },
  cardText:          { fontFamily:FONTS.serif, fontStyle:'italic', fontSize:14, color:T.cream, lineHeight:24, marginBottom:8 },
  cardNote:          { fontSize:11, color:T.creamDim, fontStyle:'italic', borderLeftWidth:2, borderLeftColor:T.borderMd, paddingLeft:9, lineHeight:17, marginBottom:10 },
  cardFoot:          { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  tagRow:            { flexDirection:'row', gap:5, flexWrap:'wrap', flex:1 },
  tag:               { borderWidth:0.5, borderColor:T.borderMd, borderRadius:2, paddingHorizontal:7, paddingVertical:2 },
  tagText:           { fontSize:9, color:T.creamDim, letterSpacing:0.6, fontFamily:FONTS.body },
  openLink:          { fontSize:11, color:T.red, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:0.6 },
  empty:             { alignItems:'center', paddingVertical:60 },
  emptyTitle:        { fontFamily:FONTS.display, fontSize:18, color:T.cream, letterSpacing:1.5, marginBottom:6 },
  emptySub:          { fontSize:12, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'300', textAlign:'center' },
});

// ─────────────────────────────────────────────
// FILE: app/verse/[id].tsx  — Verse detail
// ─────────────────────────────────────────────
/*
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { T, FONTS } from '../../constants/theme';

export default function VerseDetailScreen() {
  const { id }         = useLocalSearchParams<{ id: string }>();
  const [verse, setVerse]   = useState<any>(null);
  const [note,  setNote]    = useState('');
  const [saving,setSaving]  = useState(false);

  useEffect(() => {
    supabase.from('verses').select('*').eq('id', id).single()
      .then(({ data }) => { if(data){ setVerse(data); setNote(data.note || ''); } });
  }, [id]);

  const saveNote = async () => {
    setSaving(true);
    await supabase.from('verses').update({ note }).eq('id', id);
    setSaving(false);
  };

  const toggleBookmark = async () => {
    const next = !verse.bookmarked;
    await supabase.from('verses').update({ bookmarked: next }).eq('id', id);
    setVerse((p: any) => ({ ...p, bookmarked: next }));
  };

  if (!verse) return <View style={s.center}><ActivityIndicator color={T.red} /></View>;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      // Header
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.bkmkBtn, verse.bookmarked && s.bkmkBtnActive]} onPress={toggleBookmark}>
          <Text style={[s.bkmkText, verse.bookmarked && s.bkmkTextActive]}>
            {verse.bookmarked ? '🔖 Bookmarked' : '🏷️ Bookmark'}
          </Text>
        </TouchableOpacity>
      </View>

      // Verse
      <View style={s.card}>
        <View style={s.cardAccent} />
        <View style={s.cardInner}>
          <View style={s.cardHead}>
            <Text style={s.cardRef}>{verse.reference.toUpperCase()}</Text>
            <View style={s.transBadge}><Text style={s.transBadgeText}>{verse.translation}</Text></View>
          </View>
          <Text style={s.verseText}>"{verse.verse_text}"</Text>
          <View style={s.tagRow}>
            {verse.tags?.map((t: string) => <View key={t} style={s.tag}><Text style={s.tagText}>{t.toUpperCase()}</Text></View>)}
          </View>
        </View>
      </View>

      // Reflection
      <View style={s.section}>
        <Text style={s.sectionTitle}>MY REFLECTION</Text>
        <TextInput
          style={[s.noteInput]}
          placeholder="What does this verse mean to you?"
          placeholderTextColor={T.creamMute}
          value={note} onChangeText={setNote} onBlur={saveNote}
          multiline numberOfLines={5} textAlignVertical="top"
        />
        {saving && <Text style={s.savingText}>Saving...</Text>}
      </View>

      // Actions
      <View style={s.actionsRow}>
        {[{ icon:'🔔', label:'Set Reminder' }, { icon:'↗️', label:'Share Verse' }].map(a => (
          <TouchableOpacity key={a.label} style={s.actionBtn} activeOpacity={0.8}>
            <Text style={s.actionIcon}>{a.icon}</Text>
            <Text style={s.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height:30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:{ flex:1, backgroundColor:T.black },
  center:{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:T.black },
  scroll:{ paddingBottom:80 },
  header:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:0.5, borderBottomColor:T.border },
  back:{ fontSize:13, color:T.creamDim, fontFamily:FONTS.body },
  bkmkBtn:{ borderWidth:0.5, borderColor:T.borderMd, borderRadius:2, paddingHorizontal:12, paddingVertical:6 },
  bkmkBtnActive:{ borderColor:T.red, backgroundColor:T.redFaint },
  bkmkText:{ fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:0.8, textTransform:'uppercase' },
  bkmkTextActive:{ color:T.red },
  card:{ marginHorizontal:20, marginTop:20, backgroundColor:T.surface, borderWidth:0.5, borderColor:T.borderMd, borderRadius:4, flexDirection:'row', overflow:'hidden' },
  cardAccent:{ width:4, backgroundColor:T.red },
  cardInner:{ flex:1, padding:20 },
  cardHead:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  cardRef:{ fontFamily:FONTS.display, fontSize:22, color:T.red, letterSpacing:1.5 },
  transBadge:{ backgroundColor:T.surfaceEl, paddingHorizontal:8, paddingVertical:2, borderRadius:2 },
  transBadgeText:{ fontSize:10, color:T.creamMute, letterSpacing:0.8, fontFamily:FONTS.body },
  verseText:{ fontFamily:FONTS.serif, fontStyle:'italic', fontSize:20, color:T.cream, lineHeight:34, marginBottom:14 },
  tagRow:{ flexDirection:'row', gap:5, flexWrap:'wrap' },
  tag:{ borderWidth:0.5, borderColor:T.borderMd, borderRadius:2, paddingHorizontal:8, paddingVertical:3 },
  tagText:{ fontSize:9, color:T.creamDim, letterSpacing:0.6, fontFamily:FONTS.body },
  section:{ marginHorizontal:20, marginTop:18 },
  sectionTitle:{ fontSize:10, color:T.creamMute, letterSpacing:1.2, textTransform:'uppercase', fontWeight:'700', fontFamily:FONTS.body, marginBottom:8 },
  noteInput:{ backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:3, paddingHorizontal:14, paddingVertical:13, fontSize:16, fontFamily:FONTS.serif, color:T.cream, minHeight:120 },
  savingText:{ fontSize:11, color:T.creamMute, fontFamily:FONTS.body, marginTop:5 },
  actionsRow:{ flexDirection:'row', gap:8, marginHorizontal:20, marginTop:16 },
  actionBtn:{ flex:1, backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:3, padding:13, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:6 },
  actionIcon:{ fontSize:14 },
  actionLabel:{ fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:0.8, textTransform:'uppercase' },
});
*/
