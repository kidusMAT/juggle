import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { UserPlus, ArrowRight, Mail, Lock, User as UserIcon } from 'lucide-react';
import Navbar from './Navbar';

const API_BASE = 'http://localhost:8000';

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/users/signup_user/`, {
        username: formData.username,
        email: formData.email,
        password: formData.password
      }, { withCredentials: true });
      // Redirect to shop or account after signup
      window.location.href = '/shop';
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
        <div className="card-neo" style={{ maxWidth: '450px', width: '100%' }}>
          <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '1.5rem', background: 'var(--neon-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(74, 222, 128, 0.3)' }}>
              <UserPlus size={30} color="#000" />
            </div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>Join GOBeZ</h1>
            <p className="text-muted">Create your workspace and start Juggling</p>
          </header>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <UserIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input 
                type="text" 
                placeholder="Username" 
                className="input-neon"
                style={{ width: '100%', paddingLeft: '3rem', background: 'rgba(255,255,255,0.05)' }} 
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="input-neon"
                style={{ width: '100%', paddingLeft: '3rem', background: 'rgba(255,255,255,0.05)' }} 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input 
                type="password" 
                placeholder="Password" 
                className="input-neon"
                style={{ width: '100%', paddingLeft: '3rem', background: 'rgba(255,255,255,0.05)' }} 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input 
                type="password" 
                placeholder="Confirm Password" 
                className="input-neon"
                style={{ width: '100%', paddingLeft: '3rem', background: 'rgba(255,255,255,0.05)' }} 
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                required
              />
            </div>
            
            {error && <p style={{ color: '#ff4d4f', fontSize: '0.8rem', margin: 0 }}>{error}</p>}

            <button 
              type="submit" 
              className="btn-checkout" 
              disabled={loading}
              style={{ background: 'var(--neon-green)', color: '#000', marginTop: '1rem' }}
            >
              {loading ? 'CREATING...' : 'CREATE ACCOUNT'} <ArrowRight size={20} />
            </button>

            <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '1.5rem' }}>
              Already have an account? <Link to="/account" style={{ color: 'var(--neon-purple)', fontWeight: 'bold', textDecoration: 'none' }}>Log In</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

export default SignupPage;
