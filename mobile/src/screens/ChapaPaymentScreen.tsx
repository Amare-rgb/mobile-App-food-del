import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../utils/api';
import { useApp } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';

const RETURN_PATH = '/payments/chapa/return';

const ChapaPaymentScreen = ({ route, navigation }: any) => {
  const { orderId, total } = route.params;
  const { clearCart } = useApp();

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Guard: prevent duplicate verify calls when WebView fires multiple nav events
  const verifyStartedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const goHome = () => {
    if (!mountedRef.current) return;
    navigation.reset({
      index: 0,
      routes: [{ name: 'CustomerTabs', params: { screen: 'Home' } }],
    });
  };

  // ── 1) Initialize payment ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res: any = await apiClient.post<any>(
          '/payments/chapa/initialize',
          { orderId }
        );
        if (cancelled) return;

        const body = res?.data ?? res;
        if (!body?.checkoutUrl || !body?.txRef) {
          throw new Error(body?.message || 'Invalid response from server');
        }

        setCheckoutUrl(body.checkoutUrl);
        setTxRef(body.txRef);
      } catch (err: any) {
        if (cancelled) return;
        Alert.alert(
          'Payment Error',
          err?.response?.data?.message ||
            err?.message ||
            'Could not start payment',
          [{ text: 'OK', onPress: goHome }]
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // ── 2) Verify after the user returns from Chapa ───────────────────
  const verify = async (ref: string) => {
    if (verifyStartedRef.current) return;
    verifyStartedRef.current = true;

    setVerifying(true);
    try {
      const res: any = await apiClient.get<any>(
        `/payments/chapa/verify/${encodeURIComponent(ref)}`
      );
      const body = res?.data ?? res;

      if (body?.paid) {
        try {
          await clearCart();
        } catch {}
        navigation.replace('OrderSuccess', { orderId, total });
        return;
      }

      // Not paid → let the user retry or leave
      verifyStartedRef.current = false;
      setVerifying(false);
      Alert.alert(
        'Payment Not Completed',
        `We could not confirm your payment (${body?.reason || 'pending'
        }). Your order is saved as unpaid.`,
        [{ text: 'OK', onPress: goHome }]
      );
    } catch (err: any) {
      verifyStartedRef.current = false;
      setVerifying(false);
      Alert.alert(
        'Error',
        err?.response?.data?.message ||
          'Could not verify payment. Check your orders later.',
        [{ text: 'OK', onPress: goHome }]
      );
    }
  };

  // ── 3) Detect the return URL in the WebView ───────────────────────
  const onNavChange = (nav: WebViewNavigation) => {
    if (!txRef) return;
    // Match either our return path OR Chapa's own callback/return URLs
    const hitReturn =
      nav.url.includes(RETURN_PATH) ||
      nav.url.includes('tx_ref=') ||
      nav.url.includes('/return');
    if (hitReturn && !verifyStartedRef.current) {
      verify(txRef);
    }
  };

  const handleClose = () => {
    Alert.alert(
      'Cancel Payment?',
      'Your order is saved but not paid yet.',
      [
        { text: 'Keep Paying', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: goHome },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.title}>Pay with Chapa</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading || verifying ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.msg}>
            {verifying ? 'Confirming payment...' : 'Starting payment...'}
          </Text>
        </View>
      ) : checkoutUrl ? (
        <WebView
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={onNavChange}
          // 👇 also catch the return URL on Android via shouldOverrideUrlLoading
          onShouldStartLoadWithRequest={(req) => {
            if (txRef && req.url.includes(RETURN_PATH)) {
              verify(txRef);
              return false; // don't load the tiny HTML page
            }
            return true;
          }}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          // WebView on Android sometimes needs this to allow redirects
          mixedContentMode="always"
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
          // Handles window.open / target=_blank from Chapa's page
          setSupportMultipleWindows={false}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { ...FONTS.h4, color: COLORS.dark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  msg: { ...FONTS.body, color: COLORS.gray, marginTop: SIZES.sm },
});

export default ChapaPaymentScreen;