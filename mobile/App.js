import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import api from './src/api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './src/screens/HomeScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CartScreen from './src/screens/CartScreen';
import AccountScreen from './src/screens/AccountScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Shop') iconName = focused ? 'bag' : 'bag-outline';
          else if (route.name === 'Cart') iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#888',
        headerStyle: { backgroundColor: '#fff' },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen name="Shop" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ title: 'My Cart' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'My Account' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.get('/users/me/');
      setUser(res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const res = await api.post('/users/login_user/', { username, password });
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await api.post('/users/logout_user/');
    setUser(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      <NavigationContainer>
        <Stack.Navigator>
          {!user ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
              <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
              <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders' }} />
              <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ title: 'Transactions' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </AuthContext.Provider>
  );
}
