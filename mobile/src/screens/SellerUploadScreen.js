import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api, { API_BASE } from '../api/config';

export default function SellerUploadScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    description: '',
    base_price: '',
    category: '',
    stock: '1',
    allow_juggling: true
  });
  const [categories, setCategories] = useState([]);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories/');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permission');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permission');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.base_price || !formData.category) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('brand', formData.brand || 'Generic');
      payload.append('description', formData.description);
      payload.append('base_price', formData.base_price);
      payload.append('category', formData.category);
      payload.append('stock', formData.stock);
      payload.append('allow_juggling', formData.allow_juggling);

      if (image) {
        const filename = image.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        payload.append('image', { uri: image.uri, name: filename, type });
      }

      await api.post('/products/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('Success', 'Product listed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || 'Failed to list product';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>List a Product</Text>

      {/* Image Upload */}
      <View style={styles.imageSection}>
        {image ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)}>
              <Ionicons name="close-circle" size={28} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color="#ccc" />
            <Text style={styles.placeholderText}>Add Product Image</Text>
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
                <Ionicons name="photos" size={20} color="#7c3aed" />
                <Text style={styles.imageBtnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
                <Ionicons name="camera" size={20} color="#7c3aed" />
                <Text style={styles.imageBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Nike Air Max"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />

        <Text style={styles.label}>Brand</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Nike"
          value={formData.brand}
          onChangeText={(text) => setFormData({ ...formData, brand: text })}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your product..."
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Price (ETB) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          value={formData.base_price}
          onChangeText={(text) => setFormData({ ...formData, base_price: text })}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryPill, formData.category == cat.id && styles.categoryPillActive]}
              onPress={() => setFormData({ ...formData, category: cat.id })}
            >
              <Text style={[styles.categoryText, formData.category == cat.id && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Stock</Text>
        <TextInput
          style={styles.input}
          placeholder="1"
          value={formData.stock}
          onChangeText={(text) => setFormData({ ...formData, stock: text })}
          keyboardType="numeric"
        />

        {/* Juggling Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.label}>Allow Juggling</Text>
            <Text style={styles.toggleHint}>Requires verification</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, formData.allow_juggling && styles.toggleActive]}
            onPress={() => setFormData({ ...formData, allow_juggling: !formData.allow_juggling })}
          >
            <View style={[styles.toggleDot, formData.allow_juggling && styles.toggleDotActive]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.submitBtnText}>List Product</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 24 },
  imageSection: { marginBottom: 24 },
  imagePreview: { position: 'relative' },
  previewImage: { width: '100%', height: 250, borderRadius: 16, backgroundColor: '#f5f5f5' },
  removeImage: { position: 'absolute', top: 8, right: 8 },
  imagePlaceholder: {
    width: '100%', height: 200, borderRadius: 16, backgroundColor: '#f9f9f9',
    borderWidth: 2, borderColor: '#eee', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center'
  },
  placeholderText: { color: '#888', marginTop: 8, marginBottom: 16 },
  imageButtons: { flexDirection: 'row', gap: 16 },
  imageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#f0f0f0'
  },
  imageBtnText: { fontWeight: '600', color: '#333' },
  form: { gap: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', marginTop: 8 },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, fontSize: 16,
    borderWidth: 1, borderColor: '#eee'
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  categoryScroll: { marginVertical: 8 },
  categoryPill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#f5f5f5', marginRight: 8
  },
  categoryPillActive: { backgroundColor: '#000' },
  categoryText: { fontSize: 14, fontWeight: '600', color: '#666' },
  categoryTextActive: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#f9f9f9', borderRadius: 12, marginTop: 8
  },
  toggleInfo: { flex: 1 },
  toggleHint: { fontSize: 12, color: '#888', marginTop: 2 },
  toggle: {
    width: 52, height: 30, borderRadius: 15, backgroundColor: '#ddd',
    justifyContent: 'center', padding: 2
  },
  toggleActive: { backgroundColor: '#22c55e' },
  toggleDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff' },
  toggleDotActive: { alignSelf: 'flex-end' },
  submitBtn: {
    backgroundColor: '#22c55e', borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 24
  },
  submitBtnText: { color: '#000', fontWeight: '700', fontSize: 16 }
});
