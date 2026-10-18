import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { COLORS, SIZES, FONTS } from '../utils/theme';
import api, { apiClient } from '../utils/api'; // ✅ Import default `api` for FormData

const EditProfileScreen = ({ navigation }: any) => {
  // ✅ FIXED: Use refreshUser instead of updateUserInContext
  const { user, refreshUser } = useApp(); 

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [loading, setLoading] = useState(false);

  // ─── Pick Image ───
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  // ─── Save Profile ───
  const handleSave = async () => {
    if (!name.trim()) {
      return Alert.alert('Error', 'Name cannot be empty');
    }

    setLoading(true);
    try {
      let finalAvatarUrl = avatar;

      // 1. Upload Avatar (if a new image was picked)
      if (avatar && avatar !== user?.avatar) {
        const formData = new FormData();
        formData.append('image', {
          uri: avatar,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);

        // ✅ FIXED: Use raw `api` instance for multipart/form-data
        const uploadRes = await api.post('/auth/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalAvatarUrl = uploadRes.data.url; 
      }

      // 2. Update Profile Data (Name, Phone, Avatar)
      await apiClient.put('/auth/profile', {
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatar: finalAvatarUrl || undefined,
      });

      // 3. Refresh the user in AppContext so the UI updates instantly
      // ✅ FIXED: Call refreshUser() to sync with the backend
      await refreshUser();

      Alert.alert('Success ✅', 'Profile updated successfully!');
      navigation.goBack();

    } catch (err: any) {
      console.error('Update Profile Error:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          {/* ─── Avatar ─── */}
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera" size={30} color={COLORS.white} />
              </View>
            )}
            <View style={styles.editIcon}>
              <Ionicons name="pencil" size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Photo</Text>

          {/* ─── Form ─── */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={COLORS.gray}
            editable={!loading}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+251 912 345 678"
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.gray}
            editable={!loading}
          />

          <Text style={styles.label}>Email (Cannot be changed)</Text>
          <View style={[styles.input, styles.disabledInput]}>
            <Text style={{ color: COLORS.gray }}>{user?.email}</Text>
          </View>

          {/* ─── Save Button ─── */}
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { ...FONTS.h3, color: COLORS.dark },
  content: { padding: SIZES.lg },
  
  // Avatar
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: SIZES.sm,
    position: 'relative',
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center',
  },
  editIcon: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: COLORS.primary,
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  changePhotoText: {
    ...FONTS.small, color: COLORS.primary, 
    textAlign: 'center', marginBottom: SIZES.xl
  },

  // Form
  label: { ...FONTS.small, color: COLORS.gray, marginBottom: 6, marginTop: SIZES.md },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    height: 50,
    ...FONTS.body,
    color: COLORS.dark,
  },
  disabledInput: {
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: SIZES.xl,
  },
  saveBtnText: { ...FONTS.h4, color: COLORS.white },
});

export default EditProfileScreen;