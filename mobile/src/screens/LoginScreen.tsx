import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';

// ✅ Simple email regex — catches obvious typos before hitting the server
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, register } = useApp();

  // ═══════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════
  const handleSubmit = async () => {
    // ─── Validate ───
    if (!email.trim() || !password) {
      return Alert.alert('Error', 'Please fill email and password');
    }
    if (!EMAIL_RE.test(email.trim())) {
      return Alert.alert('Error', 'Please enter a valid email address');
    }
    if (!isLogin && !name.trim()) {
      return Alert.alert('Error', 'Please enter your full name');
    }
    if (password.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      let loggedInUser;

      if (isLogin) {
        console.log('🔐 Attempting login for:', email);
        loggedInUser = await login(email.trim().toLowerCase(), password);
      } else {
        console.log('📝 Attempting register for:', email);
        loggedInUser = await register(
          name.trim(),
          email.trim().toLowerCase(),
          password,
          phone.trim() || undefined
        );
      }

      console.log('✅ Auth success:', loggedInUser);

      // ✅ Normalize role — backend sends lowercase, but be safe
      const role = (loggedInUser.role || '').toLowerCase();
      const isAdmin = role === 'admin';
      const isCourier = role === 'courier';

      Alert.alert(
        isAdmin ? 'Welcome Admin 👑' : isCourier ? 'Welcome Courier 🛵' : 'Welcome 👋',
        `Signed in as ${loggedInUser.name}\nRole: ${role || 'customer'}`
      );
      // ✅ No manual navigation — AppNavigator re-renders on `user` change
    } catch (err: any) {
      console.error('❌ Auth Error:', err);
      console.error('❌ Response:', err?.response?.data);
      console.error('❌ Status:', err?.response?.status);

      let message = 'Something went wrong. Please try again.';

      if (err?.response) {
        message =
          err.response.data?.message ||
          err.response.data?.error ||
          `Server error (${err.response.status})`;
      } else if (err?.request) {
        message =
          'Cannot reach the server.\n\n' +
          '1. Is your backend running?\n' +
          '2. Is API_URL correct in utils/api.ts?';
      } else {
        message = err?.message || message;
      }

      Alert.alert(isLogin ? 'Login Failed' : 'Signup Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ Logo with graceful fallback */}
          <Image
            source={require('../public/logo.jpeg')}
            style={styles.logoImage}
            resizeMode="contain"
            // If the file is missing, Metro crashes — see note below
          />

          <Text style={styles.title}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to continue' : 'Sign up to get started'}
          </Text>

          {/* Name (register only) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholderTextColor={COLORS.gray}
                editable={!loading}
              />
            </View>
          )}

          {/* Phone (register only) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={COLORS.gray} />
              <TextInput
                style={styles.input}
                placeholder="Phone (optional)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.gray}
                editable={!loading}
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={COLORS.gray}
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={COLORS.gray}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.gray}
              />
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Login / Register */}
          <TouchableOpacity
            onPress={() => {
              setIsLogin(!isLogin);
              setName('');
              setPhone('');
            }}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? "Don't have an account? "
                : 'Already have an account? '}
              <Text style={styles.switchLink}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, backgroundColor: COLORS.white },
  content: {
    flexGrow: 1,
    padding: SIZES.lg,
    justifyContent: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: SIZES.md,
    borderRadius: 60,
  },
  title: {
    ...FONTS.h1,
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.md,
    height: 55,
  },
  input: {
    flex: 1,
    marginLeft: SIZES.sm,
    ...FONTS.body,
    color: COLORS.dark,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.md,
    marginBottom: SIZES.md,
    height: 52,
  },
  buttonText: { ...FONTS.h4, color: COLORS.white },
  switchText: { ...FONTS.body, color: COLORS.gray, textAlign: 'center' },
  switchLink: { color: COLORS.primary, fontWeight: '600' },
});

export default LoginScreen;