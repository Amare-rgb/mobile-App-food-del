import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import { CURRENCY } from '../utils/format'; // ✅ single source of truth

type Props = NativeStackScreenProps<any>;

const BG_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';

const OnboardingScreen = ({ navigation }: Props) => {
  const { width, height } = useWindowDimensions();
  const [bgError, setBgError] = useState(false);

  return (
    <View style={styles.container}>
      {/* Background Image — falls back to solid color if load fails */}
      {!bgError && (
        <Image
          source={{ uri: BG_IMAGE }}
          style={[styles.image, { width, height }]}
          resizeMode="cover"
          onError={() => setBgError(true)}
        />
      )}

      {/* Dark Overlay for readability */}
      <View style={styles.overlay} />

      {/* Safe Area ensures content doesn't overlap with notches/status bars */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <Text style={styles.headerText}>FOODIE</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* --- MAIN CONTENT (Centered) --- */}
        <View style={styles.content}>
          <Text style={styles.title}>
            Delicious Food{'\n'}Delivered Fast
          </Text>

          <Text style={styles.subtitle}>
            Get your favorite meals delivered to your doorstep in minutes.
            Pay in Ethiopian Birr ({CURRENCY}) — cash or mobile money.
          </Text>

          {/* Currency badge — reads from format.ts */}
          <View style={styles.etbBadge}>
            <Text style={styles.etbBadgeText}>🇪🇹 Prices in {CURRENCY}</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>

        {/* --- FOOTER --- */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text
              style={styles.linkText}
              onPress={() => navigation.navigate('Login')}
            >
              Log In
            </Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
  },
  headerText: {
    ...FONTS.h3,
    color: COLORS.white,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  skipText: {
    ...FONTS.body,
    color: COLORS.white,
    opacity: 0.8,
  },
  // --- Content ---
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
  },
  title: {
    ...FONTS.h1,
    color: COLORS.white,
    fontSize: 36,
    marginBottom: SIZES.md,
    textAlign: 'center',
    lineHeight: 42,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.white,
    opacity: 0.85,
    marginBottom: SIZES.md,
    textAlign: 'center',
    paddingHorizontal: SIZES.md,
  },
  // --- ETB badge ---
  etbBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    paddingHorizontal: SIZES.md,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: SIZES.lg,
  },
  etbBadgeText: {
    ...FONTS.small,
    color: COLORS.white,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // --- Button ---
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginTop: SIZES.sm,
  },
  buttonText: {
    ...FONTS.h4,
    color: COLORS.white,
    fontWeight: '600',
  },
  // --- Footer ---
  footer: {
    paddingBottom: SIZES.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    ...FONTS.body,
    color: COLORS.white,
    opacity: 0.7,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;