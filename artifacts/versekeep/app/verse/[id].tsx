// ═══════════════════════════════════════════════════
// FILE: app/verse/[id].tsx  — Verse Detail Screen
// ═══════════════════════════════════════════════════
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Share, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { updateStreak } from '../../lib/streak';
import { shareVerse }   from '../../lib/share';
import { T, FONTS }     from '../../constants/theme';
import { AppIcon } from '../../components/AppIcon';
import { ResponsiveContent } from '../../components/ResponsiveContent';

type Verse = {
  id: string;
  reference: string;
  translation: string;
  verse_text: string;
  note: string | null;
  tags: string[];
  bookmarked: boolean;
  created_at: string;
};

type Task = {
  id: string;
  text: string;
  done: boolean;
};

const TAGS_LIST = ['Love','Faith','Strength','Peace','Hope','Grace','Wisdom','Healing','Joy','Trust'];

export default function VerseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [verse,      setVerse]      = useState<Verse | null>(null);
  const [note,       setNote]       = useState('');
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [newTask,    setNewTask]     = useState('');
  const [editingTags,setEditingTags]= useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [loading,    setLoading]    = useState(true);

  // ─── Load verse ───
  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('verses').select('*').eq('id', id).single();
    if (error || !data) { Alert.alert('Not found', 'Verse not found.'); router.back(); return; }
    setVerse(data);
    setNote(data.note || '');
    setLoading(false);
    // Opening a verse counts as today's reading — update streak silently
    updateStreak().catch(() => {});
  }, [id]);

  // ─── Load tasks ───
  const loadTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks').select('*').eq('verse_id', id).order('created_at');
    setTasks(data || []);
  }, [id]);

  useEffect(() => { load(); loadTasks(); }, [load, loadTasks]);

  // ─── Save note (on blur) ───
  const saveNote = async () => {
    if (!verse || note === verse.note) return;
    setSavingNote(true);
    await supabase.from('verses').update({ note }).eq('id', id);
    setVerse(prev => prev ? { ...prev, note } : prev);
    setSavingNote(false);
  };

  // ─── Toggle bookmark ───
  const toggleBookmark = async () => {
    if (!verse) return;
    const next = !verse.bookmarked;
    await supabase.from('verses').update({ bookmarked: next }).eq('id', id);
    setVerse(prev => prev ? { ...prev, bookmarked: next } : prev);
  };

  // ─── Toggle tag ───
  const toggleTag = async (tag: string) => {
    if (!verse) return;
    const next = verse.tags.includes(tag)
      ? verse.tags.filter(t => t !== tag)
      : [...verse.tags, tag];
    await supabase.from('verses').update({ tags: next }).eq('id', id);
    setVerse(prev => prev ? { ...prev, tags: next } : prev);
  };

  // ─── Add task ───
  const addTask = async () => {
    if (!newTask.trim()) return;
    const { data } = await supabase.from('tasks').insert({
      verse_id: id, text: newTask.trim(), done: false,
    }).select().single();
    if (data) setTasks(prev => [...prev, data]);
    setNewTask('');
  };

  // ─── Toggle task done ───
  const toggleTask = async (task: Task) => {
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
  };

  // ─── Share verse ───
  const handleShare = async () => {
    if (!verse) return;
    await shareVerse({
      reference:   verse.reference,
      translation: verse.translation,
      verse_text:  verse.verse_text,
      note:        verse.note,
    });
  };

  // ─── Delete verse ───
  const deleteVerse = () => {
    Alert.alert(
      'Delete verse',
      `Remove ${verse?.reference} from your vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('verses').delete().eq('id', id);
          router.back();
        }},
      ]
    );
  };

  if (loading || !verse) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={T.red} size="large" />
      </View>
    );
  }

  const pendingTasks = tasks.filter(t => !t.done).length;
  const doneTasks    = tasks.filter(t =>  t.done).length;

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <View style={s.backButton}><AppIcon name="arrow-back-outline" size={18} color={T.creamDim} /><Text style={s.back}>Back</Text></View>
        </TouchableOpacity>

        <View style={s.headerActions}>
          <TouchableOpacity
            style={[s.bkmkBtn, verse.bookmarked && s.bkmkBtnActive]}
            onPress={toggleBookmark}
            activeOpacity={0.8}
          >
            <AppIcon name={verse.bookmarked ? 'bookmark' : 'bookmark-outline'} size={16} color={verse.bookmarked ? T.red : T.creamDim} />
            <Text style={[s.bkmkText, verse.bookmarked && s.bkmkTextActive]}>
              {verse.bookmarked ? 'Saved' : 'Bookmark'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
            <AppIcon name="share-outline" size={20} color={T.creamDim} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ResponsiveContent style={s.content}>
        {/* ── Verse card ── */}
        <View style={s.verseCard}>
          <View style={s.cardAccent} />
          <View style={s.cardInner}>
            {/* Decorative quote mark */}
            <Text style={s.quoteMark}>"</Text>

            <View style={s.cardHead}>
              <Text style={s.cardRef}>{verse.reference.toUpperCase()}</Text>
              <View style={s.transBadge}>
                <Text style={s.transBadgeText}>{verse.translation}</Text>
              </View>
            </View>

            <Text style={s.verseText}>"{verse.verse_text}"</Text>

            {/* Tags row */}
            <View style={s.tagsRow}>
              {verse.tags.map(t => (
                <TouchableOpacity key={t} style={s.tag} onPress={() => toggleTag(t)} activeOpacity={0.7}>
                  <Text style={s.tagText}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.addTagBtn} onPress={() => setEditingTags(!editingTags)} activeOpacity={0.7}>
                <Text style={s.addTagText}>{editingTags ? '✓ Done' : '+ Tag'}</Text>
              </TouchableOpacity>
            </View>

            {/* Tag editor */}
            {editingTags && (
              <View style={s.tagEditor}>
                <View style={s.tagGrid}>
                  {TAGS_LIST.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[s.tagOption, verse.tags.includes(t) && s.tagOptionActive]}
                      onPress={() => toggleTag(t)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.tagOptionText, verse.tags.includes(t) && s.tagOptionTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Saved date ── */}
        <Text style={s.savedDate}>
          Saved {new Date(verse.created_at).toLocaleDateString('en-KE', {
            weekday:'long', day:'numeric', month:'long', year:'numeric'
          })}
        </Text>

        {/* ── Reflection ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>MY REFLECTION</Text>
            {savingNote && <Text style={s.savingText}>Saving...</Text>}
          </View>
          <TextInput
            style={s.noteInput}
            placeholder="What does this verse mean to you? Write your personal reflection here..."
            placeholderTextColor={T.creamMute}
            value={note}
            onChangeText={setNote}
            onBlur={saveNote}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* ── Tasks ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>TASKS FROM THIS VERSE</Text>
            {tasks.length > 0 && (
              <Text style={s.taskCount}>
                {doneTasks}/{tasks.length} done
              </Text>
            )}
          </View>

          {/* Task progress bar */}
          {tasks.length > 0 && (
            <View style={s.taskProgress}>
              <View style={[s.taskProgressFill, {
                width: `${Math.round(doneTasks / tasks.length * 100)}%` as any
              }]} />
            </View>
          )}

          {/* Task list */}
          {tasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={s.taskRow}
              onPress={() => toggleTask(task)}
              activeOpacity={0.75}
            >
              <View style={[s.taskCheck, task.done && s.taskCheckDone]}>
                {task.done && <Text style={s.taskCheckIcon}>✓</Text>}
              </View>
              <Text style={[s.taskText, task.done && s.taskTextDone]}>
                {task.text}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Add task */}
          <View style={s.addTaskRow}>
            <TextInput
              style={s.addTaskInput}
              placeholder="Add a task from this verse..."
              placeholderTextColor={T.creamMute}
              value={newTask}
              onChangeText={setNewTask}
              onSubmitEditing={addTask}
              returnKeyType="done"
            />
            <TouchableOpacity style={s.addTaskBtn} onPress={addTask} activeOpacity={0.85}>
              <Text style={s.addTaskBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => router.push({ pathname: '/reminders', params: { verseId: id } })}
            activeOpacity={0.8}
          >
            <AppIcon name="notifications-outline" size={18} color={T.creamDim} />
            <Text style={s.actionLabel}>Set Reminder</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionBtn} onPress={handleShare} activeOpacity={0.8}>
            <AppIcon name="share-outline" size={18} color={T.creamDim} />
            <Text style={s.actionLabel}>Share Verse</Text>
          </TouchableOpacity>
        </View>

        {/* ── Danger zone ── */}
        <TouchableOpacity style={s.deleteBtn} onPress={deleteVerse} activeOpacity={0.8}>
          <Text style={s.deleteBtnText}>Remove from vault</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
        </ResponsiveContent>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:               { flex:1, backgroundColor:T.black },
  center:             { flex:1, backgroundColor:T.black, alignItems:'center', justifyContent:'center' },
  header:             { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:0.5, borderBottomColor:T.border },
  backButton:         { flexDirection:'row', alignItems:'center', gap:6 },
  back:               { fontSize:13, color:T.creamDim, fontFamily:FONTS.body },
  headerActions:      { flexDirection:'row', alignItems:'center', gap:12 },
  bkmkBtn:            { borderWidth:0.5, borderColor:T.borderMd, borderRadius:3, paddingHorizontal:12, paddingVertical:6 },
  bkmkBtnActive:      { borderColor:T.red, backgroundColor:T.redFaint },
  bkmkText:           { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:0.8, textTransform:'uppercase' },
  bkmkTextActive:     { color:T.red },
  scroll:             { flex:1 },
  scrollContent:      { paddingBottom:30 },
  content:            { paddingHorizontal:0 },

  // Verse card
  verseCard:          { marginTop:20, backgroundColor:T.surface, borderWidth:0.5, borderColor:T.borderMd, borderRadius:4, flexDirection:'row', overflow:'hidden' },
  cardAccent:         { width:4, backgroundColor:T.red },
  cardInner:          { flex:1, padding:20, position:'relative' },
  quoteMark:          { position:'absolute', right:10, bottom:-10, fontFamily:FONTS.serif, fontSize:80, color:'rgba(197,0,34,0.07)', lineHeight:80 },
  cardHead:           { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  cardRef:            { fontFamily:FONTS.display, fontSize:22, color:T.red, letterSpacing:1.5 },
  transBadge:         { backgroundColor:T.surfaceEl, paddingHorizontal:8, paddingVertical:3, borderRadius:2 },
  transBadgeText:     { fontSize:10, color:T.creamMute, letterSpacing:0.8, fontFamily:FONTS.body },
  verseText:          { fontFamily:FONTS.serif, fontStyle:'italic', fontSize:20, color:T.cream, lineHeight:34, marginBottom:16 },

  // Tags
  tagsRow:            { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:4 },
  tag:                { borderWidth:0.5, borderColor:T.borderMd, borderRadius:2, paddingHorizontal:9, paddingVertical:4 },
  tagText:            { fontSize:9, color:T.creamDim, letterSpacing:0.7, fontFamily:FONTS.body },
  addTagBtn:          { borderWidth:0.5, borderColor:T.redBorder, borderRadius:2, paddingHorizontal:9, paddingVertical:4, backgroundColor:T.redFaint },
  addTagText:         { fontSize:9, color:T.red, letterSpacing:0.7, fontFamily:FONTS.body, fontWeight:'700' },
  tagEditor:          { marginTop:12, paddingTop:12, borderTopWidth:0.5, borderTopColor:T.border },
  tagGrid:            { flexDirection:'row', flexWrap:'wrap', gap:6 },
  tagOption:          { paddingVertical:5, paddingHorizontal:11, borderRadius:2, borderWidth:0.5, borderColor:T.border },
  tagOptionActive:    { borderColor:T.red, backgroundColor:T.redFaint },
  tagOptionText:      { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'600', letterSpacing:0.7, textTransform:'uppercase' },
  tagOptionTextActive:{ color:T.red },

  savedDate:          { fontSize:11, color:T.creamMute, fontFamily:FONTS.body, marginTop:10, marginBottom:2, fontStyle:'italic' },

  // Sections
  section:            { marginTop:18 },
  sectionHead:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  sectionTitle:       { fontSize:10, color:T.creamMute, letterSpacing:1.2, textTransform:'uppercase', fontWeight:'700', fontFamily:FONTS.body },
  savingText:         { fontSize:10, color:T.creamMute, fontFamily:FONTS.body, fontStyle:'italic' },
  taskCount:          { fontSize:10, color:T.red, fontFamily:FONTS.body, fontWeight:'600' },

  // Note
  noteInput:          { backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:3, paddingHorizontal:14, paddingVertical:13, fontSize:16, fontFamily:FONTS.serif, color:T.cream, minHeight:130, lineHeight:28 },

  // Tasks
  taskProgress:       { height:3, backgroundColor:T.surfaceEl, borderRadius:2, marginBottom:10, overflow:'hidden' },
  taskProgressFill:   { height:'100%', backgroundColor:T.red, borderRadius:2 },
  taskRow:            { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:3, padding:12, marginBottom:6 },
  taskCheck:          { width:20, height:20, borderRadius:4, borderWidth:1.5, borderColor:T.creamMute, alignItems:'center', justifyContent:'center' },
  taskCheckDone:      { backgroundColor:T.red, borderColor:T.red },
  taskCheckIcon:      { color:T.white, fontSize:11, fontWeight:'700' },
  taskText:           { flex:1, fontSize:13, color:T.cream, fontFamily:FONTS.body },
  taskTextDone:       { color:T.creamMute, textDecorationLine:'line-through' },
  addTaskRow:         { flexDirection:'row', gap:8, marginTop:4 },
  addTaskInput:       { flex:1, backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:3, paddingHorizontal:13, paddingVertical:11, fontSize:13, color:T.cream, fontFamily:FONTS.body },
  addTaskBtn:         { backgroundColor:T.redFaint, borderWidth:0.5, borderColor:T.redBorder, borderRadius:3, width:44, alignItems:'center', justifyContent:'center' },
  addTaskBtnText:     { fontSize:22, color:T.red, lineHeight:28 },

  // Bottom actions
  actionsRow:         { flexDirection:'row', gap:8, marginTop:18 },
  actionBtn:          { flex:1, backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:3, padding:13, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:6 },
  actionLabel:        { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:0.8, textTransform:'uppercase' },

  // Delete
  deleteBtn:          { marginHorizontal:20, marginTop:14, paddingVertical:13, borderWidth:0.5, borderColor:T.borderMd, borderRadius:3, alignItems:'center' },
  deleteBtnText:      { fontSize:12, color:T.creamMute, fontFamily:FONTS.body, letterSpacing:0.6 },
});
