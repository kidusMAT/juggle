import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShoppingBag, Search, ShieldCheck, ChevronRight, ArrowLeft, 
  Tag, Flame, Sparkles, Filter, X, ArrowUpRight, Grid
} from 'lucide-react';
import api, { API_BASE } from '../api';
import Navbar from './Navbar';

const getFullUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE.replace('/api', '')}${path}`;
};

export default function BrandsPage() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLetter, setSelectedLetter] = useState('ALL');
  const [sortBy, setSortBy] = useState('popular'); // 'popular', 'name-asc', 'name-desc', 'items', 'price-low'

  useEffect(() => {
    const fetchBrandsData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/products/buyer_market/');
        const allDeals = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        
        // If marketplace has items, use them, otherwise fallback to standard products
        if (allDeals.length > 0) {
          setDeals(allDeals);
        } else {
          const prodRes = await api.get('/products/');
          const prods = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.results || []);
          // Wrap into deal shape
          setDeals(prods.map(p => ({ id: p.id, product: p, is_direct: true, markup_price: p.base_price })));
        }
      } catch (err) {
        console.error('Failed to fetch brands data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBrandsData();
    window.scrollTo(0, 0);
  }, []);

  // Aggregate deals into brand profiles
  const brandsList = useMemo(() => {
    const map = {};

    deals.forEach(deal => {
      const p = deal?.product;
      const brandName = p?.brand?.trim();
      if (!brandName) return;

      if (!map[brandName]) {
        map[brandName] = {
          name: brandName,
          slug: brandName.toLowerCase(),
          products: [],
          categories: new Set(),
          minPrice: Infinity,
          images: [],
          directCount: 0,
          juggleCount: 0
        };
      }

      const item = map[brandName];
      item.products.push(deal);

      if (p.category_name) {
        item.categories.add(p.category_name);
      }

      const price = parseFloat(deal.markup_price || p.base_price || 0);
      if (price > 0 && price < item.minPrice) {
        item.minPrice = price;
      }

      const img = p.image || p.image_url;
      if (img && item.images.length < 3 && !item.images.includes(img)) {
        item.images.push(img);
      }

      if (deal.is_direct) {
        item.directCount++;
      } else {
        item.juggleCount++;
      }
    });

    return Object.values(map).map(b => ({
      ...b,
      categories: Array.from(b.categories),
      minPrice: b.minPrice === Infinity ? 0 : b.minPrice,
      totalCount: b.products.length
    }));
  }, [deals]);

  // Extract all categories across all brands
  const allCategories = useMemo(() => {
    const cats = new Set();
    brandsList.forEach(b => {
      b.categories.forEach(c => cats.add(c));
    });
    return ['All', ...Array.from(cats)];
  }, [brandsList]);

  // Alphabet jump list (letters present in available brands)
  const alphabet = useMemo(() => {
    const letters = new Set();
    brandsList.forEach(b => {
      const firstChar = b.name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar)) letters.add(firstChar);
    });
    return ['ALL', ...Array.from(letters).sort()];
  }, [brandsList]);

  // Filter and sort brands
  const filteredBrands = useMemo(() => {
    let result = brandsList.filter(b => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = b.name.toLowerCase().includes(query);
        const matchesCat = b.categories.some(c => c.toLowerCase().includes(query));
        if (!matchesName && !matchesCat) return false;
      }

      // Category filter
      if (selectedCategory !== 'All' && !b.categories.includes(selectedCategory)) {
        return false;
      }

      // Letter filter
      if (selectedLetter !== 'ALL' && b.name.charAt(0).toUpperCase() !== selectedLetter) {
        return false;
      }

      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'items':
          return b.totalCount - a.totalCount;
        case 'price-low':
          return a.minPrice - b.minPrice;
        case 'popular':
        default:
          return b.totalCount - a.totalCount || a.name.localeCompare(b.name);
      }
    });
  }, [brandsList, searchTerm, selectedCategory, selectedLetter, sortBy]);

  const formatPrice = (val) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getBrandInitials = (name) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="brands-page" style={{ minHeight: '100vh', background: '#f8faf9', color: '#111' }}>
      <Navbar />

      {/* BREADCRUMBS BAR */}
      <div style={{ background: '#0a0e0c', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0.75rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#8d9992' }}>
            <Link to="/shop" style={{ color: '#8d9992', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Marketplace
            </Link>
            <ChevronRight size={14} />
            <span style={{ color: '#72f6c1', fontWeight: '700' }}>All Brands</span>
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

      {/* HERO BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, #090e0c 0%, #111a15 60%, #0d1410 100%)',
        color: '#fff',
        padding: '3.5rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(114, 246, 193, 0.15)'
      }}>
        {/* Glow orb */}
        <div style={{
          position: 'absolute',
          top: '-30%',
          right: '8%',
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(114, 246, 193, 0.09) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <span style={{
                  background: 'rgba(114, 246, 193, 0.12)',
                  color: '#72f6c1',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '2rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(114, 246, 193, 0.3)'
                }}>
                  Verified Brand Directory
                </span>
              </div>
              <h1 style={{ margin: '0 0 0.75rem', fontSize: '3.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
                Official Brands
              </h1>
              <p style={{ margin: 0, fontSize: '1.05rem', color: '#9ba8a0', maxWidth: '620px', lineHeight: '1.6' }}>
                Browse curated collections from premier manufacturers, independent designers, and verified merchants on Juggle.
              </p>
            </div>

            {/* Quick Stats Pill Cards */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '1rem 1.5rem',
                borderRadius: '1.25rem',
                minWidth: '120px'
              }}>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#8d9992', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                  Total Brands
                </span>
                <strong style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fff' }}>
                  {loading ? '—' : brandsList.length}
                </strong>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '1rem 1.5rem',
                borderRadius: '1.25rem',
                minWidth: '120px'
              }}>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#8d9992', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                  Active Products
                </span>
                <strong style={{ fontSize: '1.8rem', fontWeight: '900', color: '#72f6c1' }}>
                  {loading ? '—' : deals.length}
                </strong>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* CONTROLS & SEARCH TOOLBAR */}
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
          
          {/* Search & Category Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', flex: 1, minWidth: '320px' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} color="#888" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search brands or categories..."
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
              {allCategories.map(cat => (
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

          {/* Right: Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: '700' }}>SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '0.65rem',
                border: '1px solid #dce3df',
                background: '#fff',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="popular">Most Popular</option>
              <option value="items">Most Products</option>
              <option value="name-asc">Brand Name (A-Z)</option>
              <option value="name-desc">Brand Name (Z-A)</option>
              <option value="price-low">Lowest Starting Price</option>
            </select>
          </div>

        </div>

        {/* Alphabet Jump Bar */}
        {alphabet.length > 2 && (
          <div style={{
            borderTop: '1px solid #edf1ee',
            padding: '0.5rem 2rem',
            background: '#fafbfb',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ fontSize: '0.72rem', color: '#8d9992', fontWeight: '800', marginRight: '0.5rem', textTransform: 'uppercase' }}>
              Jump to:
            </span>
            {alphabet.map(letter => (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                style={{
                  background: selectedLetter === letter ? '#000' : 'transparent',
                  color: selectedLetter === letter ? '#fff' : '#666',
                  border: 'none',
                  borderRadius: '0.4rem',
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* BRANDS GRID CONTAINER */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* Active Results Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#687870', fontWeight: '600' }}>
            Showing <strong style={{ color: '#000' }}>{filteredBrands.length}</strong> {filteredBrands.length === 1 ? 'brand' : 'brands'}
          </p>

          {(searchTerm || selectedCategory !== 'All' || selectedLetter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                setSelectedLetter('ALL');
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
              width: '44px',
              height: '44px',
              border: '3px solid #e0e6e2',
              borderTopColor: '#000',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1.5rem'
            }} />
            <h3 style={{ margin: 0, fontWeight: '800', color: '#111' }}>Loading Brand Directory...</h3>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Indexing verified labels & marketplace drops</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredBrands.length === 0 ? (
          
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
              No brands found
            </h3>
            <p style={{ margin: '0 0 1.5rem', color: '#687870', fontSize: '0.9rem' }}>
              We could not find any brands matching your selected filter criteria.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                setSelectedLetter('ALL');
              }}
              className="btn-checkout"
              style={{ width: 'auto', padding: '0.75rem 1.75rem', fontSize: '0.85rem' }}
            >
              Reset Filters
            </button>
          </div>

        ) : (

          /* BRANDS CARDS GRID */
          <div className="brands-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: '2rem'
          }}>
            {filteredBrands.map((brand) => {
              const initials = getBrandInitials(brand.name);
              const previewImage = brand.images[0] ? getFullUrl(brand.images[0]) : null;

              return (
                <div
                  key={brand.name}
                  onClick={() => navigate(`/brand/${encodeURIComponent(brand.name.toLowerCase())}`)}
                  style={{
                    background: '#fff',
                    borderRadius: '1.5rem',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                    border: '1px solid #edf1ee',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.09)';
                    e.currentTarget.style.borderColor = 'rgba(114, 246, 193, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.03)';
                    e.currentTarget.style.borderColor = '#edf1ee';
                  }}
                >
                  {/* Brand Header Banner / Showcase Image */}
                  <div style={{
                    height: '180px',
                    background: previewImage ? `url(${previewImage}) center/cover` : 'linear-gradient(135deg, #111a15 0%, #1f2d24 100%)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Dark gradient overlay for readability */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: previewImage 
                        ? 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 100%)' 
                        : 'transparent'
                    }} />

                    {/* Verified Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(6px)',
                      color: '#72f6c1',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '2rem',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <ShieldCheck size={14} color="#72f6c1" />
                      <span>VERIFIED</span>
                    </div>

                    {/* Brand Name Plaque */}
                    <div style={{
                      position: 'relative',
                      zIndex: 2,
                      textAlign: 'center',
                      padding: '0 1rem'
                    }}>
                      <div className="glass-morphism" style={{
                        padding: '0.65rem 1.5rem',
                        borderRadius: '1rem',
                        color: '#fff',
                        fontWeight: '900',
                        fontSize: '1.25rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
                      }}>
                        {brand.name}
                      </div>
                    </div>
                  </div>

                  {/* Brand Details Card Body */}
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    
                    {/* Monogram Avatar & Stats */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '1rem',
                          background: '#090e0c',
                          color: '#72f6c1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '900',
                          fontSize: '1.1rem',
                          border: '1.5px solid rgba(114, 246, 193, 0.4)',
                          boxShadow: '0 4px 12px rgba(114, 246, 193, 0.15)'
                        }}>
                          {initials}
                        </div>
                        <div>
                          <strong style={{ fontSize: '1.15rem', display: 'block', color: '#111' }}>{brand.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>
                            {brand.totalCount} {brand.totalCount === 1 ? 'product' : 'products'} available
                          </span>
                        </div>
                      </div>

                      {brand.minPrice > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.68rem', color: '#8d9992', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>
                            Starts From
                          </span>
                          <strong style={{ fontSize: '1.1rem', fontWeight: '900', color: '#159b6d' }}>
                            {formatPrice(brand.minPrice)}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Category Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.5rem' }}>
                      {brand.categories.slice(0, 3).map(cat => (
                        <span
                          key={cat}
                          style={{
                            background: '#f1f5f2',
                            color: '#445',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '0.5rem',
                            textTransform: 'uppercase'
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                      {brand.categories.length > 3 && (
                        <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '700', alignSelf: 'center' }}>
                          +{brand.categories.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* CTA Button */}
                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f0f3f1' }}>
                      <button
                        className="btn-checkout"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          fontSize: '0.85rem',
                          fontWeight: '900',
                          borderRadius: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/brand/${encodeURIComponent(brand.name.toLowerCase())}`);
                        }}
                      >
                        <span>VIEW COLLECTION</span>
                        <ArrowUpRight size={16} />
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
