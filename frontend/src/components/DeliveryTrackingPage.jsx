import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { API_BASE } from '../api';
import Navbar from './Navbar';
import { Package, MapPin, Clock, CheckCircle, Truck, AlertCircle, Search, ArrowRight } from 'lucide-react';

export default function DeliveryTrackingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingUpdates, setTrackingUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    fetchOrders();
    const orderParam = searchParams.get('order');
    if (orderParam) {
      fetchTracking(parseInt(orderParam));
    }
  }, [searchParams]);

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

  const fetchTracking = async (orderId) => {
    try {
      const res = await api.get(`/delivery-tracking/?order=${orderId}`);
      const trackingData = res.data.results || res.data;
      setTrackingUpdates(trackingData);
      const order = orders.find(o => o.id === orderId) || trackingData[0]?.order;
      setSelectedOrder(order);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchByTrackingNumber = async () => {
    if (!trackingNumber.trim()) return;
    setSearchError('');
    setSearchResult(null);

    try {
      const res = await api.get(`/delivery-tracking/by_tracking_number/?tracking_number=${trackingNumber}`);
      setSearchResult(res.data);
    } catch (err) {
      setSearchError('Order not found with that tracking number');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PICKED_UP': return <Package size={20} />;
      case 'IN_TRANSIT': return <Truck size={20} />;
      case 'OUT_FOR_DELIVERY': return <MapPin size={20} />;
      case 'DELIVERED': return <CheckCircle size={20} />;
      case 'FAILED': return <AlertCircle size={20} />;
      default: return <Clock size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PICKED_UP': return '#3b82f6';
      case 'IN_TRANSIT': return '#f59e0b';
      case 'OUT_FOR_DELIVERY': return '#a855f7';
      case 'DELIVERED': return '#22c55e';
      case 'FAILED': return '#ef4444';
      default: return '#888';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <Navbar />
      
      <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1000px' }}>
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Truck size={28} /> Delivery Tracking
          </h1>
          <p className="text-muted">Track your orders in real-time</p>
        </header>

        {/* Tracking Number Search */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Track by Number</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="Enter tracking number..."
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchByTrackingNumber()}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid #eee',
                background: '#f9f9f9',
                fontSize: '0.9rem'
              }}
            />
            <button
              onClick={handleSearchByTrackingNumber}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                background: 'var(--neon-green)',
                color: '#000',
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Search size={18} /> Track
            </button>
          </div>
          {searchError && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.75rem' }}>{searchError}</p>
          )}
          {searchResult && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(34,197,94,0.05)', borderRadius: '0.75rem', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p style={{ fontWeight: '600' }}>Order #{searchResult.order.id} - {searchResult.order.product_name}</p>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>Status: <span style={{ color: 'var(--neon-green)', fontWeight: '600' }}>{searchResult.order.status}</span></p>
              <button
                onClick={() => {
                  setSelectedOrder(searchResult.order);
                  setTrackingUpdates(searchResult.tracking_updates);
                  setSearchResult(null);
                  setTrackingNumber('');
                }}
                style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--neon-green)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                View Details <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
          {/* Orders List */}
          <div className="card" style={{ padding: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', padding: '0 0.5rem' }}>My Orders</h3>
            {loading ? (
              <p style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>Loading...</p>
            ) : orders.length === 0 ? (
              <p style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>No orders yet</p>
            ) : (
              orders.map(order => (
                <div
                  key={order.id}
                  onClick={() => fetchTracking(order.id)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    background: selectedOrder?.id === order.id ? 'rgba(34,197,94,0.05)' : 'transparent',
                    borderLeft: selectedOrder?.id === order.id ? '3px solid var(--neon-green)' : '3px solid transparent',
                    marginBottom: '0.5rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>#{order.id}</span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '1rem',
                      background: order.status === 'DELIVERED' ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)',
                      color: order.status === 'DELIVERED' ? '#22c55e' : '#666',
                      fontWeight: '600'
                    }}>
                      {order.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.25rem 0' }}>{order.product_name}</p>
                  {order.tracking_number && (
                    <p style={{ fontSize: '0.7rem', color: '#999' }}>TRK: {order.tracking_number}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Tracking Details */}
          <div className="card" style={{ padding: '1.5rem' }}>
            {selectedOrder ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Order #{selectedOrder.id}</h2>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>{selectedOrder.product_name}</p>
                  </div>
                  {selectedOrder.tracking_number && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.7rem', color: '#999' }}>TRACKING NUMBER</p>
                      <p style={{ fontFamily: 'monospace', fontWeight: '600' }}>{selectedOrder.tracking_number}</p>
                    </div>
                  )}
                </div>

                {trackingUpdates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                    <Package size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p>No tracking updates yet</p>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {/* Timeline Line */}
                    <div style={{
                      position: 'absolute',
                      left: '15px',
                      top: '0',
                      bottom: '0',
                      width: '2px',
                      background: '#eee'
                    }} />

                    {/* Tracking Steps */}
                    {trackingUpdates.map((update, index) => (
                      <div
                        key={update.id}
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          marginBottom: '1.5rem',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: getStatusColor(update.status),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          zIndex: 1,
                          boxShadow: `0 0 0 4px ${getStatusColor(update.status)}20`
                        }}>
                          {getStatusIcon(update.status)}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600', color: getStatusColor(update.status) }}>
                              {update.status.replace('_', ' ')}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#999' }}>
                              {formatDate(update.created_at)}
                            </span>
                          </div>
                          {update.location && (
                            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                              📍 {update.location}
                            </p>
                          )}
                          {update.description && (
                            <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
                              {update.description}
                            </p>
                          )}
                          {update.updated_by_name && (
                            <p style={{ fontSize: '0.7rem', color: '#bbb', marginTop: '0.25rem' }}>
                              Updated by {update.updated_by_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#999' }}>
                <Truck size={64} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '1.1rem' }}>Select an order to track</p>
                <p style={{ fontSize: '0.85rem' }}>Or search by tracking number above</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
