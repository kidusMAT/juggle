import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingBag, ShoppingCart, Filter, Grid, List, 
  Search, ShieldCheck, Sparkles, Tag, X, ChevronRight, AlertCircle,
  Clock, Flame, Check, ExternalLink
} from 'lucide-react';
import api from '../api';
import Navbar from './Navbar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export default function BrandCollectionPage() {
  const { brandName = '' } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'direct', 'juggle'
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [cartAddingId, setCartAddingId] = useState(null);
  const [notification, setNotification] = useState({ message: '', type: 'success', visible: false });

  // Clean decoded brand name for display and queries
  const decodedBrand = decodeURIComponent(brandName).trim();

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3500);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get(`${API_BASE}/products/buyer_market/?brand=${encodeURIComponent(decodedBrand)}`);
        const allDeals = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        
        // Match brand case-insensitively
        const brandLower = decodedBrand.toLowerCase();
        const filtered = allDeals.filter(deal => {
          const b = (deal?.product?.brand || '').trim().toLowerCase();
          return b === brandLower || b.includes(brandLower) || brandLower.includes(b);
        });

        setProducts(filtered.length > 0 ? filtered : allDeals);
      } catch (err) {
        console.error('Failed to fetch brand products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [decodedBrand]);

  // Derive official brand title from data if available, else format decodedBrand
  const displayBrandName = useMemo(() => {
    if (products.length > 0 && products[0]?.product?.brand) {
      return products[0].product.brand;
    }
    return decodedBrand
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }, [products, decodedBrand]);

  // Extract unique categories available within this brand
  const brandCategories = useMemo(() => {
    const cats = new Set();
    products.forEach(d => {
      if (d?.product?.category_name) cats.add(d.product.category_name);
    });
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Statistics for hero section
  const brandStats = useMemo(() => {
    const total = products.length;
    const directCount = products.filter(d => d.is_direct).length;
    const juggleCount = total - directCount;
    
    let lowestPrice = Infinity;
    products.forEach(d => {
      const price = parseFloat(d.markup_price || d.product?.base_price || 0);
      if (price > 0 && price < lowestPrice) lowestPrice = price;
    });

    return {
      total,
      directCount,
      juggleCount,
      minPrice: lowestPrice !== Infinity ? lowestPrice : 0
    };
  }, [products]);

  // Filter & sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter(deal => {
      const p = deal?.product;
      if (!p) return false;

      // Search query filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(query);
        const matchesDesc = (p.description || '').toLowerCase().includes(query);
        const matchesCat = (p.category_name || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      // Category filter
      if (selectedCategory !== 'All' && p.category_name !== selectedCategory) {
        return false;
      }

      // Deal type filter
      if (selectedType === 'direct' && !deal.is_direct) return false;
      if (selectedType === 'juggle' && deal.is_direct) return false;

      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      const priceA = parseFloat(a.markup_price || a.product?.base_price || 0);
      const priceB = parseFloat(b.markup_price || b.product?.base_price || 0);
      switch (sortBy) {
        case 'price-low':
          return priceA - priceB;
        case 'price-high':
          return priceB - priceA;
        case 'name':
          return (a.product?.name || '').localeCompare(b.product?.name || '');
        case 'slots':
          return (b.amount || 0) - (a.amount || 0);
        default:
          return 0;
      }
    });
  }, [products, searchTerm, selectedCategory, selectedType, sortBy]);

  const handleAddToCart = async (deal, e) => {
    e.stopPropagation();
    if (!deal?.product) return;
    if (deal.id < 0) {
      showNotification('Demo preview item cannot be added to cart', 'error');
      return;
    }

    setCartAddingId(deal.id);
    try {
      await api.post('/cart/add_to_cart/', {
        product_id: deal.product.id,
        offer_id: deal.is_direct ? 'direct' : deal.id,
        quantity: 1,
      });
      window.dispatchEvent(new CustomEvent('cart-updated'));
      showNotification(`Added ${deal.product.name} to cart!`, 'success');
    } catch (err) {
      showNotification(err.response?.data?.error || `Could not add ${deal.product.name} to cart`, 'error');
    } finally {
      setCartAddingId(null);
    }
  };

  const formatPrice = (val) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Monogram for brand avatar (first 2 letters)
  const brandInitials = useMemo(() => {
    const parts = displayBrandName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayBrandName.slice(0, 2).toUpperCase();
  }, [displayBrandName]);

  return (
    <div className="buyer-brand-page" style={{ minHeight: '100vh', background: '#f8faf9', color: '#111' }}>
      <Navbar />

      {/* FLOATING NOTIFICATION TOAST */}
      {notification.visible && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 9999,
          background: notification.type === 'error' ? '#ef4444' : '#111',
          color: '#fff',
          padding: '1rem 1.5rem',
          borderRadius: '1rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          border: '1px solid rgba(255,255,255,0.15)',
          animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} color="#72f6c1" />}
          <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{notification.message}</span>
        </div>
      )}

      {/* BREADCRUMB & BACK STRIP */}
      <div style={{ background: '#0a0e0c', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0.75rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#8d9992' }}>
            <Link to="/shop" style={{ color: '#8d9992', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Marketplace
            </Link>
            <ChevronRight size={14} />
            <Link to="/brands" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Brands</Link>
            <ChevronRight size={14} />
            <span style={{ color: '#72f6c1', fontWeight: '700' }}>{displayBrandName}</span>
          </div>
          <button
            onClick={() => navigate('/shop')}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#fff',
              padding: '0.45rem 0.9rem',
              borderRadius: '0.65rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              transition: 'background 0.2s'
            }}
          >
            <ArrowLeft size={15} /> Back to Market
          </button>
        </div>
      </div>

      {/* BRAND HERO BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, #090e0c 0%, #111a15 60%, #0d1410 100%)',
        color: '#fff',
        padding: '3rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(114, 246, 193, 0.15)'
      }}>
        {/* Subtle decorative glow */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '5%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(114, 246, 193, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
            
            {/* Left: Brand Monogram & Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
              <div style={{
                width: '88px',
                height: '88px',
                borderRadius: '1.5rem',
                background: 'linear-gradient(135deg, rgba(114,246,193,0.2) 0%, rgba(114,246,193,0.05) 100%)',
                border: '2px solid rgba(114, 246, 193, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 35px rgba(114, 246, 193, 0.15)',
                color: '#72f6c1',
                fontSize: '2rem',
                fontWeight: '900',
                letterSpacing: '0.05em'
              }}>
                {brandInitials}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <h1 style={{ margin: 0, fontSize: '2.6rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
                    {displayBrandName}
                  </h1>
                  <span title="Verified Brand on Juggle" style={{ display: 'inline-flex' }}>
                    <ShieldCheck size={24} color="#72f6c1" />
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#9ba8a0', fontWeight: '500' }}>
                  Official brand collection & verified peer-to-peer listings on Juggle
                </p>
                <div className="brand-live-note">
                  <i /> Live Collection · Real-time market liquidity and direct drops
                </div>
              </div>
            </div>

            {/* Right: Quick Stats Cards */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.85rem 1.25rem',
                borderRadius: '1rem',
                minWidth: '110px'
              }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#8d9992', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                  Total Items
                </span>
                <strong style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff' }}>
                  {loading ? '—' : brandStats.total}
                </strong>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.85rem 1.25rem',
                borderRadius: '1rem',
                minWidth: '110px'
              }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#8d9992', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                  Live Juggles
                </span>
                <strong style={{ fontSize: '1.4rem', fontWeight: '900', color: '#c084fc' }}>
                  {loading ? '—' : brandStats.juggleCount}
                </strong>
              </div>

              {brandStats.minPrice > 0 && (
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '1rem',
                  minWidth: '120px'
                }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#8d9992', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                    Starts At
                  </span>
                  <strong style={{ fontSize: '1.4rem', fontWeight: '900', color: '#72f6c1' }}>
                    {loading ? '—' : formatPrice(brandStats.minPrice)}
                  </strong>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* CONTROLS & FILTER TOOLBAR */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5eae7',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          
          {/* Left Controls: Search & Category Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
            
            {/* Inline Brand Search */}
            <div style={{
              position: 'relative',
              width: '260px'
            }}>
              <Search size={16} color="#888" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={`Search in ${displayBrandName}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 2.2rem 0.6rem 2.4rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #dce3df',
                  background: '#f8faf9',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#888'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', padding: '2px 0' }}>
              {brandCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.5rem 0.9rem',
                    borderRadius: '2rem',
                    border: selectedCategory === cat ? '1px solid #000' : '1px solid #e0e6e2',
                    background: selectedCategory === cat ? '#000' : '#fff',
                    color: selectedCategory === cat ? '#fff' : '#555',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

          </div>

          {/* Right Controls: Type Filter, Sort, View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            
            {/* Type selector */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '0.65rem',
                border: '1px solid #dce3df',
                background: '#fff',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Listings</option>
              <option value="direct">Direct Sales</option>
              <option value="juggle">Live Juggles Only</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '0.65rem',
                border: '1px solid #dce3df',
                background: '#fff',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Product Name (A-Z)</option>
              <option value="slots">Most Available Slots</option>
            </select>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: '#f0f3f1', padding: '3px', borderRadius: '0.65rem', gap: '2px' }}>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                style={{
                  background: viewMode === 'grid' ? '#fff' : 'transparent',
                  color: viewMode === 'grid' ? '#000' : '#888',
                  border: 'none',
                  padding: '0.45rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'grid' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Grid size={17} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                style={{
                  background: viewMode === 'list' ? '#fff' : 'transparent',
                  color: viewMode === 'list' ? '#000' : '#888',
                  border: 'none',
                  padding: '0.45rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'list' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <List size={17} />
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        
        {/* Results Counter & Active Filters Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#687870', fontWeight: '600' }}>
            Showing <strong style={{ color: '#000' }}>{filteredAndSortedProducts.length}</strong> {filteredAndSortedProducts.length === 1 ? 'item' : 'items'} in {displayBrandName}
          </p>

          {(searchTerm || selectedCategory !== 'All' || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                setSelectedType('all');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <X size={14} /> Clear all filters
            </button>
          )}
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem', color: '#888' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e0e6e2',
              borderTopColor: '#000',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1.5rem'
            }} />
            <h3 style={{ margin: 0, fontWeight: '800', color: '#111' }}>Loading collection...</h3>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Fetching live assets for {displayBrandName}</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          
          /* EMPTY STATE */
          <div style={{
            background: '#fff',
            borderRadius: '2rem',
            padding: '5rem 2rem',
            textAlign: 'center',
            border: '2px dashed #dbe3de',
            maxWidth: '650px',
            margin: '2rem auto'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#f1f5f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#8d9992'
            }}>
              <ShoppingBag size={28} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: '900', color: '#111' }}>
              No products found
            </h3>
            <p style={{ margin: '0 0 1.5rem', color: '#687870', fontSize: '0.9rem' }}>
              {searchTerm || selectedCategory !== 'All' || selectedType !== 'all'
                ? "No items match your selected filters. Try broadening your criteria."
                : `Currently no active listings available for ${displayBrandName}. Check back soon.`}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {(searchTerm || selectedCategory !== 'All' || selectedType !== 'all') ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All');
                    setSelectedType('all');
                  }}
                  className="btn-checkout"
                  style={{ width: 'auto', padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  onClick={() => navigate('/shop')}
                  className="btn-checkout"
                  style={{ width: 'auto', padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}
                >
                  Explore Other Brands
                </button>
              )}
            </div>
          </div>

        ) : viewMode === 'grid' ? (

          /* ========================================= */
          /* GRID VIEW                                 */
          /* ========================================= */
          <div className="brand-collection-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '1.75rem'
          }}>
            {filteredAndSortedProducts.map((deal) => {
              const product = deal.product;
              const imageUrl = product?.image
                ? `${API_BASE.replace('/api', '')}${product.image}`
                : (product?.image_url || null);
              const price = deal.markup_price || product?.base_price;
              const isDirect = deal.is_direct;

              return (
                <div
                  key={deal.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  style={{
                    background: '#fff',
                    borderRadius: '1.5rem',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    border: '1px solid #edf1ee',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
                  }}
                >
                  {/* Card Image */}
                  <div style={{
                    height: '240px',
                    background: imageUrl ? `url(${imageUrl}) center/cover` : '#eef2ef',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid #f0f3f1'
                  }}>
                    {/* Deal Type Badge */}
                    {!isDirect ? (
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        left: '1rem',
                        background: 'rgba(192, 132, 252, 0.92)',
                        color: '#000',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '2rem',
                        fontSize: '0.7rem',
                        fontWeight: '900',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backdropFilter: 'blur(6px)',
                        boxShadow: '0 4px 12px rgba(192, 132, 252, 0.3)'
                      }}>
                        <Flame size={13} /> LIVE JUGGLE
                      </div>
                    ) : (
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        left: '1rem',
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: '#fff',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '2rem',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        letterSpacing: '0.05em',
                        backdropFilter: 'blur(6px)'
                      }}>
                        DIRECT DROP
                      </div>
                    )}

                    {/* Category pill */}
                    {product?.category_name && (
                      <div style={{
                        position: 'absolute',
                        bottom: '0.85rem',
                        left: '0.85rem',
                        background: 'rgba(255, 255, 255, 0.92)',
                        color: '#111',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        backdropFilter: 'blur(4px)'
                      }}>
                        {product.category_name}
                      </div>
                    )}

                    {/* Slots left badge */}
                    {!isDirect && deal.amount && (
                      <div style={{
                        position: 'absolute',
                        bottom: '0.85rem',
                        right: '0.85rem',
                        background: 'rgba(0, 0, 0, 0.85)',
                        color: '#fff',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.68rem',
                        fontWeight: '800'
                      }}>
                        {deal.amount} {deal.amount === 1 ? 'SLOT LEFT' : 'SLOTS LEFT'}
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.04em' }}>
                      {product?.brand}
                    </p>
                    <h3 style={{ margin: '0.35rem 0 0.5rem', fontSize: '1.15rem', fontWeight: '800', color: '#111', lineHeight: '1.3' }}>
                      {product?.name}
                    </h3>
                    
                    {product?.description && (
                      <p style={{
                        margin: '0 0 1rem',
                        fontSize: '0.82rem',
                        color: '#666',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: '1.4'
                      }}>
                        {product.description}
                      </p>
                    )}

                    {/* Price & Actions */}
                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f3f5f3' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#8d9992', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>
                            {isDirect ? 'Direct Price' : 'Market Price'}
                          </span>
                          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#000' }}>
                            {formatPrice(price)}
                          </span>
                        </div>
                        {!isDirect && deal.juggler_name && (
                          <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '600' }}>
                            by {deal.juggler_name}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          aria-label={`Add ${product?.name} to cart`}
                          disabled={cartAddingId === deal.id}
                          onClick={(e) => handleAddToCart(deal, e)}
                          style={{
                            background: '#f1f5f2',
                            border: '1px solid #dce4de',
                            borderRadius: '0.75rem',
                            width: '42px',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#111',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#e5ece7'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f2'}
                        >
                          <ShoppingCart size={17} />
                        </button>
                        
                        <button
                          className="btn-checkout"
                          style={{
                            flex: 1,
                            padding: '0.65rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: '900',
                            borderRadius: '0.75rem'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/product/${product.id}`);
                          }}
                        >
                          VIEW PRODUCT
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ========================================= */
          /* LIST VIEW                                 */
          /* ========================================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredAndSortedProducts.map((deal) => {
              const product = deal.product;
              const imageUrl = product?.image
                ? `${API_BASE.replace('/api', '')}${product.image}`
                : (product?.image_url || null);
              const price = deal.markup_price || product?.base_price;
              const isDirect = deal.is_direct;

              return (
                <div
                  key={deal.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  style={{
                    background: '#fff',
                    borderRadius: '1.25rem',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    border: '1px solid #edf1ee',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    padding: '1.25rem',
                    gap: '1.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.07)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.03)';
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: '140px',
                    height: '140px',
                    borderRadius: '1rem',
                    background: imageUrl ? `url(${imageUrl}) center/cover` : '#eef2ef',
                    flexShrink: 0,
                    position: 'relative'
                  }}>
                    {!isDirect && (
                      <span style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        background: 'rgba(192, 132, 252, 0.95)',
                        color: '#000',
                        fontSize: '0.62rem',
                        fontWeight: '900',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '1rem'
                      }}>
                        LIVE
                      </span>
                    )}
                  </div>

                  {/* Middle Info */}
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '800', textTransform: 'uppercase' }}>
                        {product?.brand}
                      </span>
                      {product?.category_name && (
                        <>
                          <span style={{ color: '#ccc' }}>•</span>
                          <span style={{ fontSize: '0.72rem', color: '#159b6d', fontWeight: '700' }}>
                            {product.category_name}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: '900', color: '#111' }}>
                      {product?.name}
                    </h3>
                    
                    {product?.description && (
                      <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#666', lineHeight: '1.4', maxWidth: '650px' }}>
                        {product.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#777' }}>
                      <span>{isDirect ? 'Direct Marketplace Drop' : `Juggled by ${deal.juggler_name || 'Trader'}`}</span>
                      {!isDirect && deal.amount && (
                        <>
                          <span>•</span>
                          <span style={{ fontWeight: '700', color: '#ef4444' }}>{deal.amount} slots remaining</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Actions & Price */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '0.85rem',
                    minWidth: '200px'
                  }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.68rem', color: '#8d9992', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>
                        Current Price
                      </span>
                      <strong style={{ fontSize: '1.6rem', fontWeight: '900', color: '#000' }}>
                        {formatPrice(price)}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <button
                        onClick={(e) => handleAddToCart(deal, e)}
                        disabled={cartAddingId === deal.id}
                        style={{
                          background: '#f1f5f2',
                          border: '1px solid #dce4de',
                          borderRadius: '0.75rem',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#111'
                        }}
                      >
                        <ShoppingCart size={17} />
                      </button>

                      <button
                        className="btn-checkout"
                        style={{
                          flex: 1,
                          padding: '0.65rem 1.25rem',
                          fontSize: '0.8rem',
                          fontWeight: '900',
                          borderRadius: '0.75rem'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/product/${product.id}`);
                        }}
                      >
                        VIEW PRODUCT
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        )}

      </div>

    </div>
  );
}
