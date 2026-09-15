import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE } from '../api/config';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [category]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = category !== 'All' ? `?category=${category}` : '';
      const res = await api.get(`/products/buyer_market/${params}`);
      setProducts(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories/');
      setCategories(['All', ...res.data.map(c => c.name)]);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderProduct = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProductDetail', { id: item.id })}>
      <Image
        source={{ uri: item.image ? `${API_BASE.replace('/api', '')}${item.image}` : 'https://via.placeholder.com/300' }}
        style={styles.cardImage}
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardCategory}>{item.category_name || 'General'}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardPrice}>ETB {item.base_price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>GOBeZ</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryPill, category === item && styles.categoryPillActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Products */}
      {loading ? (
        <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          renderItem={renderProduct}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16
  },
  logo: { fontSize: 28, fontWeight: '900', letterSpacing: -1.5 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5',
    borderRadius: 12, paddingHorizontal: 16, marginHorizontal: 20, marginBottom: 12
  },
  searchInput: { flex: 1, padding: 14, fontSize: 15, marginLeft: 8 },
  categoriesList: { paddingHorizontal: 20, marginBottom: 16, maxHeight: 44 },
  categoryPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f5f5f5', marginRight: 8
  },
  categoryPillActive: { backgroundColor: '#000' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#666' },
  categoryTextActive: { color: '#fff' },
  productList: { paddingHorizontal: 20, paddingBottom: 20 },
  productRow: { justifyContent: 'space-between' },
  card: {
    width: CARD_WIDTH, marginBottom: 16, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0f0f0'
  },
  cardImage: { width: '100%', height: CARD_WIDTH },
  cardContent: { padding: 12 },
  cardCategory: { fontSize: 10, color: '#888', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: '#22c55e' },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16 }
});
