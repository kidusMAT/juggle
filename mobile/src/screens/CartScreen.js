import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE } from '../api/config';

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await api.get('/cart/');
      setCartItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQty) => {
    if (newQty < 1) return handleRemove(itemId);
    try {
      await api.post(`/cart/${itemId}/update_quantity/`, { quantity: newQty });
      fetchCart();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update');
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await api.delete(`/cart/${itemId}/`);
      fetchCart();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      await api.post('/cart/checkout/');
      Alert.alert('Success', 'Order placed successfully!');
      fetchCart();
    } catch (err) {
      Alert.alert('Checkout Failed', err.response?.data?.error || 'Insufficient balance');
    } finally {
      setCheckingOut(false);
    }
  };

  const getTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = item.selected_offer ? item.selected_offer.markup_price : item.product_details?.base_price || 0;
      return sum + (price * item.quantity);
    }, 0);
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#22c55e" /></View>;
  }

  return (
    <View style={styles.container}>
      {cartItems.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={64} color="#ddd" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Shop')}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const price = item.selected_offer ? item.selected_offer.markup_price : item.product_details?.base_price || 0;
              const product = item.product_details || {};
              return (
                <View style={styles.cartItem}>
                  <Image
                    source={{ uri: product.image ? `${API_BASE.replace('/api', '')}${product.image}` : 'https://via.placeholder.com/100' }}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.itemPrice}>ETB {price}</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1)} style={styles.qtyBtn}>
                        <Ionicons name="remove" size={16} color="#000" />
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)} style={styles.qtyBtn}>
                        <Ionicons name="add" size={16} color="#000" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              );
            }}
          />

          {/* Checkout Footer */}
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>ETB {getTotal().toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} disabled={checkingOut}>
              <Text style={styles.checkoutBtnText}>{checkingOut ? 'Processing...' : 'Checkout'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, color: '#888', marginTop: 16, marginBottom: 24 },
  shopBtn: { backgroundColor: '#22c55e', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  shopBtnText: { color: '#000', fontWeight: '700' },
  cartItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12,
    backgroundColor: '#fafafa', borderRadius: 16, gap: 12
  },
  itemImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#eee' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#22c55e', marginBottom: 8 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#eee',
    justifyContent: 'center', alignItems: 'center'
  },
  qtyValue: { fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 8 },
  footer: {
    padding: 20, borderTopWidth: 1, borderTopColor: '#eee',
    backgroundColor: '#fff'
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  totalLabel: { fontSize: 18, fontWeight: '700' },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#22c55e' },
  checkoutBtn: {
    backgroundColor: '#000', borderRadius: 12, padding: 18, alignItems: 'center'
  },
  checkoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
