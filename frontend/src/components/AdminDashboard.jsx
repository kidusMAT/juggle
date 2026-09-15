import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api';
import { Shield, Check, X, FileText, Image as ImageIcon, Phone, User, Briefcase, ExternalLink, Activity, Users, Package, TrendingUp, Pyramid, Zap, DollarSign, Clock, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Navbar from './Navbar';

const COLORS = ['#22c55e', '#a855f7', '#3b82f6', '#eab308', '#ef4444', '#ec4899'];

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [statsRes, appsRes] = await Promise.all([
        api.get('/admin/stats/'),
        api.get('/users/pending_sellers/')
      ]);
      setStats(statsRes.data);
      setApplications(appsRes.data);
    } catch (err) {
      showNotification("Failed to fetch data. Admin access required.", "error");
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/account');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (userId, action) => {
    try {
      await api.post(`/users/${userId}/review_seller/`, { action });
      showNotification(`Seller ${action === 'approve' ? 'Approved' : 'Rejected'} successfully!`, "success");
      setApplications(applications.filter(app => app.id !== userId));
      setStats(prev => ({ ...prev, pending_sellers: prev.pending_sellers - 1 }));
    } catch (err) {
      showNotification("Action failed. Try again.", "error");
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => setNotification({ ...notification, visible: false }), 4000);
  };

  const StatCard = ({ icon, label, value, color, sub }) => (
    <div className="card" style={{ padding: '1.5rem', background: `linear-gradient(135deg, ${color}10, transparent)`, border: `1px solid ${color}30` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ padding: '0.5rem', background: `${color}20`, borderRadius: '0.5rem' }}>
          {icon}
        </div>
        <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <h3 style={{ fontSize: '2rem', margin: 0, color, fontFamily: 'monospace' }}>{value}</h3>
      {sub && <p style={{ fontSize: '0.8rem', color: '#888', margin: '0.5rem 0 0' }}>{sub}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="juggler-hub">
        <Navbar />
        <div className="hub-container" style={{ paddingTop: '2rem', textAlign: 'center', padding: '5rem' }}>
          <Activity className="timer-neon" size={48} />
          <p style={{ marginTop: '1rem' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const productData = stats ? [
    { name: 'Active', value: stats.active_products },
    { name: 'Juggled', value: stats.juggled_products },
    { name: 'Sold', value: stats.sold_products }
  ] : [];

  const pyramidData = stats ? [
    { name: 'Active', value: stats.active_pyramids },
    { name: 'Completed', value: stats.completed_pyramids }
  ] : [];

  const userData = stats ? [
    { name: 'Jugglers', value: stats.total_jugglers },
    { name: 'Sellers', value: stats.total_sellers },
    { name: 'Buyers', value: stats.total_users - stats.total_jugglers - stats.total_sellers }
  ] : [];

  return (
    <div className="juggler-hub">
      <Navbar />
      
      {notification.visible && (
        <div className={`notification-toast ${notification.type}`} style={{ position: 'fixed', top: '100px', right: '2rem', zIndex: 9999 }}>
          {notification.type === 'success' ? <Check size={20} /> : <X size={20} />}
          {notification.message}
        </div>
      )}

      <div className="hub-container" style={{ paddingTop: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(192, 132, 252, 0.1)', borderRadius: '1rem', color: 'var(--neon-purple)' }}>
              <Shield size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '0' }}>Admin Control</h1>
              <p className="text-muted">Platform analytics and seller management</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
            { id: 'sellers', label: 'Seller Verification', icon: <Users size={16} />, badge: applications.length },
            { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1.25rem', borderRadius: '0.75rem',
                background: activeTab === tab.id ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                border: activeTab === tab.id ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
                color: activeTab === tab.id ? 'var(--neon-purple)' : '#888',
                cursor: 'pointer', fontWeight: activeTab === tab.id ? '700' : '500',
                fontSize: '0.9rem', transition: 'all 0.2s', position: 'relative'
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 'bold',
                  borderRadius: '50%', width: '18px', height: '18px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', marginLeft: '0.25rem'
                }}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard icon={<Users size={20} color="#22c55e" />} label="Total Users" value={stats.total_users} color="#22c55e" sub={`${stats.total_jugglers} jugglers`} />
              <StatCard icon={<Package size={20} color="#3b82f6" />} label="Products" value={stats.total_products} color="#3b82f6" sub={`${stats.active_products} active`} />
              <StatCard icon={<DollarSign size={20} color="#eab308" />} label="Revenue" value={`ETB ${stats.total_revenue.toLocaleString()}`} color="#eab308" sub="Platform fees" />
              <StatCard icon={<Pyramid size={20} color="#a855f7" />} label="Pyramids" value={stats.active_pyramids} color="#a855f7" sub={`${stats.completed_pyramids} completed`} />
              <StatCard icon={<Zap size={20} color="#ec4899" />} label="Active Juggles" value={stats.active_juggles} color="#ec4899" sub={`${stats.total_juggles} total`} />
              <StatCard icon={<Clock size={20} color="#ef4444" />} label="Pending Sellers" value={stats.pending_sellers} color="#ef4444" sub="Awaiting review" />
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* User Growth Chart */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} color="var(--neon-green)" /> User & Product Growth (30 days)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={stats.daily_stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#666' }} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }} />
                    <Area type="monotone" dataKey="users" stroke="#22c55e" fill="#22c55e30" name="Users" />
                    <Area type="monotone" dataKey="products" stroke="#3b82f6" fill="#3b82f630" name="Products" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Product Status Pie */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PieChartIcon size={18} color="var(--neon-purple)" /> Product Status
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={productData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                      {productData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Second Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* User Breakdown */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} color="#3b82f6" /> User Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={userData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#666' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#666' }} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }} />
                    <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pyramid Status */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Pyramid size={18} color="#eab308" /> Pyramid Status
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={pyramidData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#666' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#666' }} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }} />
                    <Bar dataKey="value" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* SELLERS TAB */}
        {activeTab === 'sellers' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {applications.length === 0 ? (
              <div className="hub-card" style={{ textAlign: 'center', padding: '4rem' }}>
                <Check size={64} color="var(--neon-green)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
                <h3>All caught up!</h3>
                <p className="text-muted">No pending seller applications at the moment.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {applications.map(app => (
                  <div key={app.id} className="hub-card" style={{ display: 'grid', gridTemplateColumns: '1.5fr 3fr 1fr', gap: '2rem', alignItems: 'start' }}>
                    {/* User Info */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={20} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0 }}>@{app.username}</h4>
                          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{app.email}</p>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={16} /> <strong>{app.business_name}</strong></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> {app.seller_full_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={16} /> {app.seller_phone}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> TIN: {app.tin_number}</div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      {[
                        { label: 'License', key: 'business_license' },
                        { label: 'Gov ID', key: 'id_proof' },
                        { label: 'Bank Proof', key: 'bank_details_proof' },
                        { label: 'Address', key: 'address_proof' },
                        { label: 'VAT', key: 'vat_registration' },
                        { label: 'Import', key: 'import_license' }
                      ].filter(doc => app[doc.key]).map(doc => (
                        <div key={doc.key} className="file-upload-zone" style={{ minHeight: '100px', cursor: 'pointer', padding: '0.5rem', position: 'relative' }} onClick={() => setSelectedDoc(app[doc.key])}>
                          <ImageIcon size={20} style={{ opacity: 0.5, marginBottom: '0.25rem' }} />
                          <span style={{ fontSize: '0.6rem' }}>{doc.label}</span>
                          <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '2px' }}>
                            <ExternalLink size={10} color="white" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <button className="hub-btn hub-btn-neon" style={{ background: 'rgba(52, 211, 153, 0.1)', borderColor: 'var(--neon-green)', color: 'var(--neon-green)' }} onClick={() => handleReview(app.id, 'approve')}>
                        <Check size={18} /> Approve
                      </button>
                      <button className="hub-btn" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleReview(app.id, 'reject')}>
                        <X size={18} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && stats && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Full Growth Chart */}
              <div className="card" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} color="var(--neon-green)" /> 30-Day Growth Trend
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={stats.daily_stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#666' }} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }} />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} name="New Users" />
                    <Line type="monotone" dataKey="products" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="New Products" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue Card */}
              <div className="card" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1), transparent)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <DollarSign size={48} color="#eab308" style={{ marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '2.5rem', color: '#eab308', fontFamily: 'monospace', margin: '0.5rem 0' }}>ETB {stats.total_revenue.toLocaleString()}</h2>
                <p style={{ color: '#888', fontSize: '0.9rem' }}>Total Platform Revenue</p>
              </div>

              {/* Quick Stats */}
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Quick Stats</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { label: 'Conversion Rate', value: stats.total_users > 0 ? `${((stats.total_jugglers / stats.total_users) * 100).toFixed(1)}%` : '0%', color: '#22c55e' },
                    { label: 'Avg Products/User', value: stats.total_users > 0 ? (stats.total_products / stats.total_users).toFixed(1) : '0', color: '#3b82f6' },
                    { label: 'Juggle Success Rate', value: stats.total_juggles > 0 ? `${((stats.sold_products / stats.total_juggles) * 100).toFixed(1)}%` : '0%', color: '#a855f7' },
                    { label: 'Pyramid Fill Rate', value: stats.completed_pyramids > 0 ? `${((stats.completed_pyramids / (stats.active_pyramids + stats.completed_pyramids)) * 100).toFixed(0)}%` : '0%', color: '#eab308' }
                  ].map((stat, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                      <span style={{ color: '#888', fontSize: '0.85rem' }}>{stat.label}</span>
                      <span style={{ color: stat.color, fontWeight: '700', fontFamily: 'monospace', fontSize: '1.1rem' }}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setSelectedDoc(null)}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img src={selectedDoc.startsWith('http') ? selectedDoc : `${API_BASE.replace('/api', '')}${selectedDoc}`} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '100%', border: '2px solid white', borderRadius: '0.5rem' }} />
            <div style={{ position: 'absolute', top: '-40px', right: 0, color: 'white', cursor: 'pointer' }}>
              <X size={32} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;