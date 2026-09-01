// ─── RedButton.tsx ────────────────────────────────────────
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { T, FONTS } from '../constants/theme';

type Props = {
  label:     string;
  onPress:   () => void;
  loading?:  boolean;
  disabled?: boolean;
  outline?:  boolean;
  small?:    boolean;
  full?:     boolean;
  style?:    ViewStyle;
};

export function RedButton({ label, onPress, loading, disabled, outline, small, full, style }: Props) {
  return (
    <TouchableOpacity
      style={[s.btn, outline && s.outline, small && s.small, full && s.full, (disabled||loading) && s.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color={outline ? T.red : T.white} />
        : <Text style={[s.label, outline && s.labelOutline, small && s.labelSmall]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn:          { backgroundColor:T.red, borderRadius:3, paddingVertical:14, paddingHorizontal:20, alignItems:'center', borderWidth:1.5, borderColor:T.red },
  outline:      { backgroundColor:'transparent' },
  small:        { paddingVertical:8, paddingHorizontal:14 },
  full:         { width:'100%' },
  disabled:     { opacity:0.45 },
  label:        { color:T.white, fontSize:13, fontFamily:FONTS.bodyBold, fontWeight:'700', letterSpacing:1, textTransform:'uppercase' },
  labelOutline: { color:T.red },
  labelSmall:   { fontSize:11 },
});
