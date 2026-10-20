import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
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

  // ✅ Guards
  const verifyStartedRef = useRef(false);   // prevent duplicate verify
  const verifyDoneRef = useRef(false);      // once verified, ignore WebView
  const mountedRef = useRef(true);
  const webViewRef = useRef<WebView>(null);

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

        // ✅ apiClient already unwraps r.data, so `res` IS the body
        const body = res;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // ── 2) Verify after the user returns from Chapa ───────────────────
  const verify = async (ref: string) => {
    // ✅ Hard guard: never verify twice or after success
    if (verifyStartedRef.current || verifyDoneRef.current) return;
    verifyStartedRef.current = true;

    setVerifying(true);
    try {
      const res: any = await apiClient.get<any>(
        `/payments/chapa/verify/${encodeURIComponent(ref)}`
      );
      const body = res ?? {}; // apiClient already unwrapped

      // ✅ Accept any truthy form of `paid`
      const isPaid =
        body?.paid === true ||
        body?.paid === 'true' ||
        body?.paymentStatus === 'paid' ||
        body?.status === 'success';

      if (isPaid) {
        verifyDoneRef.current = true;
        try {
          await clearCart();
        } catch {}
        navigation.replace('OrderSuccess', { orderId, total });
        return;
      }

      // Not paid → allow retry
      verifyStartedRef.current = false;
      setVerifying(false);
      Alert.alert(
        'Payment Not Completed',
        `We could not confirm your payment (${
          body?.reason || 'pending'
        }). Your order is saved as unpaid.`,
        [{ text: 'OK', onPress: goHome }]
      );
    } catch (err: any) {
      verifyStartedRef.current = false;
      setVerifying(false);
      Alert.alert(
        'Error',
        err?.response?.data?.message ||
          err?.message ||
          'Could not verify payment. Check your orders later.',
        [{ text: 'OK', onPress: goHome }]
      );
    }
  };

  // ── 3) Detect the return URL ───────────────────────────────────────
  const isReturnUrl = (url: string, ref: string | null): boolean => {
    if (!url) return false;
    // ✅ Must contain our specific return path OR our txRef in the query
    if (url.includes(RETURN_PATH)) return true;
    if (ref && url.includes(`tx_ref=${ref}`)) return true;
    return false;
  };

  const onNavChange = (nav: WebViewNavigation) => {
    if (!txRef || verifyDoneRef.current) return;
    if (isReturnUrl(nav.url, txRef)) {
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
          ref={webViewRef}
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={onNavChange}
          onShouldStartLoadWithRequest={(req) => {
            // ✅ Use the same strict return-url check
            if (txRef && isReturnUrl(req.url, txRef)) {
              verify(txRef);
              return false; // don't load the tiny HTML page
            }
            return true;
          }}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          mixedContentMode="always"
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
          setSupportMultipleWindows={false}
          // ✅ Android back button handled by SafeAreaView
          allowsBackForwardNavigationGestures={false}
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