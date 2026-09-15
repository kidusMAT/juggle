import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE } from '../api/config';

export default function ProductDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${id}/`);
      setProduct(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      await api.post('/cart/', { product: product.id, quantity });
      Alert.alert('Added', `${product.name} added to cart`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add to cart');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!product) return null;

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: product.image ? `${API_BASE.replace('/api', '')}${product.image}` : 'https://via.placeholder.com/600' }}
        style={styles.image}
      />

      <View style={styles.content}>
        <Text style={styles.category}>{product.category_name || 'General'}</Text>
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.brand}>{product.brand}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>ETB {product.base_price}</Text>
          <Text style={styles.stock}>Stock: {product.stock}</Text>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{product.description}</Text>

        {/* Quantity */}
        <View style={styles.quantityContainer}>
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => Math.min(product.stock, q + 1))}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add to Cart */}
        <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart}>
          <Ionicons name="cart" size={20} color="#000" />
          <Text style={styles.addToCartText}>Add to Cart - ETB {(product.base_price * quantity).toFixed(2)}</Text>
        </TouchableOpacity>

        {/* Trust Badges */}
        <View style={styles.trustBadges}>
          <View style={styles.trustItem}>
            <Ionicons name="car" size={18} color="#888" />
            <Text style={styles.trustText}>Fast Delivery</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={18} color="#888" />
            <Text style={styles.trustText}>Authentic</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 400, backgroundColor: '#f5f5f5' },
  content: { padding: 24 },
  category: { fontSize: 12, color: '#888', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  brand: { fontSize: 16, color: '#666', marginBottom: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  price: { fontSize: 28, fontWeight: '900', color: '#22c55e' },
  stock: { fontSize: 14, color: '#888' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#888', marginBottom: 8, textTransform: 'uppercase' },
  description: { fontSize: 15, lineHeight: 24, color: '#444', marginBottom: 24 },
  quantityContainer: { marginBottom: 24 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#f5f5f5',
    justifyContent: 'center', alignItems: 'center'
  },
  qtyBtnText: { fontSize: 20, fontWeight: '700' },
  qtyValue: { fontSize: 18, fontWeight: '700', minWidth: 30, textAlign: 'center' },
  addToCartBtn: {
    flexDirection: 'row', backgroundColor: '#22c55e', borderRadius: 16, padding: 18,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24
  },
  addToCartText: { color: '#000', fontWeight: '700', fontSize: 16 },
  trustBadges: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 24, borderTopWidth: 1, borderTopColor: '#eee' },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { fontSize: 13, color: '#888' }
});
