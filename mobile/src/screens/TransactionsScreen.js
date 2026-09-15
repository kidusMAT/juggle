import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/config';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions/');
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'DEPOSIT': return 'arrow-down';
      case 'WITHDRAWAL': return 'arrow-up';
      case 'PURCHASE': return 'bag';
      case 'SALE': return 'cash';
      case 'JUGGLE_PROFIT': return 'flash';
      default: return 'receipt';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'DEPOSIT':
      case 'SALE':
      case 'JUGGLE_PROFIT': return '#22c55e';
      case 'WITHDRAWAL':
      case 'PURCHASE': return '#ef4444';
      default: return '#888';
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#22c55e" /></View>;
  }

  return (
    <View style={styles.container}>
      {transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.txCard}>
              <View style={[styles.iconContainer, { backgroundColor: `${getColor(item.transaction_type)}15` }]}>
                <Ionicons name={getIcon(item.transaction_type)} size={20} color={getColor(item.transaction_type)} />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txType}>{item.transaction_type.replace('_', ' ')}</Text>
                <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: getColor(item.transaction_type) }]}>
                  {item.amount > 0 ? '+' : ''}{item.amount} ETB
                </Text>
                <Text style={styles.txDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
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
  txCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 8,
    borderRadius: 12, backgroundColor: '#fafafa', gap: 12
  },
  iconContainer: {
    width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center'
  },
  txInfo: { flex: 1 },
  txType: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize', marginBottom: 2 },
  txDesc: { fontSize: 12, color: '#888' },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  txDate: { fontSize: 11, color: '#aaa' }
});
