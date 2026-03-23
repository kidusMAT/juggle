import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ChevronLeft, CheckCircle, Tag, Truck, ShieldCheck, Zap } from 'lucide-react';
import Navbar from './Navbar';

const API_BASE = 'http://localhost:8000/api';

const getFullUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });

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
        const res = await axios.get(`${API_BASE}/products/${id}/`);
        setProduct(res.data);
        setSelectedImage(getFullUrl(res.data.image || res.data.image_url));
        
        // Fetch related products (same category)
        let fetchedRelated = [];
        if (res.data.category) {
          try {
            const catRes = await axios.get(`${API_BASE}/products/?category=${res.data.category}`);
            fetchedRelated = (catRes.data.results || catRes.data)
              .filter(p => p.id !== parseInt(id));
          } catch (e) {
            console.error("Category fetch failed, falling back", e);
          }
        }
        
        // Fallback: If no category or no results found in category, fetch latest general products
        if (fetchedRelated.length < 2) {
          try {
            const genRes = await axios.get(`${API_BASE}/products/`);
            const generalItems = (genRes.data.results || genRes.data)
              .filter(p => p.id !== parseInt(id));
            
            // Merge or replace (prefer category if some existed, but here we replace for better experience if count is low)
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
    try {
      await axios.post(`${API_BASE}/cart/add_to_cart/`, {
        product_id: targetId,
        offer_id: 'direct',
        quantity: prodId ? 1 : quantity
      });
      showNotification(`Added ${targetName} to cart!`, 'success');
    } catch (err) {
      showNotification(`Failed to add ${targetName} to cart.`, 'error');
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="neon-pulse" style={{ color: 'var(--neon-purple)', fontWeight: 'bold' }}>LOADING PRODUCT...</div>
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>Product Not Found</h2>
        <Link to="/shop" className="btn-black">Back to Marketplace</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar />
      
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <Link to="/shop" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '2rem', fontSize: '0.9rem' }}>
          <ChevronLeft size={18} /> Back to Marketplace
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 1fr', gap: '4rem', alignItems: 'start' }}>
          {/* LEFT: GALLERY */}
          <div>
            <div style={{ 
              width: '100%', 
              height: '600px', 
              background: selectedImage ? `url(${selectedImage}) center/cover` : '#eee', 
              borderRadius: '2rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem',
              transition: 'background 0.3s ease'
            }}></div>
            
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
              {/* Primary Image Thumbnail */}
              <div 
                onClick={() => setSelectedImage(getFullUrl(product.image || product.image_url))}
                style={{ 
                  width: '80px', height: '80px', borderRadius: '1rem', cursor: 'pointer', 
                  border: `2px solid ${selectedImage === getFullUrl(product.image || product.image_url) ? 'var(--neon-green)' : 'transparent'}`,
                  overflow: 'hidden'
                }}
              >
                <img src={getFullUrl(product.image || product.image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {/* Additional Images Thumbnails */}
              {product.images && product.images.map(img => (
                <div 
                  key={img.id}
                  onClick={() => setSelectedImage(getFullUrl(img.image))}
                  style={{ 
                    width: '80px', height: '80px', borderRadius: '1rem', cursor: 'pointer', 
                    border: `2px solid ${selectedImage === getFullUrl(img.image) ? 'var(--neon-green)' : 'transparent'}`,
                    overflow: 'hidden'
                  }}
                >
                  <img src={getFullUrl(img.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: CONTENT */}
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neon-purple)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{product.category_name}</span>
                {product.is_limited && (
                  <span style={{ background: 'var(--neon-purple)', color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: '3px 10px', borderRadius: '2rem', boxShadow: '0 0 15px rgba(192, 132, 252, 0.4)' }}>LIMITED EDITION</span>
                )}
              </div>
              <h1 style={{ fontSize: '3.5rem', margin: '0.5rem 0' }}>{product.name}</h1>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>by {product.brand}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '2.5rem' }}>
              <span style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--neon-green)' }}>ETB {product.base_price}</span>
              {product.status === 'SOLD' && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>[ SOLD OUT ]</span>}
            </div>

            <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
              {product.description || "No description available for this handcrafted masterpiece."}
            </p>

            {/* ATTRIBUTES GRID */}
            {product.attributes && Object.entries(product.attributes).length > 0 && (
              <div style={{ background: '#fdfdfd', border: '1px solid #eee', padding: '1.5rem', borderRadius: '1.5rem', marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={18} /> Technical Specs</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {Object.entries(product.attributes).map(([k, v]) => (
                    <div key={k} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block' }}>{k}</span>
                      <span style={{ fontWeight: '600' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VARIANTS SELECTOR */}
            {product.variants && product.variants.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Select Variant</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {product.variants.map(variant => (
                    <button 
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      style={{ 
                        padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: '2px solid #eee',
                        background: selectedVariant?.id === variant.id ? 'black' : 'white',
                        color: selectedVariant?.id === variant.id ? 'white' : 'black',
                        cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'
                      }}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PURCHASE CONTROLS */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f0f0f0', padding: '0.5rem 1rem', borderRadius: '3rem' }}>
                <button onClick={() => setQuantity(q => Math.max(1, q-1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>-</button>
                <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{quantity}</span>
                <button onClick={() => setQuantity(q => q+1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>+</button>
              </div>
              <button 
                className="btn-checkout" 
                style={{ flex: 1 }}
                onClick={handleAddToCart}
                disabled={product.status === 'SOLD'}
              >
                <ShoppingBag /> Add to Cart
              </button>
            </div>

            {/* TRUST BADGES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Truck size={16} /> <span>Fast Local Delivery</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <ShieldCheck size={16} /> <span>Authentic Guarantee</span>
              </div>
            </div>
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: '8rem', borderTop: '1px solid #eee', paddingTop: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
              <div>
                <span style={{ color: 'var(--neon-purple)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Discovery</span>
                <h2 style={{ fontSize: '2.5rem', marginTop: '0.5rem' }}>You Might Also Like</h2>
              </div>
              <Link to="/shop" style={{ color: 'var(--text-primary)', fontWeight: '700', textDecoration: 'none', borderBottom: '2px solid var(--neon-purple)', paddingBottom: '2px' }}>
                View All Prototypes
              </Link>
            </div>

            <div className="grid-products" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2.5rem' }}>
              {relatedProducts.map(p => (
                <div key={p.id} className="related-product-card" style={{ position: 'relative' }}>
                  <Link to={`/product/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card" style={{ padding: '0', overflow: 'hidden', height: '100%', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                      <div style={{ 
                        height: '240px', 
                        background: p.image ? `url(${getFullUrl(p.image)})` : '#eee', 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center',
                        position: 'relative'
                      }}>
                        {p.is_limited && (
                          <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--neon-purple)', color: '#fff', fontSize: '0.6rem', fontWeight: '900', padding: '4px 10px', borderRadius: '4px', boxShadow: '0 4px 10px rgba(192, 132, 252, 0.3)' }}>
                            LIMITED
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{p.name}</h4>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>{p.brand}</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                          <span style={{ color: 'var(--neon-green)', fontWeight: '900', fontSize: '1.2rem' }}>ETB {p.base_price}</span>
                          <button 
                            className="quick-add-btn" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddToCart(p.id, p.name);
                            }}
                          >
                            <ShoppingBag size={18} />
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

      {notification.visible && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.type === 'success' ? <CheckCircle size={20} color="var(--neon-green)" /> : <Zap size={20} color="#ef4444" />}
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{notification.message}</span>
        </div>
      )}

      <style>{`
        .neon-pulse {
          animation: neon-pulse 1.5s ease-in-out infinite;
        }
        @keyframes neon-pulse {
          0%, 100% { opacity: 1; text-shadow: 0 0 10px var(--neon-purple); }
          50% { opacity: 0.5; text-shadow: 0 0 5px var(--neon-purple); }
        }

        .related-product-card:hover .card {
          transform: translateY(-10px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.12), 0 0 20px rgba(192, 132, 252, 0.1);
          border-color: var(--neon-purple);
        }

        .quick-add-btn {
          background: var(--accent-muted);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-add-btn:hover {
          background: var(--neon-green);
          color: black;
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(52, 211, 153, 0.4);
        }

        @media (max-width: 768px) {
          .related-product-card {
            flex: 0 0 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default ProductDetailPage;
