import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/auth.service';
import { COLORS, SIZES, FONTS } from '../../utils/theme';

const AdminSettingsScreen = ({ navigation }: any) => {
  const { user, logout } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load current values
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatar((user as any).avatar || '');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        setAvatar((user as any).avatar || '');
      }
    }, [user])
  );

  // ─── Avatar upload ───
  const pickAvatar = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const file = result.assets[0];
      if (file.size && file.size > 5 * 1024 * 1024) {
        return Alert.alert('File too large', 'Please pick an image under 5MB.');
      }

      setUploading(true);
      const formData = new FormData();
      formData.append('image', {
        uri: file.uri,
        name: file.name || `avatar-${Date.now()}.jpg`,
        type: file.mimeType || 'image/jpeg',
      } as any);

      const res = await authService.uploadAvatar(formData);
      if (res?.url) {
        setAvatar(res.url);
        Alert.alert('Uploaded', 'Logo updated — tap Save to apply.');
      }
    } catch (err: any) {
      Alert.alert(
        'Upload failed',
        err?.response?.data?.message || err?.message || 'Could not upload'
      );
    } finally {
      setUploading(false);
    }
  };

  // ─── Save profile ───
  const saveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      return Alert.alert('Error', 'Name and email are required');
    }
    setSavingProfile(true);
    try {
      await authService.updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar,
      });
      Alert.alert('Saved', 'Profile updated successfully');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Save failed'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Change password ───
  const savePassword = async () => {
    if (!currentPassword || !newPassword) {
      return Alert.alert('Error', 'Fill both password fields');
    }
    if (newPassword.length < 6) {
      return Alert.alert('Error', 'New password must be 6+ characters');
    }
    setSavingPassword(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Saved', 'Password updated successfully');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to change password'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: SIZES.md }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.openDrawer?.()}>
              <Ionicons name="menu" size={26} color={COLORS.dark} />
            </TouchableOpacity>
            <Text style={styles.title}>Settings</Text>
            <View style={{ width: 26 }} />
          </View>

          {/* ─── LOGO / AVATAR ─── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Logo / Avatar</Text>
            <View style={styles.avatarRow}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={40} color={COLORS.gray} />
                </View>
              )}
              <TouchableOpacity
                style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
                onPress={pickAvatar}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.uploadBtnText}>📁 Change Logo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── PROFILE ─── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Profile</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+251 ..."
              placeholderTextColor={COLORS.gray}
            />

            <TouchableOpacity
              style={[styles.saveBtn, savingProfile && { opacity: 0.6 }]}
              onPress={saveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save Profile</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ─── PASSWORD ─── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Change Password</Text>

            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="••••••"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="••••••"
              placeholderTextColor={COLORS.gray}
            />

            <TouchableOpacity
              style={[styles.saveBtn, savingPassword && { opacity: 0.6 }]}
              onPress={savePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ─── LOGOUT ─── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <View style={{ height: SIZES.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  title: { ...FONTS.h3, color: COLORS.dark },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.dark,
    marginBottom: SIZES.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.lightGray,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtn: {
    marginLeft: SIZES.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
  },
  uploadBtnText: { ...FONTS.small, color: COLORS.white, fontWeight: '600' },
  label: {
    ...FONTS.small,
    color: COLORS.gray,
    marginTop: SIZES.sm,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    height: 48,
    ...FONTS.body,
    color: COLORS.dark,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: SIZES.md,
  },
  saveBtnText: { ...FONTS.h4, color: COLORS.white },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  logoutText: {
    ...FONTS.h4,
    color: COLORS.danger,
    marginLeft: SIZES.sm,
  },
});

export default AdminSettingsScreen;