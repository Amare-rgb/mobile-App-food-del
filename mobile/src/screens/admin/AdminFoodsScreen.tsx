import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { adminService } from "../../services/admin.service";
import api from "../../utils/api";
import { COLORS, SIZES, FONTS } from "../../utils/theme";
import { formatPrice } from "../../utils/format";

const emptyForm = {
  name: "",
  description: "",
  price: 0,
  imageUrl: "",       
  imagePublicId: "",  
  categoryId: "",
  category: "",
  rating: 4.5,
  isPopular: false,
  isAvailable: true,
};

const getId = (obj: any): string => obj?.id || obj?._id || "";

const AdminFoodsScreen = ({ navigation }: any) => {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  const load = async () => {
    try {
      const [foodsRes, catsRes] = await Promise.all([
        api.get("/foods"),
        api.get("/categories"),
      ]);

      const foodsList = Array.isArray(foodsRes.data)
        ? foodsRes.data
        : foodsRes.data?.data || [];
      const catsList = Array.isArray(catsRes.data)
        ? catsRes.data
        : catsRes.data?.data || [];

      setItems(foodsList);
      setCategories(catsList);
    } catch (err: any) {
      console.log("Load error:", err?.response?.data || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price,
      imageUrl: item.imageUrl || "",
      imagePublicId: item.imagePublicId || "",
      categoryId: item.categoryId || "",
      category: item.category || "",
      rating: item.rating ?? 4.5,
      isPopular: item.isPopular ?? false,
      isAvailable: item.isAvailable ?? true,
    });
    setEditing(getId(item));
    setShowForm(true);
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      return Alert.alert("Error", "Category name cannot be empty");
    }
    setSavingCat(true);
    try {
      const res = await api.post("/categories", { name: newCatName.trim() });
      const newCategory = res.data?.data || res.data;

      await load();

      if (newCategory?.id) {
        setForm((f: any) => ({ ...f, categoryId: newCategory.id }));
      }

      setShowCatModal(false);
      setNewCatName("");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.error || "Failed to create category"
      );
    } finally {
      setSavingCat(false);
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;
      const file = result.assets[0];

      if (file.size && file.size > 5 * 1024 * 1024) {
        return Alert.alert("File too large", "Please pick an image under 5MB.");
      }

      setUploading(true);

      const formData = new FormData();
      formData.append("image", {
        uri: file.uri,
        name: file.name || `food-${Date.now()}.jpg`,
        type: file.mimeType || "image/jpeg",
      } as any);

      const res = await api.post("/foods/upload", formData, {
        transformRequest: (d) => d,
      });

      const uploadedUrl = res.data?.imageUrl || res.data?.url;
      const uploadedPublicId = res.data?.publicId || res.data?.filename || "";

      if (uploadedUrl) {
        setForm((f: any) => ({
          ...f,
          imageUrl: uploadedUrl,
          imagePublicId: uploadedPublicId,
        }));
        Alert.alert("Uploaded", "Image uploaded to Cloudinary ✅");
      } else {
        Alert.alert("Error", "Upload failed - no URL returned");
      }
    } catch (err: any) {
      Alert.alert(
        "Upload failed",
        err?.response?.data?.message || err?.message || "Could not upload image"
      );
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name || !form.imageUrl || !form.categoryId || !form.price) {
      return Alert.alert(
        "Error",
        "Name, image, category and price are required"
      );
    }

    const selectedCat = categories.find((c) => c.id === form.categoryId);
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      imageUrl: form.imageUrl,
      imagePublicId: form.imagePublicId || undefined,
      categoryId: form.categoryId,
      category: selectedCat ? selectedCat.name : form.category,
      rating: Number(form.rating),
      isPopular: Boolean(form.isPopular),
      isAvailable: Boolean(form.isAvailable),
    };

    setSaving(true);
    try {
      // ✅ FIX: Force JSON header to prevent Multer from stripping the text body
      const config = { headers: { "Content-Type": "application/json" } };

      if (editing) {
        await api.put(`/foods/${editing}`, payload, config);
        Alert.alert("Success", "Food updated");
      } else {
        await api.post("/foods", payload, config);
        Alert.alert("Success", "Food created");
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      console.log("Save error:", err?.response?.data || err.message);
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = (item: any) => {
    Alert.alert("Delete?", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminService.deleteFood(getId(item));
            Alert.alert("Deleted", "Food removed");
            load();
          } catch (err: any) {
            Alert.alert(
              "Error",
              err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Delete failed"
            );
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.imageUrl || item.image }}
        style={styles.image}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.category}
        </Text>
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEdit(item)}
          >
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => remove(item)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Foods</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => getId(item)}
          contentContainerStyle={{ padding: SIZES.md }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No foods. Tap + to add.</Text>
          }
        />
      )}

      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowForm(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editing ? "Edit Food" : "Add Food"}
              </Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                placeholder="e.g. Cheeseburger"
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                placeholder="Short description"
                placeholderTextColor={COLORS.gray}
                multiline
              />

              <Text style={styles.label}>Food Image *</Text>

              {form.imageUrl ? (
                <View style={styles.imagePreviewBox}>
                  <Image
                    source={{ uri: form.imageUrl }}
                    style={styles.preview}
                  />
                  <TouchableOpacity
                    style={styles.changeImageBtn}
                    onPress={pickFromFiles}
                  >
                    <Text style={styles.changeImageText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
                  onPress={pickFromFiles}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.uploadBtnText}>
                      📁 Choose from Files
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <View style={styles.catHeaderRow}>
                <Text style={styles.label}>Category *</Text>
                <TouchableOpacity onPress={() => setShowCatModal(true)}>
                  <Text style={styles.addCatText}>+ New Category</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 4 }}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      form.categoryId === cat.id && styles.catChipActive,
                    ]}
                    onPress={() => setForm({ ...form, categoryId: cat.id })}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        form.categoryId === cat.id &&
                          styles.catChipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: SIZES.sm }}>
                  <Text style={styles.label}>Price (ETB) *</Text>
                  <TextInput
                    style={styles.input}
                    value={String(form.price)}
                    onChangeText={(t) =>
                      setForm({ ...form, price: parseFloat(t) || 0 })
                    }
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Rating</Text>
                  <TextInput
                    style={styles.input}
                    value={String(form.rating)}
                    onChangeText={(t) =>
                      setForm({ ...form, rating: parseFloat(t) || 0 })
                    }
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Popular</Text>
                <Switch
                  value={form.isPopular}
                  onValueChange={(v) => setForm({ ...form, isPopular: v })}
                  trackColor={{ true: COLORS.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Available</Text>
                <Switch
                  value={form.isAvailable}
                  onValueChange={(v) => setForm({ ...form, isAvailable: v })}
                  trackColor={{ true: COLORS.primary }}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={save}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveText}>
                    {editing ? "Update" : "Create"}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{ height: SIZES.xl }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCatModal} transparent animationType="fade">
        <View style={styles.catModalBg}>
          <View style={styles.catModalBox}>
            <Text style={styles.catModalTitle}>New Category</Text>
            <TextInput
              style={styles.input}
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="e.g. Desserts, Salads"
              placeholderTextColor={COLORS.gray}
              autoFocus
            />
            <View style={styles.catModalActions}>
              <TouchableOpacity
                style={styles.catCancelBtn}
                onPress={() => {
                  setShowCatModal(false);
                  setNewCatName("");
                }}
              >
                <Text style={styles.catCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.catSaveBtn, savingCat && { opacity: 0.6 }]}
                onPress={handleCreateCategory}
                disabled={savingCat}
              >
                {savingCat ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.catSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
  },
  title: { ...FONTS.h3, color: COLORS.dark },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
  closeText: { color: COLORS.gray, fontSize: 14, fontWeight: "600" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  addText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 26,
  },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.md,
    overflow: "hidden",
  },
  image: { width: 100, height: 100 },
  info: { flex: 1, padding: SIZES.sm },
  name: { ...FONTS.h4, color: COLORS.dark },
  meta: { ...FONTS.small, color: COLORS.gray, marginTop: 2 },
  price: { ...FONTS.h4, color: COLORS.primary, marginTop: 4 },
  actions: { flexDirection: "row", marginTop: SIZES.sm },
  editBtn: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FFF5F1",
    marginRight: SIZES.sm,
  },
  editText: { ...FONTS.small, color: COLORS.primary, fontWeight: "600" },
  deleteBtn: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FFEBEE",
  },
  deleteText: { ...FONTS.small, color: COLORS.danger, fontWeight: "600" },
  empty: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: "center",
    padding: SIZES.xl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SIZES.lg,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.md,
  },
  modalTitle: { ...FONTS.h3, color: COLORS.dark },
  label: {
    ...FONTS.small,
    color: COLORS.gray,
    marginTop: SIZES.md,
    marginBottom: 4,
    fontWeight: "600",
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
  uploadBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    marginTop: 4,
  },
  uploadBtnText: { ...FONTS.body, color: COLORS.white, fontWeight: "600" },
  imagePreviewBox: { borderRadius: SIZES.radius, overflow: "hidden", marginTop: 4 },
  preview: { width: "100%", height: 180 },
  changeImageBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeImageText: { color: COLORS.white, fontWeight: "600", fontSize: 12 },
  rowInputs: { flexDirection: "row" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SIZES.md,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: "center",
    marginTop: SIZES.lg,
  },
  saveText: { ...FONTS.h4, color: COLORS.white },
  catHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: SIZES.md,
    marginBottom: 4,
  },
  addCatText: { ...FONTS.small, color: COLORS.primary, fontWeight: "bold" },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { ...FONTS.small, color: COLORS.dark, fontWeight: "600" },
  catChipTextActive: { color: COLORS.white },
  catModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  catModalBox: {
    width: "85%",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    elevation: 5,
  },
  catModalTitle: { ...FONTS.h3, color: COLORS.dark, marginBottom: SIZES.md },
  catModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: SIZES.lg,
    gap: 12,
  },
  catCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  catCancelText: { ...FONTS.body, color: COLORS.gray, fontWeight: "600" },
  catSaveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: SIZES.radius,
  },
  catSaveText: { ...FONTS.body, color: COLORS.white, fontWeight: "600" },
});

export default AdminFoodsScreen;