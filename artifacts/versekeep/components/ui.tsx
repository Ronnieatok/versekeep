// ─── EmptyState.tsx ──────────────────────────────────────
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { T, FONTS } from '../constants/theme';

type EmptyStateProps = {
  icon:         string;
  title:        string;
  subtitle:     string;
  actionLabel?: string;
  onAction?:    () => void;
};

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={e.root}>
      <Text style={e.icon}>{icon}</Text>
      <Text style={e.title}>{title}</Text>
      <Text style={e.sub}>{subtitle}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={e.btn} onPress={onAction} activeOpacity={0.85}>
          <Text style={e.btnText}>{actionLabel.toUpperCase()}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const e = StyleSheet.create({
  root:   { flex:1, alignItems:'center', justifyContent:'center', padding:40, gap:12 },
  icon:   { fontSize:42, marginBottom:4 },
  title:  { fontFamily:FONTS.display, fontSize:22, color:T.cream, letterSpacing:1.5, textAlign:'center' },
  sub:    { fontSize:13, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'300', textAlign:'center', lineHeight:20 },
  btn:    { marginTop:8, backgroundColor:T.red, borderRadius:3, paddingVertical:12, paddingHorizontal:24 },
  btnText:{ color:T.white, fontSize:12, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:1 },
});


type SectionHeaderProps = {
  title:        string;
  actionLabel?: string;
  onAction?:    () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={h.row}>
      <Text style={h.title}>{title.toUpperCase()}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
          <Text style={h.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const h = StyleSheet.create({
  row:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  title:  { fontSize:10, color:T.creamMute, letterSpacing:1.2, fontWeight:'700', fontFamily:FONTS.body },
  action: { fontSize:10, color:T.red, letterSpacing:0.8, fontWeight:'700', fontFamily:FONTS.body, textTransform:'uppercase' },
});


type TagPillProps = {
  label:    string;
  active?:  boolean;
  onPress?: () => void;
};

export function TagPill({ label, active, onPress }: TagPillProps) {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[p.tag, active && p.tagActive]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[p.text, active && p.textActive]}>{label.toUpperCase()}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={[p.tag, active && p.tagActive]}>
      <Text style={[p.text, active && p.textActive]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const p = StyleSheet.create({
  tag:        { borderWidth:0.5, borderColor:T.borderMd, borderRadius:2, paddingHorizontal:9, paddingVertical:3 },
  tagActive:  { borderColor:T.redBorder, backgroundColor:T.redFaint },
  text:       { fontSize:10, color:T.creamDim, letterSpacing:0.7, fontFamily:FONTS.body, fontWeight:'600' },
  textActive: { color:T.red },
});
