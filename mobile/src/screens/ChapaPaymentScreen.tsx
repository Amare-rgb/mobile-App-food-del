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

// ⏱ 50 seconds so the user can read the receipt
const SUCCESS_DELAY_MS = 50000; 

type VerifyDetails = {
  txRef: string;
  orderId: string;
  amount: number;
  currency: string;
  method: string;
  paidAt: string | null;
};

const ChapaPaymentScreen = ({ route, navigation }: any) => {
  const { orderId, total } = route.params;
  const { clearCart } = useApp();

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [delaying, setDelaying] = useState(false);

  const verifyStartedRef = useRef(false);
  const verifyDoneRef = useRef(false);
  const mountedRef = useRef(true);
  const webViewRef = useRef<WebView>(null);
  
  // ✅ FIX: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const goHome = () => {
    if (!mountedRef.current) return;
    navigation.reset({
      index: 0,
      routes: [{ name: 'CustomerTabs', params: { screen: 'Home' } }],
    });
  };

  const goToOrderSuccess = (details: VerifyDetails) => {
    if (!mountedRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current); // Cancel the 50s timer
    navigation.replace('OrderSuccess', {
      orderId: details.orderId,
      total: details.amount,
      txRef: details.txRef,
      method: details.method,
      paidAt: details.paidAt,
    });
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res: any = await apiClient.post<any>(
          '/payments/chapa/initialize',
          { orderId }
        );
        if (cancelled) return;

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
          err?.response?.data?.message || err?.message || 'Could not start payment',
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

  const verify = async (ref: string) => {
    if (verifyStartedRef.current || verifyDoneRef.current) return;
    verifyStartedRef.current = true;

    setVerifying(true);
    try {
      const res: any = await apiClient.get<any>(
        `/payments/chapa/verify/${encodeURIComponent(ref)}`
      );
      const body = res ?? {};

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

        const d: VerifyDetails = {
          txRef: body?.details?.txRef || ref,
          orderId: body?.details?.orderId || orderId,
          amount:
            typeof body?.details?.amount === 'number'
              ? body.details.amount
              : total ?? 0,
          currency: body?.details?.currency || 'ETB',
          method: body?.details?.method || 'chapa',
          paidAt: body?.details?.paidAt || new Date().toISOString(),
        };

        setDelaying(true);
        setVerifying(false);

        // ✅ Start the 50-second timer
        timeoutRef.current = setTimeout(() => {
          goToOrderSuccess(d);
        }, SUCCESS_DELAY_MS);
        
        return;
      }

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

  const isReturnUrl = (url: string, ref: string | null): boolean => {
    if (!url) return false;
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
    if (verifyDoneRef.current) return; 
    Alert.alert(
      'Cancel Payment?',
      'Your order is saved but not paid yet.',
      [
        { text: 'Keep Paying', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: goHome },
      ]
    );
  };

  const manualDetails: VerifyDetails = {
    txRef: txRef || '',
    orderId,
    amount: total,
    currency: 'ETB',
    method: 'chapa',
    paidAt: new Date().toISOString(),
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

      {checkoutUrl ? (
        <View style={{ flex: 1 }}>
          <WebView
            ref={webViewRef}
            source={{ uri: checkoutUrl }}
            onNavigationStateChange={onNavChange}
            onShouldStartLoadWithRequest={(req) => {
              if (txRef && isReturnUrl(req.url, txRef)) {
                verify(txRef);
                return false;
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
            allowsBackForwardNavigationGestures={false}
          />
        </View>
      ) : null}

      {(loading || verifying) && (
        <View style={styles.absoluteOverlay} pointerEvents="auto">
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.msg}>
              {verifying ? 'Confirming payment...' : 'Starting payment...'}
            </Text>
          </View>
        </View>
      )}

      {delaying && (
        <View style={styles.successBanner}>
          <View style={styles.successBannerInner}>
            <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
            <Text style={styles.successBannerText}>
              Payment successful
            </Text>
            <TouchableOpacity 
              style={styles.continueBtn}
              onPress={() => goToOrderSuccess(manualDetails)}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  absoluteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCard: {
    backgroundColor: COLORS.white,
    padding: SIZES.lg,
    borderRadius: SIZES.radius * 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  msg: { ...FONTS.body, color: COLORS.gray, marginTop: SIZES.sm },
  successBanner: {
    position: 'absolute',
    bottom: SIZES.lg,
    left: SIZES.md,
    right: SIZES.md,
  },
  successBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  successBannerText: {
    ...FONTS.body,
    color: '#166534',
    fontWeight: '600',
    marginLeft: SIZES.sm,
    flex: 1,
  },
  continueBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: SIZES.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  continueBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  }
});

export default ChapaPaymentScreen;