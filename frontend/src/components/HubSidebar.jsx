import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Info, Zap, Layers } from 'lucide-react';

const navItems = [
  { label: 'Hub', path: '/', icon: LayoutDashboard },
  { label: 'How It Works', path: '/#how-it-works', icon: Info },
  { label: 'Prototype Feed', path: '/#feed', icon: Zap },
];

function HubSidebar() {
  const { pathname } = useLocation();

  return (
    <aside style={{
      width: '220px',
      flexShrink: 0,
      background: '#000000',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1rem',
      position: 'fixed',
      left: 0,
      top: 0,
      height: '100vh',
      zIndex: 100,
      backdropFilter: 'blur(20px)',
    }}>
      {/* Logo / Brand */}
      <div style={{ marginBottom: '3rem', paddingLeft: '0.5rem' }}>
        <h2 style={{
          color: '#ffffff',
          fontSize: '1.5rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
        }}>Juggle</h2>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginTop: '0.2rem' }}>Juggler's Hub</p>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" active={pathname === '/'} />
        <SidebarLink to="/active-juggles" icon={Zap} label="Active Juggles" active={pathname === '/active-juggles'} />
        <SidebarLink to="/pyramid" icon={Layers} label="View Pyramid" active={pathname === '/pyramid'} />
      </nav>

      {/* Bottom separator */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
        <Link to="/shop" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            borderRadius: '0.75rem',
            color: 'var(--neon-purple)',
            border: '1px solid var(--neon-purple)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(192, 132, 252, 0.1)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(192, 132, 252, 0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <ShoppingBag size={18} />
            Buyer Marketplace
          </div>
        </Link>
      </div>
    </aside>
  );
}

function SidebarLink({ to, icon: Icon, label, active }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        borderRadius: '0.75rem',
        background: active ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
        color: active ? 'var(--neon-blue)' : 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '0.9rem',
        fontWeight: active ? 700 : 400,
        borderLeft: active ? '3px solid var(--neon-blue)' : '3px solid transparent',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.color = 'white';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
        }
      }}>
        <Icon size={18} />
        {label}
      </div>
    </Link>
  );
}

export default HubSidebar;
