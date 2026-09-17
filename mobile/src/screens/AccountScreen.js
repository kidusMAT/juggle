import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import api from '../api/config';

export default function AccountScreen({ navigation }) {
  const { user, logout, setUser } = useAuth();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/users/me/');
      setUserData(res.data);
      setUser(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.username}>{userData?.username}</Text>
        <Text style={styles.role}>{userData?.is_juggler ? 'Master Juggler' : 'Market Buyer'}</Text>
      </View>

      {/* Balance Cards */}
      <View style={styles.balanceRow}>
        <View style={[styles.balanceCard, { borderColor: '#22c55e30' }]}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={[styles.balanceValue, { color: '#22c55e' }]}>ETB {userData?.actual_balance || '0.00'}</Text>
        </View>
        <View style={[styles.balanceCard, { borderColor: '#a855f730' }]}>
          <Text style={styles.balanceLabel}>CB Power</Text>
          <Text style={[styles.balanceValue, { color: '#a855f7' }]}>{Math.floor(userData?.current_cb || 0)}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        <MenuItem icon="add-circle" label="List a Product" onPress={() => navigation.navigate('SellerUpload')} color="#7c3aed" />
        <MenuItem icon="receipt" label="My Orders" onPress={() => navigation.navigate('Orders')} />
        <MenuItem icon="wallet" label="Transactions" onPress={() => navigation.navigate('Transactions')} />
        <MenuItem icon="time" label="Active Juggles" onPress={() => {}} />
        <MenuItem icon="notifications" label="Notifications" onPress={() => {}} />
        <MenuItem icon="settings" label="Settings" onPress={() => {}} />
        <MenuItem icon="log-out" label="Logout" onPress={handleLogout} color="#ef4444" />
      </View>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress, color = '#333' }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  profileHeader: { alignItems: 'center', paddingTop: 60, paddingBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12
  },
  username: { fontSize: 24, fontWeight: '800' },
  role: { fontSize: 14, color: '#888' },
  balanceRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  balanceCard: {
    flex: 1, padding: 20, borderRadius: 16, backgroundColor: '#fafafa',
    borderWidth: 1
  },
  balanceLabel: { fontSize: 12, color: '#888', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  balanceValue: { fontSize: 24, fontWeight: '900', fontFamily: 'monospace' },
  menu: { paddingHorizontal: 20 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 4,
    borderRadius: 12, gap: 12
  },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600' }
});
