import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Keyboard,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, getUserId } from '../../lib/supabase';
import { T, FONTS } from '../../constants/theme';

// ─── API.Bible config ───────────────────────────────────
// Get your free key at https://scripture.api.bible
// Add to .env: EXPO_PUBLIC_BIBLE_API_KEY=your_key_here
const BIBLE_API_KEY = process.env.EXPO_PUBLIC_BIBLE_API_KEY ?? '';

// Bible IDs (API.Bible)
const BIBLE_IDS: Record<string, string> = {
  NIV:  '06125adad2d5898a-01',
  KJV:  'de4e12af7f28f599-02',
  ESV:  '9879dbb7cfe39e4d-04',
  NLT:  '65eec8e0b60e656b-01',
  NKJV: '1fd99b0d1fe28d27-01',
};

const TRANSLATIONS   = ['NIV', 'KJV', 'ESV', 'NLT', 'NKJV'];
const TOPIC_VERSES   = [
  { topic:'Peace',    ref:'Philippians 4:7',  text:'And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.' },
  { topic:'Strength', ref:'Isaiah 40:31',     text:'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.' },
  { topic:'Hope',     ref:'Jeremiah 29:11',   text:'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.' },
  { topic:'Love',     ref:'1 Corinthians 13:4', text:'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.' },
  { topic:'Faith',    ref:'Hebrews 11:1',     text:'Now faith is confidence in what we hope for and assurance about what we do not see.' },
  { topic:'Courage',  ref:'Joshua 1:9',       text:'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.' },
  { topic:'Wisdom',   ref:'Proverbs 3:5-6',   text:'Trust in the Lord with all your heart and lean not on your own understanding.' },
  { topic:'Grace',    ref:'Ephesians 2:8',    text:'For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God.' },
];

type SearchResult = {
  id:          string;
  reference:   string;
  translation: string;
  text:        string;
};

// ─── Strip HTML tags from API.Bible response ─────────────
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Call API.Bible search endpoint ─────────────────────
async function searchBibleApi(query: string, translation: string): Promise<SearchResult[]> {
  const bibleId = BIBLE_IDS[translation] ?? BIBLE_IDS.NIV;
  const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/search?query=${encodeURIComponent(query)}&limit=10`;

  const res = await fetch(url, {
    headers: { 'api-key': BIBLE_API_KEY },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);

  const json = await res.json();
  const verses = json?.data?.verses ?? [];

  return verses.map((v: any) => ({
    id:          v.id,
    reference:   v.reference,
    translation,
    text:        stripHtml(v.text),
  }));
}

// ─── Fallback: search locally saved verses ───────────────
async function searchSaved(query: string): Promise<SearchResult[]> {
  const uid = await getUserId();
  const { data } = await supabase
    .from('verses')
    .select('id, reference, translation, verse_text')
    .eq('user_id', uid)
    .or(`reference.ilike.%${query}%,verse_text.ilike.%${query}%`)
    .limit(10);

  return (data ?? []).map(v => ({
    id:          v.id,
    reference:   v.reference,
    translation: v.translation,
    text:        v.verse_text,
  }));
}

export default function SearchScreen() {
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<SearchResult[]>([]);
  const [savedIds,   setSavedIds]   = useState<Set<string>>(new Set());
  const [loading,    setLoading]    = useState(false);
  const [translation,setTranslation]= useState('NIV');
  const [mode,       setMode]       = useState<'bible'|'vault'>('bible');
  const [error,      setError]      = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load which results are already saved
  const checkSaved = useCallback(async (refs: string[]) => {
    try {
      const uid = await getUserId();
      const { data } = await supabase
        .from('verses')
        .select('reference')
        .eq('user_id', uid)
        .in('reference', refs);
      setSavedIds(new Set((data ?? []).map(v => v.reference)));
    } catch { /* not logged in */ }
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError('');
    try {
      const res = mode === 'vault'
        ? await searchSaved(q)
        : BIBLE_API_KEY
          ? await searchBibleApi(q, translation)
          : await searchSaved(q); // fallback if no API key

      setResults(res);
      await checkSaved(res.map(r => r.reference));
    } catch (e: any) {
      setError('Search failed. Check your connection and try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [mode, translation, checkSaved]);

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(text), 500);
  };

  const saveVerse = async (v: SearchResult) => {
    try {
      const uid = await getUserId();
      await supabase.from('verses').insert({
        user_id:    uid,
        reference:  v.reference,
        translation:v.translation,
        verse_text: v.text,
        note:       null,
        tags:       [],
        bookmarked: false,
      });
      setSavedIds(prev => new Set([...prev, v.reference]));
    } catch (e: any) {
      console.error('Save failed:', e.message);
    }
  };

  const openVerse = (v: SearchResult) => {
    if (savedIds.has(v.reference)) {
      // Navigate to detail if already in vault
      router.push({ pathname: '/verse/[id]', params: { id: v.id } });
    }
  };

  // ─── Render result card ─────────────────────────────────
  const renderResult = ({ item: v }: { item: SearchResult }) => {
    const isSaved = savedIds.has(v.reference);
    return (
      <View style={s.resultCard}>
        <View style={s.resultHead}>
          <Text style={s.resultRef}>{v.reference.toUpperCase()}</Text>
          <View style={s.resultRight}>
            <View style={s.transBadge}>
              <Text style={s.transBadgeText}>{v.translation}</Text>
            </View>
            <TouchableOpacity
              style={[s.saveBtn, isSaved && s.saveBtnDone]}
              onPress={() => isSaved ? openVerse(v) : saveVerse(v)}
              activeOpacity={0.8}
            >
              <Text style={[s.saveBtnText, isSaved && s.saveBtnTextDone]}>
                {isSaved ? '✓ Saved' : '+ Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s.resultText}>"{v.text}"</Text>
        {!isSaved && (
          <TouchableOpacity onPress={() => saveVerse(v)} activeOpacity={0.7} style={s.addNoteBtn}>
            <Text style={s.addNoteText}>Save &amp; add notes →</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>SEARCH SCRIPTURE</Text>
      </View>

      {/* Search input */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Keyword, reference, or topic..."
            placeholderTextColor={T.creamMute}
            value={query}
            onChangeText={handleChange}
            returnKeyType="search"
            onSubmitEditing={() => { Keyboard.dismiss(); doSearch(query); }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
              <Text style={s.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mode toggle */}
      <View style={s.modeRow}>
        {(['bible','vault'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[s.modeBtn, mode===m && s.modeBtnActive]}
            onPress={() => { setMode(m); if(query) doSearch(query); }}
            activeOpacity={0.8}
          >
            <Text style={[s.modeBtnText, mode===m && s.modeBtnTextActive]}>
              {m === 'bible' ? '📖 Bible' : '🔖 My Vault'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Translation row (only for bible mode) */}
      {mode === 'bible' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.transRow}
        >
          {TRANSLATIONS.map(t => (
            <TouchableOpacity
              key={t}
              style={[s.transBtn, translation===t && s.transBtnActive]}
              onPress={() => { setTranslation(t); if(query) doSearch(query); }}
              activeOpacity={0.8}
            >
              <Text style={[s.transBtnText, translation===t && s.transBtnTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Results / empty state */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={T.red} size="large" />
          <Text style={s.loadingText}>Searching scripture...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorText}>{error}</Text>
          {!BIBLE_API_KEY && (
            <Text style={s.apiHint}>
              Add EXPO_PUBLIC_BIBLE_API_KEY to .env{'\n'}for full Bible search (api.bible — free)
            </Text>
          )}
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(v, i) => v.id + i}
          renderItem={renderResult}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={s.resultCount}>{results.length} result{results.length !== 1 ? 's' : ''}</Text>
          }
        />
      ) : query.length === 0 ? (
        /* Browse by topic */
        <ScrollView contentContainerStyle={s.topicsContainer} keyboardShouldPersistTaps="handled">
          <Text style={s.topicsTitle}>BROWSE BY TOPIC</Text>
          <View style={s.topicsGrid}>
            {TOPIC_VERSES.map(t => (
              <TouchableOpacity
                key={t.topic}
                style={s.topicBtn}
                onPress={() => { setQuery(t.topic); doSearch(t.topic); }}
                activeOpacity={0.8}
              >
                <Text style={s.topicBtnText}>{t.topic}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.topicsTitle, { marginTop: 24 }]}>SUGGESTED VERSES</Text>
          {TOPIC_VERSES.slice(0, 3).map(v => (
            <View key={v.ref} style={s.suggestCard}>
              <Text style={s.suggestRef}>{v.ref.toUpperCase()}</Text>
              <Text style={s.suggestText} numberOfLines={2}>"{v.text}"</Text>
              <TouchableOpacity
                style={s.saveBtn}
                onPress={() => saveVerse({ id: v.ref, reference: v.ref, translation, text: v.text })}
                activeOpacity={0.8}
              >
                <Text style={s.saveBtnText}>+ Save to vault</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      ) : (
        <View style={s.center}>
          <Text style={s.noResultIcon}>📭</Text>
          <Text style={s.noResultTitle}>NO RESULTS</Text>
          <Text style={s.noResultSub}>Try a different keyword or translation</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex:1, backgroundColor:T.black },
  header:           { paddingHorizontal:20, paddingTop:18, paddingBottom:14, borderBottomWidth:0.5, borderBottomColor:T.border },
  headerTitle:      { fontFamily:FONTS.display, fontSize:28, color:T.cream, letterSpacing:1.5 },
  searchRow:        { paddingHorizontal:16, paddingVertical:12 },
  searchBox:        { flexDirection:'row', alignItems:'center', backgroundColor:T.surface, borderWidth:0.5, borderColor:T.borderMd, borderRadius:4, paddingHorizontal:12, gap:8 },
  searchIcon:       { fontSize:16 },
  searchInput:      { flex:1, fontSize:14, color:T.cream, fontFamily:FONTS.body, paddingVertical:13 },
  clearIcon:        { fontSize:16, color:T.creamMute, padding:4 },
  modeRow:          { flexDirection:'row', gap:8, paddingHorizontal:16, marginBottom:10 },
  modeBtn:          { flex:1, paddingVertical:8, borderRadius:3, borderWidth:0.5, borderColor:T.border, alignItems:'center' },
  modeBtnActive:    { borderColor:T.red, backgroundColor:T.redFaint },
  modeBtnText:      { fontSize:12, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'600', letterSpacing:0.5 },
  modeBtnTextActive:{ color:T.red },
  transRow:         { paddingHorizontal:16, paddingBottom:12, gap:7 },
  transBtn:         { paddingVertical:6, paddingHorizontal:14, borderRadius:2, borderWidth:0.5, borderColor:T.border },
  transBtnActive:   { borderColor:T.red, backgroundColor:T.redFaint },
  transBtnText:     { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:0.8 },
  transBtnTextActive:{ color:T.red },
  center:           { flex:1, alignItems:'center', justifyContent:'center', padding:32, gap:10 },
  loadingText:      { fontSize:13, color:T.creamDim, fontFamily:FONTS.body, marginTop:8 },
  errorIcon:        { fontSize:28, marginBottom:4 },
  errorText:        { fontSize:13, color:T.red, fontFamily:FONTS.body, textAlign:'center' },
  apiHint:          { fontSize:11, color:T.creamMute, fontFamily:FONTS.body, textAlign:'center', marginTop:8, lineHeight:18 },
  noResultIcon:     { fontSize:32, marginBottom:8 },
  noResultTitle:    { fontFamily:FONTS.display, fontSize:20, color:T.cream, letterSpacing:1 },
  noResultSub:      { fontSize:12, color:T.creamDim, fontFamily:FONTS.body, marginTop:4 },
  list:             { padding:16, paddingBottom:80 },
  resultCount:      { fontSize:10, color:T.creamMute, letterSpacing:1, textTransform:'uppercase', fontFamily:FONTS.body, fontWeight:'600', marginBottom:10 },
  resultCard:       { backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:4, padding:14, marginBottom:10 },
  resultHead:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 },
  resultRef:        { fontFamily:FONTS.display, fontSize:16, color:T.red, letterSpacing:1, flex:1 },
  resultRight:      { flexDirection:'row', alignItems:'center', gap:8 },
  transBadge:       { backgroundColor:T.surfaceEl, paddingHorizontal:7, paddingVertical:2, borderRadius:2 },
  transBadgeText:   { fontSize:10, color:T.creamMute, letterSpacing:0.8, fontFamily:FONTS.body },
  resultText:       { fontFamily:FONTS.serif, fontStyle:'italic', fontSize:15, color:T.cream, lineHeight:26, marginBottom:8 },
  saveBtn:          { borderWidth:0.5, borderColor:T.border, borderRadius:2, paddingHorizontal:10, paddingVertical:4 },
  saveBtnDone:      { borderColor:T.success, backgroundColor:T.successFaint },
  saveBtnText:      { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'600', letterSpacing:0.5 },
  saveBtnTextDone:  { color:T.success },
  addNoteBtn:       { alignSelf:'flex-start', marginTop:2 },
  addNoteText:      { fontSize:11, color:T.red, fontFamily:FONTS.body, fontWeight:'600', letterSpacing:0.5 },
  topicsContainer:  { padding:16 },
  topicsTitle:      { fontSize:10, color:T.creamMute, letterSpacing:1.2, textTransform:'uppercase', fontWeight:'700', fontFamily:FONTS.body, marginBottom:10 },
  topicsGrid:       { flexDirection:'row', flexWrap:'wrap', gap:8 },
  topicBtn:         { paddingVertical:8, paddingHorizontal:16, borderRadius:20, borderWidth:0.5, borderColor:T.border, backgroundColor:T.surface },
  topicBtnText:     { fontSize:13, color:T.creamDim, fontFamily:FONTS.body },
  suggestCard:      { backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:4, padding:13, marginBottom:8 },
  suggestRef:       { fontFamily:FONTS.display, fontSize:14, color:T.red, letterSpacing:1, marginBottom:6 },
  suggestText:      { fontSize:13, color:T.cream, fontFamily:FONTS.serif, fontStyle:'italic', lineHeight:22, marginBottom:8 },
});
