import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Filter, Grid, List } from 'lucide-react';
import api from '../api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export default function BrandCollectionPage() {
  const { brandName } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get(`${API_BASE}/products/buyer_market/`);
        const allDeals = res.data.results || res.data;
        const filtered = allDeals.filter(deal =>
          deal.product.brand.toLowerCase() === brandName.toLowerCase()
        );
        setProducts(filtered);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [brandName]);

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.product.base_price - b.product.base_price;
      case 'price-high':
        return b.product.base_price - a.product.base_price;
      case 'name':
        return a.product.name.localeCompare(b.product.name);
      default:
        return 0;
    }
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Header */}
      <div style={{
        background: '#000',
        color: '#fff',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="scanline-overlay" style={{ opacity: 0.05 }} />
        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              padding: '0.75rem 1.25rem',
              borderRadius: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <ShoppingBag size={32} />
            <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
              {brandName}
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '1rem', color: '#999', fontWeight: '500' }}>
            {products.length} {products.length === 1 ? 'item' : 'items'} available
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #eee'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              background: viewMode === 'grid' ? '#000' : '#f0f0f0',
              color: viewMode === 'grid' ? '#fff' : '#666',
              border: 'none',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              background: viewMode === 'list' ? '#000' : '#f0f0f0',
              color: viewMode === 'list' ? '#fff' : '#666',
              border: 'none',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <List size={18} />
          </button>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid #ddd',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          <option value="featured">Featured</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Products */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>
            Loading collection...
          </div>
        ) : sortedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>
            No products found for this brand.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
            gap: '1.5rem'
          }}>
            {sortedProducts.map((deal) => (
              <div
                key={deal.id}
                onClick={() => navigate(`/product/${deal.product.id}`)}
                style={{
                  background: '#fff',
                  borderRadius: '1.5rem',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                }}
              >
                <div style={{
                  height: '280px',
                  background: deal.product.image
                    ? `url(${API_BASE.replace('/api', '')}${deal.product.image}) center/cover`
                    : deal.product.image_url
                      ? `url(${deal.product.image_url}) center/cover`
                      : '#f0f0f0',
                  position: 'relative'
                }}>
                  {!deal.is_direct && (
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '1rem',
                      background: '#ef4444',
                      color: '#fff',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '2rem',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    }}>
                      JUGGLED
                    </div>
                  )}
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>
                    {deal.product.brand}
                  </p>
                  <h3 style={{ margin: '0.25rem 0 0.75rem', fontSize: '1.1rem', fontWeight: '700', lineHeight: '1.3' }}>
                    {deal.product.name}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#000' }}>
                      {formatPrice(deal.product.base_price)}
                    </span>
                    {!deal.is_direct && (
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>
                        {deal.amount} {deal.amount === 1 ? 'slot' : 'slots'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}