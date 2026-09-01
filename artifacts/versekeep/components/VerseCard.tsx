import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { T, FONTS } from '../constants/theme';

export type VerseCardProps = {
  id:          string;
  reference:   string;
  translation: string;
  verse_text:  string;
  note?:       string | null;
  tags?:       string[];
  bookmarked?: boolean;
  savedAt?:    string;
  compact?:    boolean;
  onBookmark?: (id: string) => void;
};

export function VerseCard({
  id, reference, translation, verse_text,
  note, tags = [], bookmarked = false,
  savedAt, compact = false, onBookmark,
}: VerseCardProps) {
  return (
    <TouchableOpacity
      style={[s.card, compact && s.cardCompact]}
      onPress={() => router.push({ pathname: '/verse/[id]', params: { id } })}
      activeOpacity={0.8}
    >
      {bookmarked && <View style={s.topBar} />}
      <View style={s.accent} />
      <View style={s.body}>
        <View style={s.head}>
          <Text style={s.ref} numberOfLines={1}>{reference.toUpperCase()}</Text>
          <View style={s.headRight}>
            <View style={s.transBadge}>
              <Text style={s.transBadgeText}>{translation}</Text>
            </View>
            {onBookmark && (
              <TouchableOpacity
                onPress={() => onBookmark(id)}
                hitSlop={{ top:8, bottom:8, left:8, right:8 }}
              >
                <Text style={[s.bkmkIcon, bookmarked && s.bkmkActive]}>
                  {bookmarked ? '🔖' : '🏷️'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={s.text} numberOfLines={compact ? 2 : 4}>
          "{verse_text}"
        </Text>
        {!compact && note ? (
          <Text style={s.note} numberOfLines={1}>{note}</Text>
        ) : null}
        <View style={s.footer}>
          <View style={s.tags}>
            {tags.slice(0, 3).map(t => (
              <View key={t} style={s.tag}>
                <Text style={s.tagText}>{t.toUpperCase()}</Text>
              </View>
            ))}
          </View>
          {savedAt && <Text style={s.date}>{savedAt}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:          { backgroundColor:T.surface, borderWidth:0.5, borderColor:T.border, borderRadius:4, marginBottom:10, overflow:'hidden', flexDirection:'row' },
  cardCompact:   { marginBottom:7 },
  topBar:        { position:'absolute', top:0, left:0, right:0, height:2.5, backgroundColor:T.red, zIndex:1 },
  accent:        { width:3, backgroundColor:T.red },
  body:          { flex:1, padding:14 },
  head:          { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:9 },
  ref:           { fontFamily:FONTS.display, fontSize:18, color:T.cream, letterSpacing:0.5, flex:1 },
  headRight:     { flexDirection:'row', alignItems:'center', gap:8 },
  transBadge:    { backgroundColor:T.surfaceEl, paddingHorizontal:7, paddingVertical:2, borderRadius:2 },
  transBadgeText:{ fontSize:10, color:T.creamMute, letterSpacing:0.8, fontFamily:FONTS.body },
  bkmkIcon:      { fontSize:16, color:T.creamMute },
  bkmkActive:    { color:T.red },
  text:          { fontFamily:FONTS.serif, fontStyle:'italic', fontSize:15, color:T.cream, lineHeight:25, marginBottom:8 },
  note:          { fontSize:11, color:T.creamDim, fontStyle:'italic', borderLeftWidth:2, borderLeftColor:T.borderMd, paddingLeft:8, marginBottom:8, lineHeight:16 },
  footer:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  tags:          { flexDirection:'row', gap:5, flex:1, flexWrap:'wrap' },
  tag:           { borderWidth:0.5, borderColor:T.borderMd, borderRadius:2, paddingHorizontal:7, paddingVertical:2 },
  tagText:       { fontSize:9, color:T.creamDim, letterSpacing:0.6, fontFamily:FONTS.body },
  date:          { fontSize:10, color:T.creamMute, fontFamily:FONTS.body },
});
