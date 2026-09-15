import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../api/config';

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/');
      setOrders(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#eab308';
      case 'CONFIRMED': return '#3b82f6';
      case 'PROCESSING': return '#a855f7';
      case 'SHIPPED': return '#22c55e';
      case 'DELIVERED': return '#22c55e';
      case 'CANCELLED': return '#ef4444';
      default: return '#888';
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#22c55e" /></View>;
  }

  return (
    <View style={styles.container}>
      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No orders yet</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>Order #{item.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.productName}>{item.product_name}</Text>
              <View style={styles.orderFooter}>
                <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                <Text style={styles.orderTotal}>ETB {item.total_price}</Text>
              </View>
              {item.tracking_number && (
                <Text style={styles.tracking}>Tracking: {item.tracking_number}</Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
  orderCard: {
    padding: 16, marginBottom: 12, borderRadius: 16,
    backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#f0f0f0'
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  productName: { fontSize: 14, color: '#666', marginBottom: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  orderDate: { fontSize: 13, color: '#888' },
  orderTotal: { fontSize: 16, fontWeight: '800', color: '#22c55e' },
  tracking: { fontSize: 12, color: '#888', marginTop: 8 }
});
