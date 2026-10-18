import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';

const ProfileScreen = ({ navigation }: any) => {
  const { user, logout, orders, favorites } = useApp();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // ✅ FULLY LINKED: Navigates to the EditProfile screen
  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleDeliveryAddress = () => {
    Alert.alert(
      'Delivery Address',
      'Your current default address is:\n\nBole, Addis Ababa\nPhone: +251 912 345 678'
    );
  };

  const handlePaymentMethods = () => {
    Alert.alert(
      'Payment Methods',
      'Accepted Payment Methods:\n\n• Cash on Delivery\n• Telebirr\n• CBE Birr'
    );
  };

  const handleNotifications = () => {
    Alert.alert(
      'Notifications',
      'Push notifications are currently ENABLED for order updates and promotions.'
    );
  };

  const handleHelpSupport = () => {
    Alert.alert(
      'Help & Support',
      'Need help? Contact us:\n\n📞 +251 900 000 000\n✉️ support@fooddelivery.et'
    );
  };

  const MenuItem = ({ icon, label, onPress, danger }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, danger && { backgroundColor: '#FFEBEE' }]}>
        <Ionicons name={icon} size={20} color={danger ? COLORS.danger : COLORS.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: COLORS.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            {/* ✅ FIXED: Show the image if the user has one, otherwise show the initial letter */}
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>

          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statBox} 
              onPress={() => navigation.navigate('Orders')}
            >
              <Text style={styles.statValue}>{orders.length}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statBox, { borderRightWidth: 0 }]} 
              onPress={() => navigation.navigate('Favorites')}
            >
              <Text style={styles.statValue}>{favorites.length}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Account Settings ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem 
            icon="person-outline" 
            label="Edit Profile" 
            onPress={handleEditProfile} 
          />
          <MenuItem 
            icon="location-outline" 
            label="Delivery Address" 
            onPress={handleDeliveryAddress} 
          />
          <MenuItem 
            icon="heart-outline" 
            label="Favorites" 
            onPress={() => navigation.navigate('Favorites')} 
          />
          <MenuItem 
            icon="receipt-outline" 
            label="Order History" 
            onPress={() => navigation.navigate('Orders')} 
          />
        </View>

        {/* ─── General Settings ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <MenuItem 
            icon="card-outline" 
            label="Payment Methods" 
            onPress={handlePaymentMethods} 
          />
          <MenuItem 
            icon="notifications-outline" 
            label="Notifications" 
            onPress={handleNotifications} 
          />
          <MenuItem 
            icon="help-circle-outline" 
            label="Help & Support" 
            onPress={handleHelpSupport} 
          />
          <MenuItem 
            icon="log-out-outline" 
            label="Logout" 
            onPress={handleLogout} 
            danger 
          />
        </View>
        
        <View style={{ height: SIZES.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  header: {
    backgroundColor: COLORS.white, 
    alignItems: 'center',
    paddingVertical: SIZES.xl, 
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24,
  },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SIZES.md,
    overflow: 'hidden', // ✅ Added to ensure image stays in circle
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarText: { fontSize: 36, color: COLORS.white, fontWeight: '700' },
  name: { ...FONTS.h3, marginBottom: 4 },
  email: { ...FONTS.body, color: COLORS.gray, marginBottom: SIZES.lg },
  statsRow: { flexDirection: 'row', marginTop: SIZES.sm },
  statBox: {
    alignItems: 'center', 
    paddingHorizontal: SIZES.xl,
    borderRightWidth: 1, 
    borderRightColor: COLORS.border,
  },
  statValue: { ...FONTS.h3, color: COLORS.primary },
  statLabel: { ...FONTS.small, color: COLORS.gray, marginTop: 4 },
  section: { 
    backgroundColor: COLORS.white, 
    margin: SIZES.md, 
    borderRadius: SIZES.radius, 
    padding: SIZES.sm 
  },
  sectionTitle: { 
    ...FONTS.small, 
    color: COLORS.gray, 
    marginLeft: SIZES.sm, 
    marginTop: SIZES.sm, 
    marginBottom: SIZES.sm, 
    textTransform: 'uppercase' 
  },
  menuItem: {
    flexDirection: 'row', 
    alignItems: 'center',
    padding: SIZES.md,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF5F1',
    justifyContent: 'center', alignItems: 'center', marginRight: SIZES.md,
  },
  menuLabel: { flex: 1, ...FONTS.body, fontWeight: '500' },
});

export default ProfileScreen;