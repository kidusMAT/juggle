import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api';
import { 
  ShoppingBag, ChevronLeft, ChevronRight, CheckCircle, Tag, Truck, 
  ShieldCheck, Zap, Star, ExternalLink, ArrowRight, Share2, 
  Check, AlertCircle, ShoppingCart, RefreshCw, Box, Award
} from 'lucide-react';
import Navbar from './Navbar';

const getFullUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE.replace('/api', '')}${path}`;
};

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [notification, setNotification] = useState({ message: '', type: 'success', visible: false });
  const [copiedLink, setCopiedLink] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/products/${id}/`);
        setProduct(res.data);
        try {
          const view = { id: res.data.id, brand: res.data.brand || '', category: res.data.category_name || '', viewedAt: Date.now() };
          const previous = JSON.parse(localStorage.getItem('gobez-recently-viewed') || '[]');
          const next = [view, ...previous.filter(item => item.id !== res.data.id)].slice(0, 12);
          localStorage.setItem('gobez-recently-viewed', JSON.stringify(next));
          window.dispatchEvent(new CustomEvent('gobez-product-viewed'));
        } catch { /* recommendations are optional */ }
        setSelectedImage(getFullUrl(res.data.image || res.data.image_url));
        
        // Fetch related products (same category)
        let fetchedRelated = [];
        if (res.data.category) {
          try {
            const catRes = await api.get(`/products/?category=${res.data.category}`);
            fetchedRelated = (catRes.data.results || catRes.data)
              .filter(p => p.id !== parseInt(id));
          } catch (e) {
            console.error("Category fetch failed, falling back", e);
          }
        }
        
        // Fallback: If no category or no results found in category, fetch latest general products
        if (fetchedRelated.length < 2) {
          try {
            const genRes = await api.get('/products/');
            const generalItems = (genRes.data.results || genRes.data)
              .filter(p => p.id !== parseInt(id));
            
            fetchedRelated = [...fetchedRelated, ...generalItems.filter(gi => !fetchedRelated.find(ri => ri.id === gi.id))];
          } catch (e) {
            console.error("General fetch failed", e);
          }
        }
        
        setRelatedProducts(fetchedRelated.slice(0, 4));
      } catch (err) {
        console.error("Error fetching product", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  const handleAddToCart = async (prodId, prodName) => {
    const targetId = prodId || id;
    const targetName = prodName || product?.name;
    setAddingToCart(true);
    try {
      await api.post('/cart/add_to_cart/', {
        product_id: targetId,
        offer_id: 'direct',
        quantity: prodId ? 1 : quantity
      });
      window.dispatchEvent(new CustomEvent('cart-updated'));
      showNotification(`Added ${targetName} to cart!`, 'success');
    } catch (err) {
      showNotification(err.response?.data?.error || `Failed to add ${targetName} to cart.`, 'error');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || product.status === 'SOLD') return;
    setBuyingNow(true);
    try {
      await api.post('/cart/add_to_cart/', {
        product_id: product.id,
        offer_id: 'direct',
        quantity: quantity
      });
      window.dispatchEvent(new CustomEvent('cart-updated'));
      navigate('/cart');
    } catch (err) {
      showNotification(err.response?.data?.error || `Failed to proceed to checkout.`, 'error');
      setBuyingNow(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    showNotification('Product link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #e0e6e2',
          borderTopColor: 'var(--neon-green)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 1.5rem'
        }} />
        <h3 style={{ margin: 0, fontWeight: '800', color: 'var(--text-primary)' }}>Loading Product...</h3>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Connecting to marketplace feed</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ maxWidth: '600px', margin: '6rem auto', padding: '2rem', textAlign: 'center' }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.75rem' }}>Product Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          The item you are looking for may have been removed, sold out, or expired from active listings.
        </p>
        <Link to="/shop" className="btn-checkout" style={{ display: 'inline-flex', width: 'auto', padding: '0.75rem 2rem', textDecoration: 'none' }}>
          Back to Marketplace
        </Link>
      </div>
    </div>
  );

  const isSoldOut = product.status === 'SOLD' || (product.stock !== undefined && product.stock <= 0);

  return (
    <div className="buyer-detail-page" style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
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
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          border: '1px solid rgba(255,255,255,0.15)',
          animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} color="var(--neon-green)" />}
          <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{notification.message}</span>
        </div>
      )}

      {/* BREADCRUMB BAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #edf1ee', padding: '0.85rem 1.5rem' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Link to="/shop" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ChevronLeft size={16} /> Marketplace
            </Link>
            {product.category_name && (
              <>
                <ChevronRight size={13} style={{ opacity: 0.5 }} />
                <span>{product.category_name}</span>
              </>
            )}
            {product.brand && (
              <>
                <ChevronRight size={13} style={{ opacity: 0.5 }} />
                <Link 
                  to={`/brand/${encodeURIComponent(product.brand.toLowerCase())}`}
                  style={{ color: '#159b6d', fontWeight: '700', textDecoration: 'none' }}
                >
                  {product.brand}
                </Link>
              </>
            )}
            <ChevronRight size={13} style={{ opacity: 0.5 }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: '600', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {product.name}
            </span>
          </div>

          <button
            onClick={handleShare}
            style={{
              background: '#f1f5f2',
              border: '1px solid #dce4de',
              borderRadius: '0.65rem',
              padding: '0.4rem 0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              transition: 'background 0.2s'
            }}
          >
            {copiedLink ? <Check size={14} color="#159b6d" /> : <Share2 size={14} />}
            {copiedLink ? 'Link Copied' : 'Share'}
          </button>
        </div>
      </div>

      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <div className="buyer-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) 1fr', gap: '3.5rem', alignItems: 'start' }}>
          
          {/* ========================================= */}
          {/* LEFT: GALLERY & MEDIA                     */}
          {/* ========================================= */}
          <div>
            {/* Primary Image Stage */}
            <div style={{ 
              width: '100%', 
              height: '520px', 
              background: selectedImage ? `url(${selectedImage}) center/cover` : '#f0f3f1', 
              borderRadius: '2rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
              marginBottom: '1.25rem',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #eef2ef',
              transition: 'background 0.3s ease'
            }}>
              {/* Badges Overlay */}
              <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', zIndex: 2 }}>
                {product.is_limited && (
                  <span style={{ 
                    background: '#000', 
                    color: '#fff', 
                    fontSize: '0.7rem', 
                    fontWeight: '900', 
                    padding: '0.4rem 0.85rem', 
                    borderRadius: '2rem',
                    letterSpacing: '0.05em'
                  }}>
                    LIMITED DROP
                  </span>
                )}
                {isSoldOut ? (
                  <span style={{ 
                    background: '#ef4444', 
                    color: '#fff', 
                    fontSize: '0.7rem', 
                    fontWeight: '900', 
                    padding: '0.4rem 0.85rem', 
                    borderRadius: '2rem'
                  }}>
                    SOLD OUT
                  </span>
                ) : (
                  <span style={{ 
                    background: 'rgba(255,255,255,0.92)', 
                    color: '#159b6d', 
                    fontSize: '0.7rem', 
                    fontWeight: '900', 
                    padding: '0.4rem 0.85rem', 
                    borderRadius: '2rem',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                    IN STOCK
                  </span>
                )}
              </div>
            </div>
            
            {/* Gallery Thumbnails Strip */}
            <div style={{ display: 'flex', gap: '0.85rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {/* Primary Image Thumbnail */}
              <div 
                onClick={() => setSelectedImage(getFullUrl(product.image || product.image_url))}
                style={{ 
                  width: '76px', 
                  height: '76px', 
                  borderRadius: '1rem', 
                  cursor: 'pointer', 
                  border: `2.5px solid ${selectedImage === getFullUrl(product.image || product.image_url) ? 'var(--neon-green)' : '#e5eae7'}`,
                  overflow: 'hidden',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                  boxShadow: selectedImage === getFullUrl(product.image || product.image_url) ? '0 0 12px rgba(114, 246, 193, 0.4)' : 'none'
                }}
              >
                <img 
                  src={getFullUrl(product.image || product.image_url)} 
                  alt={product.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>

              {/* Additional Images Thumbnails */}
              {product.images && product.images.map(img => (
                <div 
                  key={img.id}
                  onClick={() => setSelectedImage(getFullUrl(img.image))}
                  style={{ 
                    width: '76px', 
                    height: '76px', 
                    borderRadius: '1rem', 
                    cursor: 'pointer', 
                    border: `2.5px solid ${selectedImage === getFullUrl(img.image) ? 'var(--neon-green)' : '#e5eae7'}`,
                    overflow: 'hidden',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                    boxShadow: selectedImage === getFullUrl(img.image) ? '0 0 12px rgba(114, 246, 193, 0.4)' : 'none'
                  }}
                >
                  <img 
                    src={getFullUrl(img.image)} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ========================================= */}
          {/* RIGHT: PRODUCT INFO & PURCHASE CONTROLS   */}
          {/* ========================================= */}
          <div>
            {/* Header info */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                {product.category_name && (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: '#159b6d', 
                    fontWeight: '800', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.08em',
                    background: 'rgba(21, 155, 109, 0.08)',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '2rem'
                  }}>
                    {product.category_name}
                  </span>
                )}
                
                {product.brand && (
                  <Link 
                    to={`/brand/${encodeURIComponent(product.brand.toLowerCase())}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      transition: 'color 0.2s'
                    }}
                    title="View entire brand collection"
                  >
                    <span>by <strong style={{ color: 'var(--text-primary)' }}>{product.brand}</strong></span>
                    <ExternalLink size={13} color="#159b6d" />
                  </Link>
                )}
              </div>

              <h1 style={{ fontSize: '2.8rem', fontWeight: '900', margin: '0.5rem 0 1rem', lineHeight: '1.15', letterSpacing: '-0.02em' }}>
                {product.name}
              </h1>
            </div>

            {/* Price section */}
            <div style={{ 
              background: '#fff', 
              border: '1px solid #edf1ee', 
              borderRadius: '1.25rem', 
              padding: '1.5rem', 
              marginBottom: '1.75rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#8d9992', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Direct Marketplace Price
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '2.6rem', fontWeight: '900', color: 'var(--neon-green)', letterSpacing: '-0.02em' }}>
                  {formatPrice(product.base_price)}
                </span>
                {isSoldOut && (
                  <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                    [ Sold Out ]
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f3f1', fontSize: '0.8rem', color: '#687870' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Box size={15} color="#159b6d" />
                  <span>Availability: <strong style={{ color: '#111' }}>{product.stock || 0} in stock</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Award size={15} color="#159b6d" />
                  <span>Condition: <strong style={{ color: '#111' }}>Verified Brand New</strong></span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem', color: 'var(--text-secondary)' }}>
                About this item
              </h3>
              <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--text-secondary)', margin: 0 }}>
                {product.description || "Handcrafted item curated directly for the Juggle marketplace."}
              </p>
            </div>

            {/* Technical Specifications */}
            {product.attributes && Object.entries(product.attributes).length > 0 && (
              <div style={{ 
                background: '#fff', 
                border: '1px solid #edf1ee', 
                padding: '1.5rem', 
                borderRadius: '1.25rem', 
                marginBottom: '2rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
              }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={16} color="#159b6d" /> Specifications & Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  {Object.entries(product.attributes).map(([k, v]) => (
                    <div key={k} style={{ background: '#f8faf9', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #eef2ef' }}>
                      <span style={{ fontSize: '0.72rem', color: '#8d9992', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>{k}</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{String(v)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select Option
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                  {product.variants.map(variant => (
                    <button 
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      style={{ 
                        padding: '0.65rem 1.25rem', 
                        borderRadius: '0.75rem', 
                        border: selectedVariant?.id === variant.id ? '2px solid #000' : '1px solid #dce4de',
                        background: selectedVariant?.id === variant.id ? '#000' : '#fff',
                        color: selectedVariant?.id === variant.id ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer', 
                        fontWeight: '700', 
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      {selectedVariant?.id === variant.id && <Check size={14} color="var(--neon-green)" />}
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Purchase CTA */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                
                {/* Quantity Stepper */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: '#fff', 
                  border: '1px solid #dce4de',
                  borderRadius: '1rem',
                  padding: '0.35rem 0.65rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                    disabled={quantity <= 1 || isSoldOut}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: quantity <= 1 ? 'not-allowed' : 'pointer', 
                      fontSize: '1.25rem', 
                      fontWeight: '800',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                      opacity: quantity <= 1 ? 0.4 : 1
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: '900', fontSize: '1.05rem', minWidth: '36px', textAlign: 'center' }}>
                    {quantity}
                  </span>
                  <button 
                    onClick={() => setQuantity(q => Math.min(product.stock || 99, q + 1))} 
                    disabled={isSoldOut || (product.stock && quantity >= product.stock)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: (product.stock && quantity >= product.stock) ? 'not-allowed' : 'pointer', 
                      fontSize: '1.25rem', 
                      fontWeight: '800',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                      opacity: (product.stock && quantity >= product.stock) ? 0.4 : 1
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button 
                  className="btn-checkout" 
                  style={{ 
                    flex: 1, 
                    minWidth: '180px',
                    borderRadius: '1rem',
                    padding: '1rem 1.5rem',
                    fontSize: '0.95rem'
                  }}
                  onClick={() => handleAddToCart()}
                  disabled={isSoldOut || addingToCart}
                >
                  <ShoppingBag size={18} />
                  {addingToCart ? 'ADDING...' : (isSoldOut ? 'SOLD OUT' : 'ADD TO CART')}
                </button>

                {/* Buy Now Instant Checkout */}
                {!isSoldOut && (
                  <button
                    onClick={handleBuyNow}
                    disabled={buyingNow}
                    style={{
                      background: '#000',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '1rem',
                      padding: '1rem 1.75rem',
                      fontWeight: '900',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#222'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#000'}
                  >
                    <span>BUY NOW</span>
                    <ArrowRight size={17} />
                  </button>
                )}

              </div>
            </div>

            {/* Trust Assurance Block */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem', 
              borderTop: '1px solid #edf1ee', 
              paddingTop: '1.75rem' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: '#f1f5f2', padding: '0.5rem', borderRadius: '0.6rem', color: '#159b6d' }}>
                  <Truck size={18} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem' }}>Fast Delivery</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {product.delivery_type === 'ABET' ? 'Abet express local courier' : 'Standard regional dispatch'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: '#f1f5f2', padding: '0.5rem', borderRadius: '0.6rem', color: '#159b6d' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem' }}>Authenticity Verified</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Direct merchant & escrow security
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================= */}
        {/* REVIEWS SECTION                           */}
        {/* ========================================= */}
        <ReviewsSection productId={id} />

        {/* ========================================= */}
        {/* RELATED PRODUCTS ("YOU MIGHT ALSO LIKE")  */}
        {/* ========================================= */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: '7rem', borderTop: '1px solid #edf1ee', paddingTop: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ color: '#159b6d', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '0.35rem' }}>
                  More from {product.category_name || 'Marketplace'}
                </span>
                <h2 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
                  You Might Also Like
                </h2>
              </div>
              <Link 
                to="/shop" 
                style={{ 
                  color: 'var(--text-primary)', 
                  fontWeight: '800', 
                  textDecoration: 'none', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.9rem',
                  borderBottom: '2px solid var(--neon-green)',
                  paddingBottom: '2px'
                }}
              >
                <span>Browse live market</span>
                <ChevronRight size={16} />
              </Link>
            </div>

            <div className="grid-products" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '2rem' }}>
              {relatedProducts.map(p => (
                <div key={p.id} className="related-product-card" style={{ position: 'relative' }}>
                  <Link to={`/product/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div 
                      className="card" 
                      style={{ 
                        padding: '0', 
                        overflow: 'hidden', 
                        height: '100%', 
                        background: '#fff',
                        borderRadius: '1.25rem',
                        border: '1px solid #edf1ee',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ 
                        height: '220px', 
                        background: p.image ? `url(${getFullUrl(p.image)}) center/cover` : '#f0f3f1', 
                        position: 'relative'
                      }}>
                        {p.is_limited && (
                          <div style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', background: '#000', color: '#fff', fontSize: '0.62rem', fontWeight: '900', padding: '3px 8px', borderRadius: '4px' }}>
                            LIMITED
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <p style={{ margin: 0, color: '#888', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '800' }}>
                          {p.brand}
                        </p>
                        <h4 style={{ margin: '0.25rem 0 0.75rem', fontSize: '1.05rem', fontWeight: '800', lineHeight: '1.3' }}>
                          {p.name}
                        </h4>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f0f3f1' }}>
                          <span style={{ color: 'var(--neon-green)', fontWeight: '900', fontSize: '1.2rem' }}>
                            {formatPrice(p.base_price)}
                          </span>
                          
                          <button 
                            className="quick-add-btn" 
                            aria-label={`Add ${p.name} to cart`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddToCart(p.id, p.name);
                            }}
                          >
                            <ShoppingCart size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .related-product-card:hover .card {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border-color: var(--neon-green);
        }

        .quick-add-btn {
          background: #f1f5f2;
          border: 1px solid #dce4de;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #111;
          transition: all 0.2s;
        }

        .quick-add-btn:hover {
          background: var(--neon-green);
          color: #000;
          transform: scale(1.08);
          border-color: var(--neon-green);
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ReviewsSection({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/reviews/product_reviews/?product=${productId}`);
      setReviews(res.data.reviews || []);
      setAvgRating(res.data.average_rating || 0);
      setTotalReviews(res.data.total_reviews || 0);
    } catch (err) {
      console.error("Error fetching reviews", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newReview.comment.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/reviews/', {
        product: parseInt(productId),
        rating: newReview.rating,
        comment: newReview.comment.trim()
      });
      setShowReviewForm(false);
      setNewReview({ rating: 5, comment: '' });
      fetchReviews();
    } catch (err) {
      console.error("Error submitting review", err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, interactive = false, onChange = null) => {
    return (
      <div style={{ display: 'flex', gap: '3px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            onClick={() => interactive && onChange && onChange(star)}
            style={{
              cursor: interactive ? 'pointer' : 'default',
              color: star <= rating ? '#eab308' : '#e0e6e2',
              fontSize: interactive ? '1.6rem' : '1.1rem',
              transition: 'transform 0.15s'
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ marginTop: '5rem', borderTop: '1px solid #edf1ee', paddingTop: '3rem', textAlign: 'center', color: '#888' }}>
        <p>Loading community feedback...</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '5rem', borderTop: '1px solid #edf1ee', paddingTop: '3.5rem' }}>
      
      {/* Reviews Summary Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1.5rem', 
        marginBottom: '2.5rem',
        background: '#fff',
        border: '1px solid #edf1ee',
        borderRadius: '1.5rem',
        padding: '2rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>
              {Number(avgRating || 0).toFixed(1)}
            </span>
            <span style={{ fontSize: '1rem', color: '#888', fontWeight: '700' }}> / 5.0</span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              {renderStars(Math.round(avgRating))}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Based on {totalReviews} {totalReviews === 1 ? 'verified review' : 'verified reviews'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowReviewForm(!showReviewForm)}
          className="btn-checkout"
          style={{ width: 'auto', padding: '0.75rem 1.75rem', fontSize: '0.85rem' }}
        >
          {showReviewForm ? 'Close Form' : 'Write a Review'}
        </button>
      </div>

      {/* Review submission Form */}
      {showReviewForm && (
        <div style={{ 
          background: '#fff', 
          border: '1px solid #dce4de', 
          borderRadius: '1.5rem', 
          padding: '2rem', 
          marginBottom: '2.5rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '1.25rem' }}>Share Your Experience</h3>
          <form onSubmit={handleSubmitReview}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Your Rating
              </label>
              {renderStars(newReview.rating, true, (rating) => setNewReview({ ...newReview, rating }))}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Review Comment
              </label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder="How was the product quality, fit, and delivery speed?"
                required
                style={{
                  width: '100%', 
                  padding: '1rem', 
                  borderRadius: '0.75rem',
                  border: '1px solid #dce4de', 
                  minHeight: '120px', 
                  resize: 'vertical',
                  fontFamily: 'inherit', 
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: '#f8faf9'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                style={{
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '0.75rem',
                  background: '#f1f5f2', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontWeight: '700', 
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !newReview.comment.trim()}
                className="btn-checkout"
                style={{ width: 'auto', padding: '0.75rem 2rem', fontSize: '0.85rem' }}
              >
                {submitting ? 'Submitting...' : 'Post Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div style={{ 
          background: '#fff', 
          border: '2px dashed #dce4de', 
          borderRadius: '1.5rem', 
          padding: '3rem', 
          textAlign: 'center' 
        }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.95rem' }}>
            No reviews yet for this product. Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reviews.map(review => (
            <div 
              key={review.id} 
              style={{ 
                background: '#fff', 
                border: '1px solid #edf1ee', 
                borderRadius: '1.25rem', 
                padding: '1.5rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#f1f5f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}>
                    {(review.user_name || 'U').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block' }}>{review.user_name || 'Verified Buyer'}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>
                      {new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                {renderStars(review.rating)}
              </div>
              
              {review.comment && (
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default ProductDetailPage;
