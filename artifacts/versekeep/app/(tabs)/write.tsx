import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { T, FONTS } from '../../constants/theme';
import { AppIcon } from '../../components/AppIcon';
import { ResponsiveContent } from '../../components/ResponsiveContent';

const TRANSLATIONS = ['NIV', 'KJV', 'ESV', 'NLT', 'NKJV'];
const TAGS_LIST    = ['Love','Faith','Strength','Peace','Hope','Grace','Wisdom','Healing','Joy','Trust'];

const QUICK_VERSES = [
  { ref:'Jeremiah 29:11', translation:'NIV', text:'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.' },
  { ref:'Isaiah 41:10',   translation:'NIV', text:'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you.' },
  { ref:'Proverbs 3:5',   translation:'NIV', text:'Trust in the Lord with all your heart and lean not on your own understanding.' },
];

export default function WriteVerseScreen() {
  const [step,     setStep]     = useState<1 | 2>(1);
  const [ref,      setRef]      = useState('');
  const [trans,    setTrans]    = useState('NIV');
  const [text,     setText]     = useState('');
  const [note,     setNote]     = useState('');
  const [selTags,  setSelTags]  = useState<string[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSavedState] = useState(false);

  const toggleTag = (t: string) =>
    setSelTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const fillQuick = (v: typeof QUICK_VERSES[0]) => {
    setRef(v.ref); setText(v.text); setTrans(v.translation);
  };

  const handleSave = async () => {
    if (!ref.trim() || !text.trim()) {
      Alert.alert('Missing fields', 'Please enter a reference and verse text.'); return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/auth'); return; }

      const { error } = await supabase.from('verses').insert({
        user_id:    session.user.id,
        reference:  ref.trim(),
        translation:trans,
        verse_text: text.trim(),
        note:       note.trim() || null,
        tags:       selTags,
        bookmarked: false,
      });
      if (error) throw error;

      setSavedState(true);
      setTimeout(() => {
        setSavedState(false);
        setRef(''); setText(''); setNote(''); setSelTags([]); setStep(1);
        router.replace('/');
      }, 1600);
    } catch (e: any) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) return (
    <View style={styles.successRoot}>
      <View style={styles.successBox}>
        <AppIcon name="checkmark" size={32} color={T.red} />
      </View>
      <Text style={styles.successTitle}>VERSE SAVED</Text>
      <Text style={styles.successSub}>Added to your vault</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 2 ? setStep(1) : router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WRITE A VERSE</Text>
        <View style={styles.stepDots}>
          {[1,2].map(s => <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />)}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ResponsiveContent style={styles.content}>

        {/* STEP 1 */}
        {step === 1 && (
          <View style={styles.stepBody}>
            <Text style={styles.stepLabel}>STEP 1 OF 2 — THE VERSE</Text>

            <Text style={styles.fieldLabel}>Reference</Text>
            <TextInput style={styles.input} placeholder="e.g. John 3:16 or Psalm 23:1"
              placeholderTextColor={T.creamMute} value={ref} onChangeText={setRef} />

            <Text style={styles.fieldLabel}>Translation</Text>
            <View style={styles.transRow}>
              {TRANSLATIONS.map(t => (
                <TouchableOpacity key={t}
                  style={[styles.transBtn, trans===t && styles.transBtnActive]}
                  onPress={() => setTrans(t)} activeOpacity={0.8}>
                  <Text style={[styles.transBtnText, trans===t && styles.transBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Verse text</Text>
            <TextInput style={[styles.input, styles.multiline]}
              placeholder="Type or paste the verse here..."
              placeholderTextColor={T.creamMute} value={text}
              onChangeText={setText} multiline numberOfLines={5} textAlignVertical="top" />

            <Text style={styles.quickLabel}>QUICK-ADD A POPULAR VERSE</Text>
            {QUICK_VERSES.map(v => (
              <TouchableOpacity key={v.ref} style={styles.quickItem} onPress={() => fillQuick(v)} activeOpacity={0.8}>
                <Text style={styles.quickRef}>{v.ref}</Text>
                <Text style={styles.quickText} numberOfLines={1}>{v.text}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.redBtn, (!ref || !text) && styles.redBtnDisabled]}
              onPress={() => { if(ref && text) setStep(2); }}
              disabled={!ref || !text}
              activeOpacity={0.85}
            >
              <Text style={styles.redBtnLabel}>Next: Add reflection →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <View style={styles.stepBody}>
            {/* Preview */}
            <View style={styles.preview}>
              <Text style={styles.previewRef}>{ref.toUpperCase()} · {trans}</Text>
              <Text style={styles.previewText}>"{text}"</Text>
            </View>

            <Text style={styles.stepLabel}>STEP 2 OF 2 — REFLECTION</Text>

            <Text style={styles.fieldLabel}>Personal note (optional)</Text>
            <TextInput style={[styles.input, styles.multiline]}
              placeholder="What does this verse mean to you?"
              placeholderTextColor={T.creamMute} value={note}
              onChangeText={setNote} multiline numberOfLines={4} textAlignVertical="top" />

            <Text style={styles.fieldLabel}>Tags</Text>
            <View style={styles.tagsGrid}>
              {TAGS_LIST.map(t => (
                <TouchableOpacity key={t}
                  style={[styles.tagBtn, selTags.includes(t) && styles.tagBtnActive]}
                  onPress={() => toggleTag(t)} activeOpacity={0.8}>
                  <Text style={[styles.tagBtnText, selTags.includes(t) && styles.tagBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.redBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.redBtnLabel}>Save to vault</Text>
              }
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
        </ResponsiveContent>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:             { flex:1, backgroundColor:T.black },
  header:           { flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:0.5, borderBottomColor:T.border, gap:12 },
  backBtn:          { fontSize:13, color:T.creamDim, fontFamily:FONTS.body },
  headerTitle:      { flex:1, fontFamily:FONTS.display, fontSize:22, color:T.cream, letterSpacing:1 },
  stepDots:         { flexDirection:'row', gap:4 },
  stepDot:          { width:22, height:3, borderRadius:2, backgroundColor:T.surfaceEl },
  stepDotActive:    { backgroundColor:T.red },
  scroll:           { paddingBottom:30 },
  content:          { paddingHorizontal:0 },
  stepBody:         { padding:20 },
  stepLabel:        { fontSize:10, color:T.creamMute, letterSpacing:1.2, textTransform:'uppercase', fontWeight:'700', fontFamily:FONTS.body, marginBottom:16 },
  fieldLabel:       { fontSize:11, color:T.creamDim, letterSpacing:1, textTransform:'uppercase', fontFamily:FONTS.body, marginBottom:6 },
  input:            { backgroundColor:T.surfaceEl, borderWidth:0.5, borderColor:T.borderMd, borderRadius:3, paddingHorizontal:14, paddingVertical:12, fontSize:14, color:T.cream, fontFamily:FONTS.body, marginBottom:14 },
  multiline:        { minHeight:100, paddingTop:12 },
  transRow:         { flexDirection:'row', gap:7, flexWrap:'wrap', marginBottom:14 },
  transBtn:         { paddingVertical:6, paddingHorizontal:13, borderRadius:2, borderWidth:0.5, borderColor:T.border },
  transBtnActive:   { borderColor:T.red, backgroundColor:T.redFaint },
  transBtnText:     { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:0.8 },
  transBtnTextActive:{ color:T.red },
  quickLabel:       { fontSize:10, color:T.creamMute, letterSpacing:1.2, textTransform:'uppercase', fontWeight:'700', fontFamily:FONTS.body, marginBottom:10, marginTop:4 },
  quickItem:        { backgroundColor:T.surfaceEl, borderWidth:0.5, borderColor:T.border, borderRadius:3, padding:11, marginBottom:6 },
  quickRef:         { fontSize:12, color:T.red, fontWeight:'700', fontFamily:FONTS.body, marginBottom:2, letterSpacing:0.5 },
  quickText:        { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, lineHeight:16 },
  preview:          { backgroundColor:T.surface, borderLeftWidth:3, borderLeftColor:T.red, borderWidth:0.5, borderColor:T.borderMd, borderRadius:3, padding:16, marginBottom:20 },
  previewRef:       { fontFamily:FONTS.display, fontSize:16, color:T.red, letterSpacing:1, marginBottom:8 },
  previewText:      { fontFamily:FONTS.serif, fontStyle:'italic', fontSize:15, color:T.cream, lineHeight:26 },
  tagsGrid:         { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:24 },
  tagBtn:           { paddingVertical:5, paddingHorizontal:12, borderRadius:2, borderWidth:0.5, borderColor:T.border },
  tagBtnActive:     { borderColor:T.red, backgroundColor:T.redFaint },
  tagBtnText:       { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'600', letterSpacing:0.7, textTransform:'uppercase' },
  tagBtnTextActive: { color:T.red },
  redBtn:           { backgroundColor:T.red, borderRadius:3, paddingVertical:14, alignItems:'center', marginTop:4 },
  redBtnDisabled:   { opacity:0.45 },
  redBtnLabel:      { color:T.white, fontSize:13, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:1, textTransform:'uppercase' },
  successRoot:      { flex:1, backgroundColor:T.black, alignItems:'center', justifyContent:'center', gap:14 },
  successBox:       { width:70, height:70, backgroundColor:T.redFaint, borderWidth:2, borderColor:T.red, borderRadius:4, alignItems:'center', justifyContent:'center' },
  successTick:      { fontSize:30, color:T.red },
  successTitle:     { fontFamily:FONTS.display, fontSize:28, color:T.cream, letterSpacing:2 },
  successSub:       { fontSize:13, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'300' },
});
