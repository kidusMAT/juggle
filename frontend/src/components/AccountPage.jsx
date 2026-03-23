import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import { 
  User, Wallet, TrendingUp, History, ArrowRight, 
  LogOut, Settings, LayoutDashboard, ShoppingBag, 
  ChevronRight, Chrome, LogIn, ShieldCheck, UserPlus,
  Zap
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

function AccountPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [isTopUpProcessing, setIsTopUpProcessing] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/users/me/`, { withCredentials: true });
      setUserData(res.data);
    } catch (err) {
      console.error(err);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleBecomeJuggler = () => {
    setShowTopUpModal(true);
  };

  const handleConfirmTopUp = async () => {
    setIsTopUpProcessing(true);
    try {
      // 1. Top up 10 birr
      await axios.post(`${API_BASE}/api/users/top_up/`, { amount: 10 }, { withCredentials: true });
      // 2. Become Juggler
      await axios.post(`${API_BASE}/api/users/become_juggler/`, {}, { withCredentials: true });
      // 3. Redirect to Juggler Hub
      window.location.href = '/'; 
    } catch (err) {
      console.error(err);
      alert("Failed to process top-up. Please try again.");
    } finally {
      setIsTopUpProcessing(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/accounts/google/login/`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await axios.post(`${API_BASE}/api/users/login_user/`, loginData, { withCredentials: true });
      setUserData(res.data);
      window.location.reload(); 
    } catch (err) {
      setAuthError('Invalid username or password');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/api/users/logout_user/`, {}, { withCredentials: true });
      setUserData(null);
      window.location.href = '/shop'; 
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <Navbar />
        <p className="text-muted" style={{ marginTop: '4rem' }}>Loading workspace...</p>
      </div>
    );
  }

  // LOGIN VIEW (If not authenticated)
  if (!userData) {
    return (
      <div className="container" style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
          <div className="card-neo" style={{ maxWidth: '450px', width: '100%' }}>
            <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '1.5rem', background: 'var(--neon-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(192, 132, 252, 0.3)' }}>
                <LogIn size={30} color="#000" />
              </div>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>My Account</h1>
              <p className="text-muted">Sign in to manage your Juggles and Wallet</p>
            </header>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <input 
                type="text" 
                placeholder="Username" 
                className="input-neon"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} 
                value={loginData.username}
                onChange={e => setLoginData({...loginData, username: e.target.value})}
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="input-neon"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }} 
                value={loginData.password}
                onChange={e => setLoginData({...loginData, password: e.target.value})}
                required
              />
              {authError && <p style={{ color: '#ff4d4f', fontSize: '0.8rem', margin: 0 }}>{authError}</p>}
              <button type="submit" className="btn-checkout" style={{ background: 'var(--neon-purple)', color: '#000' }}>
                LOGIN <ArrowRight size={20} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <span className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Social Access</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              </div>
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="btn-checkout" 
                style={{ background: '#fff', color: '#000', border: '1px solid #ddd' }}
              >
                <Chrome size={20} /> Continue with Google
              </button>
              <Link to="/signup">
                <button type="button" className="btn-checkout" style={{ background: 'var(--neon-green)', marginTop: '1rem', border: 'none' }}>
                  CREATE NEW ACCOUNT <ArrowRight size={20} />
                </button>
              </Link>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // AUTHENTICATED VIEW WITH SIDEBAR
  return (
    <div className="container" style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1, gap: '2rem', marginTop: '2rem', overflow: 'hidden' }}>
        
        {/* SIDEBAR */}
        <aside style={{ 
          width: '320px', 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid rgba(255,255,255,0.05)', 
          borderRadius: '1.5rem',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          height: '100%',
          overflowY: 'auto'
        }}>
          {/* User Profile Summary */}
          <div style={{ textAlign: 'center', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-green))', 
              margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.1)' 
            }}>
              <User size={40} color="#000" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{userData.username}</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {userData.is_juggler ? 'Master Juggler' : 'Market Buyer'}
            </p>
          </div>

          {/* Nav Items */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SidebarItem 
              icon={<LayoutDashboard size={18} />} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={<ShoppingBag size={18} />} 
              label="My Orders" 
              active={activeTab === 'orders'} 
              onClick={() => setActiveTab('orders')} 
            />
            <SidebarItem 
              icon={<Settings size={18} />} 
              label="Settings" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
            
            {!userData.is_juggler && (
              <div style={{ marginTop: '1rem' }}>
                <button 
                  onClick={handleBecomeJuggler}
                  style={{ 
                    width: '100%', padding: '0.75rem', borderRadius: '0.75rem', 
                    background: 'var(--neon-green)', color: '#000', border: 'none', 
                    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}
                >
                  <Zap size={14} /> EARN PROFIT
                </button>
              </div>
            )}
          </nav>

          {/* Bottom Actions */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              style={{ 
                width: '100%', padding: '0.75rem', borderRadius: '0.75rem', 
                background: 'transparent', color: '#ff4d4f', border: '1px solid rgba(255,77,79,0.2)', 
                fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>

        {/* MODAL: Logout Confirmation */}
        {showLogoutConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem', border: '2px solid var(--neon-purple)', boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(255,77,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(255,77,79,0.2)' }}>
                <LogOut size={32} color="#ff4d4f" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Signing Out?</h2>
              <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '2.5rem' }}>Are you sure you want to end your current session? You'll need to sign back in to access your vault.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button onClick={() => setShowLogoutConfirm(false)} className="btn-checkout" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>CANCEL</button>
                <button onClick={handleLogout} className="btn-checkout" style={{ background: '#ff4d4f', color: '#fff', fontSize: '0.8rem' }}>LOGOUT</button>
              </div>
            </div>
          </div>
        )}
        {/* MODAL: Top Up Confirmation */}
        {showTopUpModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem', border: '2px solid var(--neon-green)', boxShadow: '0 0 30px rgba(52, 211, 153, 0.2)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                <Wallet size={32} color="var(--neon-green)" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Staking Reqquired</h2>
              <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '2.5rem' }}>To unlock "Earn Profit" mode and join the Scarcity Auction, you must stake **10 ETB** into your actual balance. This will be added to your account instantly.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <button 
                  onClick={handleConfirmTopUp} 
                  disabled={isTopUpProcessing}
                  className="btn-checkout" 
                  style={{ background: 'var(--neon-green)', color: '#000', fontSize: '0.9rem', fontWeight: 'bold' }}
                >
                  {isTopUpProcessing ? 'PROCESSING...' : 'CONFIRM & STAKE 10 ETB'}
                </button>
                <button 
                  onClick={() => setShowTopUpModal(false)} 
                  disabled={isTopUpProcessing}
                  style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  MAYBE LATER
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT AREA */}
        <main style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
          {activeTab === 'dashboard' && <DashboardTab userData={userData} />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'settings' && <SettingsTab userData={userData} />}
        </main>

      </div>
    </div>
  );
}

// SUB-COMPONENTS for cleaner code

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: 'none', color: active ? 'var(--neon-green)' : '#aaa',
        cursor: 'pointer', transition: 'all 0.2s', fontWeight: active ? '700' : '500',
        fontSize: '0.9rem'
      }}
    >
      {icon}
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {active && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--neon-green)' }} />}
    </button>
  );
}

function DashboardTab({ userData }) {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', letterSpacing: '-0.02em' }}>Dashboard Overview</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(82, 255, 168, 0.05), transparent)', border: '1px solid rgba(82, 255, 168, 0.1)' }}>
          <p className="text-muted" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em' }}>Actual Balance</p>
          <h3 style={{ fontSize: '3rem', margin: '0.5rem 0', color: 'var(--neon-green)' }}>ETB {userData.actual_balance}</h3>
          <p style={{ fontSize: '0.85rem', color: '#aaa' }}>Withdraw anytime to your safe account</p>
        </div>

        <div className="card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05), transparent)', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
          <p className="text-muted" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em' }}>Virtual Current Balance</p>
          <h3 style={{ fontSize: '3rem', margin: '0.5rem 0', color: 'var(--neon-purple)', fontFamily: 'monospace' }}>{userData.current_cb} <span style={{fontSize: '1rem'}}>CB</span></h3>
          <p style={{ fontSize: '0.85rem', color: '#aaa' }}>Fluctuates every 5 minutes</p>
        </div>
      </div>

      <div style={{ marginTop: '2.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Recent Activity</h3>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
          <p className="text-muted">No recent deal activity found.</p>
          <Link to="/shop" style={{ color: 'var(--neon-green)', textDecoration: 'none', fontWeight: '700', marginTop: '1rem', display: 'inline-block' }}>Visit Marketplace &rarr;</Link>
        </div>
      </div>
    </div>
  );
}

function OrdersTab() {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', letterSpacing: '-0.02em' }}>Transaction History</h2>
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#666' }}>DATE</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#666' }}>ORDER ID</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#666' }}>STATUS</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="4" style={{ padding: '4rem', textAlign: 'center', color: '#666' }}>No orders found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab({ userData }) {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', letterSpacing: '-0.02em' }}>Account Settings</h2>
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>USERNAME</label>
            <input type="text" defaultValue={userData.username} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff' }} disabled />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>EMAIL ADDRESS</label>
            <input type="email" defaultValue={userData.email || "not provided"} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff' }} disabled />
          </div>
        </div>
        
        <div style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(255,77,79,0.05)', border: '1px solid rgba(255,77,79,0.1)' }}>
          <h4 style={{ color: '#ff4d4f', margin: '0 0 0.5rem 0' }}>Security Actions</h4>
          <p style={{ fontSize: '0.85rem', color: '#aaa', margin: '0 0 1rem 0' }}>Once you delete your account, there is no going back. Please be certain.</p>
          <button style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
