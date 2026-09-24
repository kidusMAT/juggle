import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api';
import Navbar from './Navbar';
import { useAuth } from '../AuthContext';
import {
  User, Wallet, TrendingUp, History, ArrowRight,
  LogOut, Settings, LayoutDashboard, ShoppingBag,
  ChevronRight, Chrome, LogIn, ShieldCheck, UserPlus,
  Zap, Activity, ArrowDownLeft, ArrowUpRight, DollarSign
} from 'lucide-react';

function AccountPage() {
  const { user: userData, authStatus, login: ctxLogin, logout: ctxLogout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isTopUpProcessing, setIsTopUpProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState('input');
  const [paymentError, setPaymentError] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'juggler_success' || params.get('payment') === 'deposit_success') {
      refreshUser();
      window.history.replaceState({}, '', '/account');
    }
  }, [refreshUser]);

  const handleBecomeJuggler = () => {
    setPaymentStep('input');
    setPaymentError('');
    setShowTopUpModal(true);
  };

  const handleConfirmTopUp = async () => {
    setIsTopUpProcessing(true);
    setPaymentStep('processing');
    setPaymentError('');

    try {
      const res = await api.post('/users/become_juggler/', {});
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      setPaymentStep('error');
      setPaymentError(err.response?.data?.error || 'Payment failed. Please try again.');
      setIsTopUpProcessing(false);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      setPaymentError('Please enter a valid amount');
      return;
    }

    setIsTopUpProcessing(true);
    setPaymentStep('processing');
    setPaymentError('');

    try {
      const res = await api.post('/users/deposit/', { amount });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      setPaymentStep('error');
      setPaymentError(err.response?.data?.error || 'Deposit failed. Please try again.');
      setIsTopUpProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setPaymentError('Please enter a valid amount');
      return;
    }
    if (!withdrawPhone || withdrawPhone.length < 9) {
      setPaymentError('Please enter a valid phone number');
      return;
    }

    setIsTopUpProcessing(true);
    setPaymentStep('processing');
    setPaymentError('');

    try {
      await api.post('/users/withdraw/', { amount, phone_number: withdrawPhone });
      setPaymentStep('success');
      refreshUser();
      setTimeout(() => {
        setShowWithdrawModal(false);
        setPaymentStep('input');
      }, 2000);
    } catch (err) {
      setPaymentStep('error');
      setPaymentError(err.response?.data?.error || 'Withdrawal failed. Please try again.');
    } finally {
      setIsTopUpProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setShowTopUpModal(false);
    setShowDepositModal(false);
    setShowWithdrawModal(false);
    setPaymentStep('input');
    setPaymentError('');
    setDepositAmount('');
    setWithdrawAmount('');
    setWithdrawPhone('');
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE.replace('/api', '')}/accounts/google/login/`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await api.post('/users/login_user/', loginData);
      ctxLogin(res.data);
      navigate('/');
    } catch {
      setAuthError('Invalid username or password');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/users/logout_user/', {});
      ctxLogout();
      navigate('/shop');
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // Show nothing auth-specific while session check is in flight
  if (authStatus === 'loading') {
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
              icon={<Wallet size={18} />} 
              label="Transactions" 
              active={activeTab === 'transactions'} 
              onClick={() => setActiveTab('transactions')} 
            />
            <SidebarItem 
              icon={<Settings size={18} />} 
              label="Settings" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
            
            {!userData.is_juggler && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ 
                  fontSize: '0.7rem', color: '#999', marginBottom: '0.5rem', 
                  textAlign: 'center', lineHeight: '1.3' 
                }}>
                  Pay ETB 10 via Chapa to unlock
                </div>
                <button 
                  onClick={handleBecomeJuggler}
                  style={{ 
                    width: '100%', padding: '0.75rem', borderRadius: '0.75rem', 
                    background: 'var(--neon-green)', 
                    color: '#000', border: 'none', 
                    fontWeight: '700', fontSize: '0.85rem', 
                    cursor: 'pointer',
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

        {/* MODAL: Become a Juggler */}
        {showTopUpModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem', border: '2px solid var(--neon-green)', boxShadow: '0 0 30px rgba(52, 211, 153, 0.2)' }}>
              {paymentStep === 'input' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                    <Wallet size={32} color="var(--neon-green)" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Become a Juggler</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Unlock the Juggler Hub to start juggling products, earn from price markups, and climb the pyramid tiers.
                  </p>
                  
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ color: '#888', fontSize: '0.9rem' }}>Access Fee</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: '700' }}>ETB 10.00</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888', fontSize: '0.9rem' }}>Payment Method</span>
                      <span style={{ color: '#fff', fontWeight: '700' }}>Chapa (TeleBirr, CBE, Amole)</span>
                    </div>
                  </div>

                  {paymentError && (
                    <p style={{ color: '#ff4d4f', fontSize: '0.85rem', marginBottom: '1rem' }}>{paymentError}</p>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button onClick={handleCloseModal} className="btn-checkout" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>CANCEL</button>
                    <button onClick={handleConfirmTopUp} disabled={isTopUpProcessing} className="btn-checkout" style={{ background: 'var(--neon-green)', color: '#000', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {isTopUpProcessing ? 'REDIRECTING...' : 'PAY & UNLOCK'}
                    </button>
                  </div>
                </>
              )}

              {paymentStep === 'processing' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(52, 211, 153, 0.3)', borderTopColor: 'var(--neon-green)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Redirecting to Chapa...</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>Complete your payment on the Chapa checkout page.</p>
                </>
              )}

              {paymentStep === 'error' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(255,77,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(255,77,79,0.2)' }}>
                    <span style={{ fontSize: '32px', color: '#ff4d4f' }}>✕</span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: '#ff4d4f' }}>Payment Failed</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>{paymentError}</p>
                  <button onClick={handleCloseModal} className="btn-checkout" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', width: '100%' }}>TRY AGAIN</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Deposit */}
        {showDepositModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem', border: '2px solid var(--neon-green)', boxShadow: '0 0 30px rgba(52, 211, 153, 0.2)' }}>
              {paymentStep === 'input' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                    <Wallet size={32} color="var(--neon-green)" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Deposit Funds</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>Add ETB to your balance via Chapa. Supports TeleBirr, CBE Birr, Amole, and more.</p>
                  
                  <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '0.5rem', fontWeight: '600' }}>Amount (ETB)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="1"
                      style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '2px solid rgba(52, 211, 153, 0.3)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1.1rem', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      {[100, 500, 1000, 5000].map(amt => (
                        <button key={amt} onClick={() => setDepositAmount(amt)} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', color: 'var(--neon-green)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentError && <p style={{ color: '#ff4d4f', fontSize: '0.85rem', marginBottom: '1rem' }}>{paymentError}</p>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button onClick={handleCloseModal} className="btn-checkout" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>CANCEL</button>
                    <button onClick={handleDeposit} disabled={isTopUpProcessing || !depositAmount} className="btn-checkout" style={{ background: depositAmount ? 'var(--neon-green)' : '#444', color: '#000', fontSize: '0.8rem', fontWeight: 'bold', opacity: depositAmount ? 1 : 0.5, cursor: depositAmount ? 'pointer' : 'not-allowed' }}>
                      {isTopUpProcessing ? 'REDIRECTING...' : 'DEPOSIT'}
                    </button>
                  </div>
                </>
              )}

              {paymentStep === 'processing' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(52, 211, 153, 0.3)', borderTopColor: 'var(--neon-green)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Redirecting to Chapa...</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>Complete your payment on the Chapa checkout page.</p>
                </>
              )}

              {paymentStep === 'error' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(255,77,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(255,77,79,0.2)' }}>
                    <span style={{ fontSize: '32px', color: '#ff4d4f' }}>✕</span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: '#ff4d4f' }}>Deposit Failed</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>{paymentError}</p>
                  <button onClick={handleCloseModal} className="btn-checkout" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', width: '100%' }}>TRY AGAIN</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Withdraw */}
        {showWithdrawModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem', border: '2px solid var(--neon-purple)', boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)' }}>
              {paymentStep === 'input' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <Wallet size={32} color="var(--neon-purple)" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Withdraw Funds</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>Cash out your earnings to TeleBirr. Funds arrive instantly.</p>
                  
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888', fontSize: '0.9rem' }}>Available Balance</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: '700' }}>ETB {userData?.actual_balance || '0.00'}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '0.5rem', fontWeight: '600' }}>Amount (ETB)</label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Enter amount"
                      max={userData?.actual_balance}
                      style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '2px solid rgba(168, 85, 247, 0.3)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1.1rem', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '0.5rem', fontWeight: '600' }}>TeleBirr Phone Number</label>
                    <input
                      type="tel"
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                      placeholder="09XXXXXXXX"
                      style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '2px solid rgba(168, 85, 247, 0.3)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1.1rem', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {paymentError && <p style={{ color: '#ff4d4f', fontSize: '0.85rem', marginBottom: '1rem' }}>{paymentError}</p>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button onClick={handleCloseModal} className="btn-checkout" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>CANCEL</button>
                    <button onClick={handleWithdraw} disabled={isTopUpProcessing || !withdrawAmount || !withdrawPhone} className="btn-checkout" style={{ background: withdrawAmount && withdrawPhone ? 'var(--neon-purple)' : '#444', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', opacity: withdrawAmount && withdrawPhone ? 1 : 0.5, cursor: withdrawAmount && withdrawPhone ? 'pointer' : 'not-allowed' }}>
                      {isTopUpProcessing ? 'PROCESSING...' : 'WITHDRAW'}
                    </button>
                  </div>
                </>
              )}

              {paymentStep === 'processing' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(168, 85, 247, 0.3)', borderTopColor: 'var(--neon-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Processing Withdrawal...</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>Sending funds to your TeleBirr account.</p>
                </>
              )}

              {paymentStep === 'success' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                    <span style={{ fontSize: '32px' }}>✓</span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: 'var(--neon-green)' }}>Withdrawal Successful!</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>Funds sent to your TeleBirr account.</p>
                </>
              )}

              {paymentStep === 'error' && (
                <>
                  <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(255,77,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(255,77,79,0.2)' }}>
                    <span style={{ fontSize: '32px', color: '#ff4d4f' }}>✕</span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: '#ff4d4f' }}>Withdrawal Failed</h2>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>{paymentError}</p>
                  <button onClick={handleCloseModal} className="btn-checkout" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', width: '100%' }}>TRY AGAIN</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* CONTENT AREA */}
        <main style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
          {activeTab === 'dashboard' && <DashboardTab userData={userData} onDeposit={() => { setPaymentStep('input'); setShowDepositModal(true); }} onWithdraw={() => { setPaymentStep('input'); setShowWithdrawModal(true); }} />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'transactions' && <TransactionsTab />}
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

function DashboardTab({ userData, onDeposit, onWithdraw }) {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', letterSpacing: '-0.02em' }}>Dashboard Overview</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(82, 255, 168, 0.05), transparent)', border: '1px solid rgba(82, 255, 168, 0.1)' }}>
          <p className="text-muted" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em' }}>Actual Balance</p>
          <h3 style={{ fontSize: '3rem', margin: '0.5rem 0', color: 'var(--neon-green)' }}>ETB {userData.actual_balance}</h3>
          <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1rem' }}>Withdraw anytime to your TeleBirr</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onDeposit} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--neon-green)', color: '#000', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>+ DEPOSIT</button>
            <button onClick={onWithdraw} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', background: 'transparent', color: 'var(--neon-purple)', border: '1px solid var(--neon-purple)', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>WITHDRAW</button>
          </div>
        </div>

        <div className="card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05), transparent)', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
          <p className="text-muted" style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em' }}>Virtual Current Balance</p>
          <h3 style={{ fontSize: '3rem', margin: '0.5rem 0', color: 'var(--neon-purple)', fontFamily: 'monospace' }}>{Math.floor(userData.current_cb)} <span style={{fontSize: '1rem'}}>CB</span></h3>
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

function TransactionsTab() {
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
      console.error("Error fetching transactions", err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'DEPOSIT': return <ArrowDownLeft size={16} color="#22c55e" />;
      case 'WITHDRAWAL': return <ArrowUpRight size={16} color="#ef4444" />;
      case 'PURCHASE': return <ShoppingBag size={16} color="#3b82f6" />;
      case 'SALE': return <DollarSign size={16} color="#22c55e" />;
      case 'JUGGLE_PROFIT': return <Zap size={16} color="#a855f7" />;
      default: return <Activity size={16} color="#888" />;
    }
  };

  const getTransactionColor = (type) => {
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
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <Activity size={32} className="timer-neon" />
        <p style={{ marginTop: '1rem', color: '#888' }}>Loading transactions...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', letterSpacing: '-0.02em' }}>Transaction History</h2>
      
      {transactions.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <Activity size={48} color="#888" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p className="text-muted">No transactions yet</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#666' }}>TYPE</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#666' }}>DESCRIPTION</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>AMOUNT</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>BALANCE</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: '#666' }}>DATE</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getTransactionIcon(tx.transaction_type)}
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{tx.transaction_type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#666' }}>{tx.description}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: getTransactionColor(tx.transaction_type) }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} ETB
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {tx.balance_after} ETB
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: '#888' }}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
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
      console.error("Error fetching orders", err);
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
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <Activity size={32} className="timer-neon" />
        <p style={{ marginTop: '1rem', color: '#888' }}>Loading orders...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', letterSpacing: '-0.02em' }}>My Orders</h2>
      
      {orders.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <ShoppingBag size={48} color="#888" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p className="text-muted">No orders yet</p>
          <Link to="/shop" style={{ color: 'var(--neon-green)', textDecoration: 'none', fontWeight: '700', marginTop: '1rem', display: 'inline-block' }}>Start Shopping &rarr;</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {orders.map(order => (
            <div key={order.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Order #{order.id}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#888', margin: '0.25rem 0 0' }}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span style={{ 
                  padding: '0.25rem 0.75rem', borderRadius: '1rem', 
                  fontSize: '0.75rem', fontWeight: '600',
                  background: `${getStatusColor(order.status)}20`,
                  color: getStatusColor(order.status),
                  border: `1px solid ${getStatusColor(order.status)}40`
                }}>
                  {order.status}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {order.product_image && (
                  <div style={{ width: '60px', height: '60px', borderRadius: '0.5rem', background: `url(${order.product_image}) center/cover`, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', margin: 0 }}>{order.product_name}</p>
                  <p style={{ fontSize: '0.85rem', color: '#888', margin: '0.25rem 0 0' }}>Qty: {order.quantity}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '700', color: 'var(--neon-green)', margin: 0 }}>ETB {order.total_price}</p>
                  {order.tracking_number && (
                    <p style={{ fontSize: '0.75rem', color: '#888', margin: '0.25rem 0 0' }}>
                      Tracking: {order.tracking_number}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ userData }) {
  const [profileData, setProfileData] = useState({
    username: userData.username,
    email: userData.email || '',
    seller_full_name: userData.seller_full_name || '',
    business_name: userData.business_name || '',
    seller_phone: userData.seller_phone || '',
    tin_number: userData.tin_number || '',
  });
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      await api.post('/users/update_profile/', profileData);
      setStatus({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/users/change_password/', {
        old_password: passwords.old,
        new_password: passwords.new
      });
      setStatus({ type: 'success', message: 'Password changed successfully!' });
      setPasswords({ old: '', new: '', confirm: '' });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Password change failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', letterSpacing: '-0.02em' }}>Account Settings</h2>
      
      {status.message && (
        <div style={{ 
          padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem',
          background: status.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 77, 79, 0.1)',
          border: `1px solid ${status.type === 'success' ? 'var(--neon-green)' : '#ff4d4f'}`,
          color: status.type === 'success' ? 'var(--neon-green)' : '#ff4d4f',
          fontSize: '0.9rem'
        }}>
          {status.message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Profile Info */}
        <form onSubmit={handleUpdateProfile} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Personal Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>USERNAME</label>
              <input 
                type="text" 
                value={profileData.username} 
                onChange={e => setProfileData({...profileData, username: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', color: '#000', outline: 'none' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>EMAIL ADDRESS</label>
              <input 
                type="email" 
                value={profileData.email} 
                onChange={e => setProfileData({...profileData, email: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', color: '#000', outline: 'none' }} 
              />
            </div>
          </div>

          <h3 style={{ fontSize: '1.2rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Seller Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>FULL NAME</label>
              <input 
                type="text" 
                value={profileData.seller_full_name} 
                onChange={e => setProfileData({...profileData, seller_full_name: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', color: '#000', outline: 'none' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>BUSINESS NAME</label>
              <input 
                type="text" 
                value={profileData.business_name} 
                onChange={e => setProfileData({...profileData, business_name: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', color: '#000', outline: 'none' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>PHONE NUMBER</label>
              <input 
                type="text" 
                value={profileData.seller_phone} 
                onChange={e => setProfileData({...profileData, seller_phone: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', color: '#000', outline: 'none' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>TIN NUMBER</label>
              <input 
                type="text" 
                value={profileData.tin_number} 
                onChange={e => setProfileData({...profileData, tin_number: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', color: '#000', outline: 'none' }} 
              />
            </div>
          </div>

          <button type="submit" className="btn-checkout" style={{ background: 'var(--neon-green)', color: '#000', marginTop: '1rem', width: 'fit-content', padding: '0.75rem 2rem' }} disabled={loading}>
            {loading ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Security</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>CURRENT PASSWORD</label>
              <input 
                type="password" 
                value={passwords.old} 
                onChange={e => setPasswords({...passwords, old: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', color: '#000', outline: 'none' }} 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>NEW PASSWORD</label>
                <input 
                  type="password" 
                  value={passwords.new} 
                  onChange={e => setPasswords({...passwords, new: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', color: '#000', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: '700', marginBottom: '0.5rem' }}>CONFIRM NEW PASSWORD</label>
                <input 
                  type="password" 
                  value={passwords.confirm} 
                  onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0.5rem', color: '#000', outline: 'none' }} 
                />
              </div>
            </div>
          </div>
          <button type="submit" className="btn-checkout" style={{ background: 'var(--neon-purple)', color: '#000', marginTop: '1rem', width: 'fit-content', padding: '0.75rem 2rem' }} disabled={loading}>
            {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
        </form>

        <div style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(255,77,79,0.05)', border: '1px solid rgba(255,77,79,0.1)' }}>
          <h4 style={{ color: '#ff4d4f', margin: '0 0 0.5rem 0' }}>Advanced Actions</h4>
          <p style={{ fontSize: '0.85rem', color: '#aaa', margin: '0 0 1rem 0' }}>Once you delete your account, there is no going back. Please be certain.</p>
          <button 
            onClick={() => { if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) { /* TODO: implement delete */ } }}
            style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
