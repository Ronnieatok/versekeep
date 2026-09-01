import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { T, FONTS } from '../../constants/theme';

export default function AuthScreen() {
  const [mode,     setMode]     = useState<'login' | 'signup'>('login');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    setName(''); setEmail(''); setPassword('');
  };

  const handleSubmit = async () => {
    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Missing name', 'Please enter your full name.'); return;
    }
    if (!email.includes('@')) {
      Alert.alert('Invalid email', 'Enter a valid email address.'); return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.'); return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        Alert.alert('Check your email', 'We sent a confirmation link to ' + email);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Red top bar */}
      <View style={styles.topBar} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Brand hero */}
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <Text style={styles.brandRed}>VERSE</Text>
            <Text style={styles.brandWhite}>KEEP</Text>
          </View>
          <Text style={styles.brandSub}>YOUR PERSONAL SCRIPTURE JOURNAL</Text>

          <View style={styles.quoteBlock}>
            <Text style={styles.quoteText}>
              "Thy word is a lamp unto my feet, and a light unto my path."
            </Text>
            <Text style={styles.quoteRef}>PSALM 119:105 · KJV</Text>
          </View>
        </View>

        {/* Form area */}
        <View style={styles.form}>

          {/* Mode toggle */}
          <View style={styles.toggle}>
            {(['login', 'signup'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                onPress={() => switchMode(m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleLabel, mode === m && styles.toggleLabelActive]}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={T.creamMute}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={T.creamMute}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={T.creamMute}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          <TouchableOpacity
            style={[styles.redBtn, loading && styles.redBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.redBtnLabel}>
                  {mode === 'login' ? 'Sign In' : 'Create My Account'}
                </Text>
            }
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === 'login' ? "No account? " : "Have one? "}
            </Text>
            <TouchableOpacity onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={styles.switchLink}>
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.8}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleLabel}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:             { flex:1, backgroundColor:T.black },
  topBar:           { height:3, backgroundColor:T.red },
  scroll:           { flexGrow:1 },
  hero:             { backgroundColor:T.surface, paddingHorizontal:28, paddingTop:40, paddingBottom:28, borderBottomWidth:0.5, borderBottomColor:T.border },
  brandRow:         { flexDirection:'row', alignItems:'flex-end', gap:6, marginBottom:6 },
  brandRed:         { fontFamily:FONTS.display, fontSize:56, color:T.red, lineHeight:60 },
  brandWhite:       { fontFamily:FONTS.display, fontSize:56, color:T.cream, lineHeight:60 },
  brandSub:         { color:T.creamDim, fontSize:11, letterSpacing:1.2, marginBottom:24, fontFamily:FONTS.body },
  quoteBlock:       { borderLeftWidth:3, borderLeftColor:T.red, paddingLeft:14 },
  quoteText:        { fontFamily:FONTS.serif, fontStyle:'italic', fontSize:15, color:T.cream, lineHeight:26, marginBottom:6 },
  quoteRef:         { fontSize:10, color:T.creamDim, letterSpacing:1, fontFamily:FONTS.body },
  form:             { padding:22, paddingTop:26 },
  toggle:           { flexDirection:'row', backgroundColor:T.surfaceEl, borderRadius:4, padding:3, marginBottom:22 },
  toggleBtn:        { flex:1, paddingVertical:10, borderRadius:3, alignItems:'center' },
  toggleBtnActive:  { backgroundColor:T.red },
  toggleLabel:      { fontSize:11, color:T.creamDim, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:0.8, textTransform:'uppercase' },
  toggleLabelActive:{ color:T.white },
  input:            { backgroundColor:T.surfaceEl, borderWidth:0.5, borderColor:T.borderMd, borderRadius:3, paddingHorizontal:14, paddingVertical:13, fontSize:14, color:T.cream, fontFamily:FONTS.body, marginBottom:11 },
  redBtn:           { backgroundColor:T.red, borderRadius:3, paddingVertical:14, alignItems:'center', marginBottom:14 },
  redBtnDisabled:   { opacity:0.6 },
  redBtnLabel:      { color:T.white, fontSize:13, fontFamily:FONTS.body, fontWeight:'700', letterSpacing:1, textTransform:'uppercase' },
  switchRow:        { flexDirection:'row', justifyContent:'center', marginBottom:20 },
  switchText:       { fontSize:12, color:T.creamMute, fontFamily:FONTS.body },
  switchLink:       { fontSize:12, color:T.red, fontFamily:FONTS.body, fontWeight:'700', textDecorationLine:'underline' },
  divider:          { flexDirection:'row', alignItems:'center', gap:10, marginBottom:18 },
  dividerLine:      { flex:1, height:0.5, backgroundColor:T.border },
  dividerText:      { fontSize:10, color:T.creamMute, letterSpacing:1, fontFamily:FONTS.body },
  googleBtn:        { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, borderWidth:0.5, borderColor:T.borderMd, borderRadius:3, paddingVertical:13 },
  googleG:          { fontSize:16, fontWeight:'700', color:'#4285F4', fontFamily:FONTS.body },
  googleLabel:      { fontSize:13, color:T.cream, fontFamily:FONTS.body, fontWeight:'500' },
});
