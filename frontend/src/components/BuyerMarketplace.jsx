import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { API_BASE } from '../api';
import { ShoppingBag, ShoppingCart, ChevronRight, ChevronLeft, CheckCircle, XCircle, CreditCard, ShieldCheck, Flame, Clock, Activity } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth } from '../AuthContext';

const placeholderColors = [
  '#fce7f3', '#ecfdf5', '#e0f2fe', '#1f2937', '#f3f4f6',
];

const createDemoMarketDeals = () => {
  const now = Date.now();
  const product = (id, name, brand, category, price, color) => ({ id, name, brand, category_name: category, base_price: String(price), image_url: '', demo_color: color, description: `Demo market listing for ${name}.` });
  return [
    { id: -101, product: product(-101, 'Satin City Runner', 'Nile Studio', 'Sneakers', 6800, '#dff7ed'), markup_price: '7600.00', amount: 3, is_direct: false, juggler_name: 'market demo', expires_at: new Date(now + 72 * 1000).toISOString() },
    { id: -102, product: product(-102, 'Linen Utility Tote', 'Addis Works', 'Designer Bags', 2400, '#e6f0ff'), markup_price: '2950.00', amount: 7, is_direct: false, juggler_name: 'market demo', expires_at: new Date(now + 98 * 1000).toISOString() },
    { id: -103, product: product(-103, 'Studio Field Watch', 'Meridian Supply', 'Watches', 9200, '#fff1d8'), markup_price: '10800.00', amount: 4, is_direct: false, juggler_name: 'market demo', expires_at: new Date(now + 4 * 60 * 1000).toISOString() },
    { id: -104, product: product(-104, 'Heavyweight Logo Crew', 'North Block', 'Streetwear', 3200, '#f4e8ff'), markup_price: '3900.00', amount: 11, is_direct: false, juggler_name: 'market demo', expires_at: new Date(now + 5 * 60 * 1000).toISOString() },
    { id: -105, product: product(-105, 'Everyday Court Low', 'Common Ground', 'Sneakers', 4100, '#e9f7f7'), markup_price: '4100.00', amount: 14, is_direct: true },
    { id: -106, product: product(-106, 'Canvas Market Pack', 'Addis Works', 'Designer Bags', 1850, '#f7eadf'), markup_price: '1850.00', amount: 9, is_direct: true },
    { id: -107, product: product(-107, 'Soft Knit Quarter Zip', 'North Block', 'Streetwear', 2700, '#e8edda'), markup_price: '2700.00', amount: 8, is_direct: true },
    { id: -108, product: product(-108, 'Minimal Steel Chrono', 'Meridian Supply', 'Watches', 7400, '#e8e8ee'), markup_price: '7400.00', amount: 5, is_direct: true },
    { id: -109, product: product(-109, 'Sprint Mesh Trainer', 'Common Ground', 'Sneakers', 3600, '#e6f3ed'), markup_price: '3600.00', amount: 12, is_direct: true },
    { id: -110, product: product(-110, 'Courtline Retro', 'Nile Studio', 'Sneakers', 5200, '#f3e9dc'), markup_price: '5200.00', amount: 6, is_direct: true },
    { id: -111, product: product(-111, 'Utility Overshirt', 'North Block', 'Streetwear', 2900, '#e5e9e4'), markup_price: '2900.00', amount: 10, is_direct: true },
    { id: -112, product: product(-112, 'Everyday Cargo Pant', 'North Block', 'Streetwear', 3300, '#eee7d9'), markup_price: '3300.00', amount: 7, is_direct: true },
    { id: -113, product: product(-113, 'Cloudstep Runner', 'Common Ground', 'Sneakers', 4700, '#e8eef0'), markup_price: '4700.00', amount: 8, is_direct: true },
    { id: -114, product: product(-114, 'Canvas Court High', 'Nile Studio', 'Sneakers', 4950, '#efe5dc'), markup_price: '4950.00', amount: 4, is_direct: true },
    { id: -115, product: product(-115, 'Washed Graphic Tee', 'North Block', 'Streetwear', 1800, '#e6e3dd'), markup_price: '1800.00', amount: 15, is_direct: true },
    { id: -116, product: product(-116, 'Panel Track Jacket', 'North Block', 'Streetwear', 4300, '#dfe9e3'), markup_price: '4300.00', amount: 5, is_direct: true },
  ];
};

const HorizontalRail = ({ children }) => {
  const railRef = React.useRef(null);
  const moveRail = (direction) => {
    railRef.current?.scrollBy({ left: direction * 340, behavior: 'smooth' });
  };

  return (
    <div className="horizontal-rail-shell">
      <button className="horizontal-rail-control horizontal-rail-prev" aria-label="Scroll products left" onClick={() => moveRail(-1)}><ChevronLeft size={17} /></button>
      <div ref={railRef} className="horizontal-scroller">{children}</div>
      <button className="horizontal-rail-control horizontal-rail-next" aria-label="Scroll products right" onClick={() => moveRail(1)}><ChevronRight size={17} /></button>
    </div>
  );
};

const FloatingParticles = ({ count = 15 }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {[...Array(count)].map((_, i) => {
        const seed = i + 1;
        const tx = ((seed * 37) % 400) - 200;
        const ty = ((seed * 53) % 400) - 200;
        const size = 2 + (seed % 4);
        const delay = (seed * 7) % 10;
        const duration = 10 + ((seed * 11) % 20);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(seed * 29) % 100}%`,
              top: `${(seed * 47) % 100}%`,
              width: `${size}px`,
              height: `${size}px`,
              background: i % 2 === 0 ? 'var(--neon-blue)' : 'var(--neon-green)',
              borderRadius: '50%',
              opacity: 0,
              boxShadow: `0 0 10px ${i % 2 === 0 ? 'var(--neon-blue)' : 'var(--neon-green)'}`,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              animation: `float-particle ${duration}s linear ${delay}s infinite`
            }}
          />
        );
      })}
    </div>
  );
};

const Sparks = ({ count = 30 }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {[...Array(count)].map((_, i) => {
        const seed = i + 1;
        const angle = (seed * 1.7) % (Math.PI * 2);
        const velocity = 20 + ((seed * 17) % 60);
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity - (20 + ((seed * 13) % 40));
        const size = 1 + (seed % 3);
        const delay = (seed * 3) % 1.5;
        return (
          <div
            key={i}
            className="spark-particle"
            style={{
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              left: '50%',
              top: '50%',
              width: `${size}px`,
              height: `${size}px`,
              background: i % 3 === 0 ? 'var(--neon-blue)' : (i % 3 === 1 ? '#888' : 'white'),
              opacity: 0.8,
              boxShadow: i % 3 === 0 ? '0 0 5px var(--neon-blue)' : 'none',
              animationDelay: `${delay}s`,
              animationDuration: '2.5s'
            }}
          />
        );
      })}
    </div>
  );
};

function BuyerMarketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextPage, setNextPage] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(300);
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSize, setSelectedSize] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [juggleOnly, setJuggleOnly] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [expiredProductIds, setExpiredProductIds] = useState(new Set());
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [allCategories, setAllCategories] = useState([]);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [reliveTransition, setReliveTransition] = useState('none'); // 'none', 'exit', 'enter'
  const [cartAddingId, setCartAddingId] = useState(null);
  const [activityIndex, setActivityIndex] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const { brandName } = useParams();
  const [selectedBrand, setSelectedBrand] = useState(brandName || 'All');

  const scrollRef = React.useRef(null);

  useEffect(() => {
    try {
      setRecentlyViewed(JSON.parse(localStorage.getItem('gobez-recently-viewed') || '[]'));
    } catch {
      setRecentlyViewed([]);
    }

    const syncViewed = () => {
      try {
        setRecentlyViewed(JSON.parse(localStorage.getItem('gobez-recently-viewed') || '[]'));
      } catch {
        setRecentlyViewed([]);
      }
    };
    window.addEventListener('gobez-product-viewed', syncViewed);
    return () => window.removeEventListener('gobez-product-viewed', syncViewed);
  }, []);

  const marketUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedBrand !== 'All') params.set('brand', selectedBrand);
    if (priceRange[0] > 0) params.set('min_price', String(priceRange[0]));
    if (priceRange[1] < 50000) params.set('max_price', String(priceRange[1]));
    return `${API_BASE}/products/buyer_market/${params.toString() ? `?${params.toString()}` : ''}`;
  }, [searchTerm, selectedCategory, selectedBrand, priceRange]);

  const handleColorToggle = (color) => {
    setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
  };

  const openProduct = (product) => {
    const view = {
      id: product.id,
      brand: product.brand || '',
      category: product.category_name || '',
      viewedAt: Date.now(),
    };
    try {
      const previous = JSON.parse(localStorage.getItem('gobez-recently-viewed') || '[]');
      const next = [view, ...previous.filter(item => item.id !== product.id)].slice(0, 12);
      localStorage.setItem('gobez-recently-viewed', JSON.stringify(next));
      setRecentlyViewed(next);
      window.dispatchEvent(new CustomEvent('gobez-product-viewed'));
    } catch { /* local recommendations are optional */ }
    navigate(`/product/${product.id}`);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const fetchProducts = async (url = `${API_BASE}/products/buyer_market/`, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    try {
      const res = await api.get(url);
      const apiItems = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const items = import.meta.env.VITE_ENABLE_DEMO_MARKET === 'true'
        ? [...createDemoMarketDeals(), ...apiItems]
        : apiItems;
      const nextUrl = res.data?.next || null;
      
      if (items && items.length > 0) {
        if (isLoadMore) {
          setDeals(prev => [...prev, ...items]);
        } else {
          setDeals(items);
        }
        setNextPage(nextUrl);
      } else if (isLoadMore) {
        setNextPage(null);
      } else if (!isLoadMore) {
        setDeals([]);
        setNextPage(null);
      }
      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error("Error fetching marketplace", err);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get(`${API_BASE}/categories/`);
      const cats = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setAllCategories(cats);
    } catch (err) { console.error("Error fetching categories", err); }
  };

  const fetchPhaseTime = async () => {
    try {
      if (user?.seconds_until_next_change !== undefined) {
        setPhaseTimeLeft(user.seconds_until_next_change);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchCategories();
    fetchPhaseTime();
    const interval = setInterval(() => {
      // Only auto-refresh if we are on the first page and not searching
      if (!nextPage || deals.length <= 24) {
        if (!searchTerm && selectedCategory === 'All' && selectedBrand === 'All') {
          fetchProducts();
        }
      }
    }, 5000);
    const phaseInterval = setInterval(fetchPhaseTime, 5000);
    const phaseTimer = setInterval(() => {
      setPhaseTimeLeft(prev => {
        const next = prev > 0 ? prev - 1 : 0;
        // Trigger exit when timer hit 0 or reset jump detected
        if (prev <= 1 && next === 0) {
           setReliveTransition('exit');
           setTimeout(() => {
             setReliveTransition('enter');
             setTimeout(() => setReliveTransition('none'), 600);
           }, 500);
        }
        return next;
      });
    }, 1000);

    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      setDeals(prevDeals => {
        let itemsToRemove = [];
        const updated = prevDeals.map(deal => {
          if (deal.expires_at) {
            const expiry = new Date(deal.expires_at).getTime();
            if (expiry <= currentTime) {
              itemsToRemove.push(deal.id);
            }
          }
          return deal;
        });

        if (itemsToRemove.length > 0) {
          setExpiredProductIds(prev => {
            const next = new Set(prev);
            itemsToRemove.forEach(id => next.add(id));
            return next;
          });

          setTimeout(() => {
            setDeals(current => current.filter(d => !itemsToRemove.includes(d.id)));
            setExpiredProductIds(prev => {
              const next = new Set(prev);
              itemsToRemove.forEach(id => next.delete(id));
              return next;
            });
          }, 3500);
        }
        return updated;
      });
    }, 100); 
    return () => {
      clearInterval(interval);
      clearInterval(phaseInterval);
      clearInterval(phaseTimer);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    setDeals([]);
    setNextPage(null);
    fetchProducts(marketUrl);
  }, [marketUrl]);

  useEffect(() => {
    if (!nextPage || loadingMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMoreProducts();
    }, { threshold: 0.1 });
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [nextPage, loadingMore]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00';
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (hrs > 0) return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  const confirmMockPayment = async () => {
    if (!selectedOffer) return;
    if (selectedOffer.id < 0) {
      showNotification('Demo listing only — connect the market feed to purchase.', 'error');
      setCheckoutModalOpen(false);
      return;
    }
    setProcessingPayment(true);
    setTimeout(async () => {
      try {
        let endpoint = `${API_BASE}/juggle/${selectedOffer.id}/buy_item/`;
        let payload = { quantity: selectedQuantity };
        
        if (selectedOffer.is_direct) {
          endpoint = `${API_BASE}/products/${selectedOffer.product.id}/buy_direct/`;
          payload = { quantity: selectedQuantity }; 
        }
        
        const res = await api.post(endpoint, payload);
        showNotification(res.data.success, "success");
        setCheckoutModalOpen(false);
        setSelectedOffer(null);
        setSelectedQuantity(1);
        fetchProducts();
      } catch (err) {
        const errorMsg = err.response?.data?.error || "Purchase failed";
        showNotification(errorMsg, "error");
      } finally {
        setProcessingPayment(false);
      }
    }, 1500);
  };

  const handleAddToCart = async (deal) => {
    if (!deal?.product) return;
    if (deal.id < 0) {
      showNotification('Demo listing only — connect the market feed to add it to cart.', 'error');
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
      showNotification(`Added ${deal.product.name} to cart`, 'success');
    } catch (err) {
      showNotification(err.response?.data?.error || `Could not add ${deal.product.name} to cart`, 'error');
    } finally {
      setCartAddingId(null);
    }
  };

  useEffect(() => {
    if (brandName) setSelectedBrand(brandName);
  }, [brandName]);

  useEffect(() => {
    if (deals.length < 2) return undefined;
    const activityTimer = setInterval(() => {
      setActivityIndex(prev => prev + 1);
    }, 4200);
    return () => clearInterval(activityTimer);
  }, [deals.length]);

  useEffect(() => {
    const rails = document.querySelectorAll('.buyer-marketplace-page .horizontal-scroller');
    const cleanups = [];

    rails.forEach(rail => {
      let dragging = false;
      let startX = 0;
      let startScroll = 0;

      const onPointerDown = (event) => {
        dragging = true;
        startX = event.clientX;
        startScroll = rail.scrollLeft;
        rail.classList.add('is-dragging');
        rail.setPointerCapture?.(event.pointerId);
      };
      const onPointerMove = (event) => {
        if (!dragging) return;
        rail.scrollLeft = startScroll - (event.clientX - startX);
      };
      const stopDragging = () => {
        dragging = false;
        rail.classList.remove('is-dragging');
      };
      const onWheel = (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        event.preventDefault();
        rail.scrollLeft += event.deltaY;
      };

      rail.addEventListener('pointerdown', onPointerDown);
      rail.addEventListener('pointermove', onPointerMove);
      rail.addEventListener('pointerup', stopDragging);
      rail.addEventListener('pointercancel', stopDragging);
      rail.addEventListener('pointerleave', stopDragging);
      rail.addEventListener('wheel', onWheel, { passive: false });
      cleanups.push(() => {
        rail.removeEventListener('pointerdown', onPointerDown);
        rail.removeEventListener('pointermove', onPointerMove);
        rail.removeEventListener('pointerup', stopDragging);
        rail.removeEventListener('pointercancel', stopDragging);
        rail.removeEventListener('pointerleave', stopDragging);
        rail.removeEventListener('wheel', onWheel);
      });
    });

    return () => cleanups.forEach(cleanup => cleanup());
  }, [deals.length]);

  const filteredDeals = React.useMemo(() => {
    return deals
      .filter(deal => {
        if (!deal || !deal.product) return false;
        const p = deal.product;
        const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'All' || p.category_name === selectedCategory;
        const matchesBrand = selectedBrand === 'All' || (p.brand || '').toLowerCase() === selectedBrand.toLowerCase();
        const price = parseFloat(deal.markup_price || 0);
        const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
        const matchesJuggle = !juggleOnly || !deal.is_direct;
        return matchesSearch && matchesCategory && matchesBrand && matchesPrice && matchesJuggle;
      })
      .sort((a, b) => {
        if (sortOrder === 'price-low') return parseFloat(a.markup_price || 0) - parseFloat(b.markup_price || 0);
        if (sortOrder === 'price-high') return parseFloat(b.markup_price || 0) - parseFloat(a.markup_price || 0);
        return (b.id || 0) - (a.id || 0);
      });
  }, [deals, searchTerm, selectedCategory, selectedBrand, priceRange, juggleOnly, sortOrder]);

  const categoryNames = ['All', ...new Set([
    ...(Array.isArray(allCategories) ? allCategories : []).map(c => c.parent ? null : c.name),
    ...deals.map(deal => deal?.product?.category_name)
  ].filter(Boolean))];
  const loadMoreProducts = () => {
    if (nextPage && !loadingMore) fetchProducts(nextPage, true);
  };

  // SPLIT DEALS INTO SECTIONS
  const liveJuggles = filteredDeals.filter(d => d && !d.is_direct);
  const directDeals = filteredDeals.filter(d => d && d.is_direct);
  
  const urgentJuggles = liveJuggles.filter(d => {
      if (d && d.expires_at) {
          const expiry = new Date(d.expires_at).getTime();
          const productSecondsLeft = Math.max(0, Math.ceil((expiry - now) / 1000));
          
          return productSecondsLeft < 120 || (productSecondsLeft > 10000 && phaseTimeLeft < 120);
      }
      return false;
  });

  const trendingJuggles = liveJuggles.filter(d => !urgentJuggles.includes(d));

  const activityItems = deals.filter(deal => deal?.product).slice(0, 8);
  const activeMarketItem = activityItems.length > 0
    ? activityItems[activityIndex % activityItems.length]
    : null;
  const recommendationSource = recentlyViewed[0];
  const recommendedDeals = [...filteredDeals]
    .filter(deal => deal?.product && deal.product.id !== recommendationSource?.id)
    .map(deal => ({
      deal,
      score: (recommendationSource && deal.product.brand === recommendationSource.brand ? 3 : 0)
        + (recommendationSource && deal.product.category_name === recommendationSource.category ? 2 : 0)
        + (!deal.is_direct ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || Number(b.deal.id) - Number(a.deal.id))
    .slice(0, 6)
    .map(item => item.deal);
  const directGroups = Array.from(directDeals.reduce((groups, deal) => {
    const groupName = deal.product.category_name || 'Other supply';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(deal);
    return groups;
  }, new Map())).map(([name, items]) => ({ name, items }));

  // Keep the long feed representative of the real market: direct supply and
  // live juggles appear together instead of creating a wall of one listing type.
  const mixedMarketDeals = filteredDeals;
  const directFeedSections = [];
  for (let index = 0; index < mixedMarketDeals.length; index += 6) {
    const items = mixedMarketDeals.slice(index, index + 6);
    const categories = [...new Set(items.map(deal => deal.product.category_name).filter(Boolean))];
    directFeedSections.push({
      items,
      title: index === 0 ? 'Latest market supply' : (categories.length === 1 ? categories[0] : 'More from the market'),
      categories,
    });
  }

  const scrollToDirectGroup = (name) => {
    document.getElementById(`direct-group-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Determine Hero Deal (Highly urgent OR most expensive)
  let heroDeal = null;
  if (urgentJuggles.length > 0 && urgentJuggles[0]?.product) heroDeal = urgentJuggles[0];
  else if (trendingJuggles.length > 0 && trendingJuggles[0]?.product) heroDeal = trendingJuggles[0];
  else if (directDeals.length > 0 && directDeals[0]?.product) heroDeal = directDeals[0];


  // REUSABLE PRODUCT CARD RENDERER
  const renderProductCard = (deal, idx, isHorizontal = false) => {
    if (!deal || !deal.product) return null;
    const product = deal.product;
    const bgColor = product.demo_color || placeholderColors[idx % placeholderColors.length];
    const isDirectSale = deal.is_direct;
    const isDemoListing = Number(deal.id) < 0;

    let productSecondsLeft = 0;
    if (deal.expires_at) {
      const expiry = new Date(deal.expires_at).getTime();
      productSecondsLeft = Math.max(0, Math.ceil((expiry - now) / 1000));
    } else {
      productSecondsLeft = phaseTimeLeft;
    }
    
    const isDestroying = expiredProductIds.has(deal.id);
    const displaySeconds = Math.min(productSecondsLeft, phaseTimeLeft, 300);

    return (
      <div 
        key={deal.id} 
        className={`product-card-container ${isDestroying ? 'expired' : ''} ${isHorizontal ? 'horizontal-card' : ''} ${reliveTransition === 'exit' ? 'renew-exit' : (reliveTransition === 'enter' ? 'renew-enter' : 'staggered-entrance')}`}
        style={{ 
          position: 'relative', 
          cursor: 'pointer', 
          flex: isHorizontal ? '0 0 300px' : undefined,
          animationDelay: `${(idx % 10) * 0.1}s`
        }}
        onClick={() => openProduct(product)}
      >
        {isDestroying && <Sparks />}
        <div className={`card card-alive ${isDestroying ? 'destructing' : ''} ${!isDirectSale && productSecondsLeft < 60 ? 'vibrating' : ( !isDirectSale ? 'juggling' : '')}`} style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', position: 'relative' }}>
          <div style={{ 
            height: isHorizontal ? '200px' : '240px', 
            background: product.image ? `url(${API_BASE.replace('/api', '')}${product.image}) center/cover` : (product.image_url ? `url(${product.image_url}) center/cover` : bgColor),
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {!isDirectSale ? (
              <div className="badge-timer badge-live" style={{ 
                position: 'absolute', top: '1rem', left: '1rem', 
                border: '1px solid rgba(192, 132, 252, 0.4)', 
                padding: '0.4rem 0.6rem', zIndex: 2, background: 'rgba(0,0,0,0.8)',
                borderRadius: '0.5rem', backdropFilter: 'blur(4px)'
              }}>
                <span style={{ color: '#d8e5de', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span className="live-dot" style={{ background: productSecondsLeft <= 0 ? '#ff0000' : (productSecondsLeft < 60 ? '#ef4444' : '#10b981') }}></span> 
                  {productSecondsLeft <= 0 ? 'EXPIRED' : (productSecondsLeft < 60 ? 'ENDING SOON' : 'LIVE JUGGLE')}
                </span>
                <span className="timer-neon" style={{ 
                  color: productSecondsLeft <= 0 ? '#b42318' : (productSecondsLeft < 60 ? '#f87171' : '#c084fc'), 
                  fontWeight: '900', fontSize: '1.1rem', marginLeft: '0.5rem',
                  fontVariantNumeric: 'tabular-nums'
                }}>{formatTime(displaySeconds)}</span>
              </div>
            ) : (
              <div style={{ 
                position: 'absolute', top: '1rem', left: '1rem', 
                border: '1px solid rgba(0, 0, 0, 0.1)', 
                padding: '0.3rem 0.6rem', zIndex: 2, background: 'rgba(255,255,255,0.9)',
                borderRadius: '0.5rem', backdropFilter: 'blur(4px)'
              }}>
                <span style={{ color: '#333', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Standard
                </span>
              </div>
            )}
            {isDemoListing && (
              <div className="demo-listing-badge">Demo preview</div>
            )}
            
            {!isDirectSale && (
              <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                {deal.amount} SLOTS LEFT
              </div>
            )}
          </div>

          <div 
            className={!isDirectSale ? 'new-deal-entry' : ''}
            style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: '800', color: '#111', lineHeight: '1.2' }}>{product.name}</h3>
            </div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
              {product.brand}
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#000' }}>
                  ETB {deal.markup_price}
                </span>
                {isDirectSale && (
                  <span style={{ fontSize: '0.7rem', color: '#888', marginLeft: 'auto' }}>
                    Current offer
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                className="market-cart-button"
                aria-label={`Add ${product.name} to cart`}
                disabled={cartAddingId === deal.id || isDemoListing}
                title={isDemoListing ? 'Demo preview — use a real listing to add to cart' : 'Add to cart'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart(deal);
                }}
              >
                <ShoppingCart size={17} />
              </button>
              <button 
                className="btn-checkout glass-morphism-dark" 
                disabled={isDemoListing}
                title={isDemoListing ? 'Demo preview — use a real listing to buy' : 'Buy now'}
                style={{ flex: 1, color: '#fff', fontWeight: '900', borderRadius: '0.75rem', padding: '0.75rem', border: 'none', transition: 'all 0.3s' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOffer(deal);
                  setSelectedQuantity(1);
                  setCheckoutModalOpen(true);
                }}
                >
                  {isDemoListing ? 'DEMO PREVIEW' : 'BUY NOW'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="buyer-marketplace-page" style={{ minHeight: '100vh', background: '#f5f5f5', color: '#111' }}>
      <Navbar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        categories={categoryNames}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedColors={selectedColors}
        onColorToggle={handleColorToggle}
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        juggleOnly={juggleOnly}
        onJuggleOnlyToggle={() => setJuggleOnly(!juggleOnly)}
      />

      {/* LIVE JUGGLING FEED TICKER */}
      <div style={{ background: '#000', color: '#fff', padding: '0.5rem 0', overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'inline-block', animation: 'ticker 30s linear infinite' }}>
          {[...Array(10)].map((_, i) => (
            <span key={i} style={{ margin: '0 2rem', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <span style={{ color: 'var(--neon-green)' }}>● LIVE</span> {deals.find(d => !d.is_direct)?.product.name || 'HYPE DROPS'} JUGGLED BY {deals.find(d => !d.is_direct)?.juggler_name || 'ELITE USERS'} 
              <span style={{ color: 'var(--neon-green)', margin: '0 1rem' }}> &bull; </span>
              NEW OFFER DETECTED: ETB {deals.find(d => !d.is_direct)?.markup_price || '---'}
            </span>
          ))}
        </div>
        <style>{`
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {/* QUICK CATEGORIES BAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eaeaea', padding: '1rem 2rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {categoryNames.map(cat => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? '#000' : '#f0f0f0',
                color: selectedCategory === cat ? '#fff' : '#333',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '2rem',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="marketplace-intro"><div><span className="marketplace-eyebrow"><i /> Live marketplace</span><h1>Find what’s moving.</h1><p>Watch live Juggles, compare supply, and buy before the current cycle closes.</p></div><div className="marketplace-pulse"><div><span>Live Juggles</span><strong>{liveJuggles.length}</strong></div><div><span>Expiring soon</span><strong className="pulse-warning">{urgentJuggles.length}</strong></div><div><span>Direct supply</span><strong>{directDeals.length}</strong></div></div></div>

      <div className="market-activity-rail" aria-live="polite">
        <div className="market-activity-label"><Activity size={14} /><span>Market activity</span></div>
        <div className="market-activity-message">
          <span className={`activity-status-dot ${activeMarketItem && !activeMarketItem.is_direct ? 'activity-status-live' : 'activity-status-direct'}`} />
          {activeMarketItem ? (
            <><strong>{activeMarketItem.product.name}</strong><span>{activeMarketItem.is_direct ? 'is available in direct supply' : `is live with ${activeMarketItem.amount || 0} slots remaining`}</span></>
          ) : <span>Waiting for the next market offer</span>}
        </div>
        <span className="market-activity-sync">Auto-updating feed</span>
      </div>

      <div className="container" style={{ padding: '2rem' }}>
        
        {/* HERO SECTION */}
        {heroDeal && !searchTerm && selectedCategory === 'All' && (
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ 
              background: '#000', 
              color: '#fff', 
              borderRadius: '2rem', 
              overflow: 'hidden',
              display: 'flex',
              minHeight: '480px',
              cursor: 'pointer',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.1)'
            }} onClick={() => openProduct(heroDeal.product)}>
              {/* ALIVE EFFECTS */}
              <div style={{ flex: 1, padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span className="glass-morphism" style={{ color: '#fff', padding: '0.4rem 1rem', borderRadius: '2rem', fontWeight: '900', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    {heroDeal.is_direct ? 'Featured supply' : 'Live Juggle'}
                  </span>
                  {!heroDeal.is_direct && (
                    <span className="market-expiring-badge">
                      Ends soon
                    </span>
                  )}
                </div>
                
                <h1 style={{ fontSize: '4.5rem', fontWeight: '900', lineHeight: '1', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>{heroDeal.product.name}</h1>
                <p style={{ fontSize: '1.4rem', color: '#aaa', marginBottom: '2.5rem', fontWeight: '600' }}>{heroDeal.product.brand}</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', marginTop: 'auto' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.1em' }}>Current Value</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--neon-green)' }}>ETB {heroDeal.markup_price}</p>
                  </div>
                  {!heroDeal.is_direct && heroDeal.expires_at && (
                    <div className="glass-morphism" style={{ padding: '1.25rem 2rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <p style={{ fontSize: '0.85rem', color: '#ff4444', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} className="timer-neon" /> Ends in
                      </p>
                      <p style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: '#ff4444', fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(Math.max(0, Math.ceil((new Date(heroDeal.expires_at).getTime() - now) / 1000)))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="hero-market-media" style={{ 
                flex: 1, 
                background: heroDeal.product.image ? `url(${API_BASE.replace('/api', '')}${heroDeal.product.image}) center/cover` : (heroDeal.product.image_url ? `url(${heroDeal.product.image_url}) center/cover` : '#222'),
                boxShadow: 'inset 50px 0 100px #000'
              }}></div>
            </div>
          </div>
        )}

        {recommendedDeals.length > 0 && !searchTerm && selectedCategory === 'All' && (
          <div className="recommendation-strip">
            <div className="recommendation-heading">
              <div>
                <span className="marketplace-eyebrow"><i /> {recommendationSource ? 'Picked for you' : 'Good places to start'}</span>
                <h2>{recommendationSource ? `More like ${recommendationSource.brand}` : 'Explore the market'}</h2>
                <p>{recommendationSource ? 'Based on your recent browsing.' : 'A quick mix of live and direct offers.'}</p>
              </div>
              <span className="recommendation-context">{recommendationSource ? 'Personalized' : 'Discovery'}</span>
            </div>
            <div className="horizontal-scroller">
              {recommendedDeals.map((deal, idx) => renderProductCard(deal, idx, true))}
            </div>
          </div>
        )}

        {/* URGENT JUGGLES (EXPIRING SOON) */}
        <div style={{ marginBottom: '6rem', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#ef4444', padding: '0.75rem', borderRadius: '1rem', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}>
              <Flame color="#fff" size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#000' }}>Expiring soon</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#ef4444', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Offers closing within 2 minutes</p>
            </div>
          </div>
          {urgentJuggles.length > 0 ? (
            <div className="horizontal-scroller">
              {urgentJuggles.map((deal, idx) => renderProductCard(deal, idx, true))}
            </div>
          ) : (
            <div style={{ background: '#e5e5e5', padding: '3rem', borderRadius: '0.5rem', textAlign: 'center', border: '2px dashed #ccc' }}>
              <p style={{ fontWeight: 'bold', color: '#888', margin: 0 }}>No highly volatile items dropping right now. Stay tuned.</p>
            </div>
          )}
        </div>

        {/* TRENDING JUGGLES */}
        <div style={{ marginBottom: '6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#000', padding: '0.75rem', borderRadius: '1rem' }}>
              <Clock color="#fff" size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Live market</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#888', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{trendingJuggles.length} active sessions globally</p>
            </div>
          </div>
          {trendingJuggles.length > 0 ? (
            <div className="horizontal-scroller">
              {trendingJuggles.map((deal, idx) => renderProductCard(deal, idx, true))}
            </div>
          ) : (
            <div style={{ background: '#e5e5e5', padding: '3rem', borderRadius: '0.5rem', textAlign: 'center', border: '2px dashed #ccc' }}>
              <p style={{ fontWeight: 'bold', color: '#888', margin: 0 }}>The market is calm. Wait for Juggles to appear.</p>
            </div>
          )}
        </div>

        {/* FEATURED BRANDS SECTION */}
        {directDeals.length > 0 && !searchTerm && (
        <div style={{ 
          marginBottom: '6rem', 
          background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(52, 211, 153, 0.1))', 
          padding: '3rem', 
          borderRadius: '2.5rem',
          border: '1px solid rgba(255,255,255,0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', position: 'relative', zIndex: 2 }}>
            <div style={{ background: '#000', padding: '0.75rem', borderRadius: '1rem', boxShadow: '0 0 20px rgba(0,0,0,0.2)' }}>
              <ShoppingBag color="#fff" size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Browse by brand</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Explore curated collections by brand</p>
            </div>
          </div>
          <div className="horizontal-scroller" style={{ position: 'relative', zIndex: 2 }}>
            {/* Group by brand and show one representative product per brand */}
            {Array.from(new Set(directDeals.map(d => d.product.brand))).map((brand) => {
              const representativeDeal = directDeals.find(d => d.product.brand === brand);
              return (
                <div 
                  key={brand}
                  className="product-card-container horizontal-card"
                  style={{ flex: '0 0 300px', cursor: 'pointer' }}
                  onClick={() => navigate(`/brand/${brand.toLowerCase()}`)}
                >
                  <div className="card card-alive" style={{ padding: '0', overflow: 'hidden', height: '100%', background: '#fff' }}>
                    <div style={{ 
                      height: '200px', 
                      background: representativeDeal.product.image ? `url(${API_BASE.replace('/api', '')}${representativeDeal.product.image}) center/cover` : (representativeDeal.product.image_url ? `url(${representativeDeal.product.image_url}) center/cover` : '#eee'),
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div className="glass-morphism" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', color: '#fff', fontWeight: '900', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {brand}
                      </div>
                    </div>
                    <div style={{ padding: '1.25rem', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '800', color: '#888', textTransform: 'uppercase' }}>Shop All</p>
                      <h3 style={{ margin: '0.25rem 0', fontSize: '1.2rem', fontWeight: '900' }}>{brand}</h3>
                      <button className="btn-checkout" style={{ padding: '0.5rem', marginTop: '1rem', fontSize: '0.8rem' }}>VIEW COLLECTION</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* MIXED MARKET FEED (DIRECT SUPPLY + JUGGLES) */}
        <div className="direct-supply-area" style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase' }}>Direct supply + live Juggles</h2>
          </div>
          {mixedMarketDeals.length > 0 ? (
            <div className="direct-feed-sections">
              {directFeedSections.map((section, sectionIndex) => (
                <React.Fragment key={`${section.title}-${sectionIndex}`}>
                  {sectionIndex > 0 && (
                    <div className="direct-feed-interlude">
                      <span>Keep exploring</span>
                      <strong>{section.title}</strong>
                      <small>{section.items.length} current offers continue below</small>
                    </div>
                  )}
                  <section className="direct-feed-section">
                    <div className="direct-feed-heading">
                      <div><span>{sectionIndex === 0 ? 'Market feed' : 'More from the market'}</span><h3>{section.title}</h3></div>
                      <span>{section.items.length} {section.items.length === 1 ? 'offer' : 'offers'}</span>
                    </div>
                    <div className="grid-products">
                      {section.items.map((deal, idx) => renderProductCard(deal, idx + sectionIndex, false))}
                    </div>
                  </section>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div style={{ background: '#e5e5e5', padding: '3rem', borderRadius: '0.5rem', textAlign: 'center', border: '2px dashed #ccc' }}>
              <p style={{ fontWeight: 'bold', color: '#888', margin: 0 }}>No standard supply available.</p>
            </div>
          )}
        </div>
        
        {filteredDeals.length === 0 && !loading && (
          <div className="card" style={{ textAlign: 'center', padding: '6rem 2rem', background: '#fff' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#888' }}>No items match your criteria.</p>
          </div>
        )}
      </div>

      {/* Infinite Scroll Sentinel */}
      <div ref={scrollRef} className="market-pagination" aria-live="polite">
        {loadingMore ? (
          <span className="market-pagination-loading"><i /> Loading more offers…</span>
        ) : nextPage ? (
          <button onClick={loadMoreProducts} className="market-load-more">Load more market offers <ChevronRight size={15} /></button>
        ) : (
          <span className="market-pagination-end">You’re all caught up · end of market feed</span>
        )}
      </div>

      {/* CHECKOUT MODAL (TEST MODE) WITH QUANTITY */}
      {checkoutModalOpen && selectedOffer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '450px', background: '#fff', color: '#000', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => !processingPayment && setCheckoutModalOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontSize: '1.5rem' }}
            >
              &times;
            </button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-block', background: '#f5f5f5', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                <CreditCard size={32} color="#000" />
              </div>
              <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '900' }}>Checkout <span style={{fontSize: '0.8rem', color: '#fff', background: '#000', padding: '2px 6px', borderRadius: '4px'}}>(TEST)</span></h2>
            </div>
            
            <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #eaeaea' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{selectedOffer.product.name}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0' }}>
                <span className="text-muted" style={{ fontWeight: 'bold' }}>Quantity:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff', border: '1px solid #ddd', padding: '0.25rem 0.75rem', borderRadius: '2rem' }}>
                  <button 
                    onClick={() => setSelectedQuantity(q => Math.max(1, q - 1))}
                    style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
                  >-</button>
                  <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{selectedQuantity}</span>
                  <button 
                    onClick={() => setSelectedQuantity(q => Math.min(selectedOffer.amount || 1, q + 1))}
                    style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
                  >+</button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                <span className="text-muted">Unit Price:</span>
                <span>ETB {selectedOffer.markup_price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                <span className="text-muted">Delivery:</span>
                <span>ETB {selectedOffer.product.delivery_fee || 0}</span>
              </div>
              
              <div style={{ borderTop: '2px solid #000', margin: '1rem 0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: '900' }}>Total Due:</span>
                <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#000' }}>
                  ETB {(parseFloat(selectedOffer.markup_price) * selectedQuantity + parseFloat(selectedOffer.product.delivery_fee || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <button 
              className="btn-checkout" 
              onClick={confirmMockPayment}
              disabled={processingPayment}
              style={{ width: '100%', background: '#000', color: '#fff', padding: '1rem', fontWeight: '900', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {processingPayment ? 'Processing...' : <><ShieldCheck size={20} /> AUTHORIZE PAYMENT</>}
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATION */}
      {notification.visible && (
        <div className={`notification-toast ${notification.type}`} style={{ background: notification.type === 'success' ? '#000' : '#ef4444', color: '#fff' }}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{notification.message}</span>
        </div>
      )}

      <style>{`
      @keyframes spark-destruction {
        0% { transform: scale(1); opacity: 1; filter: brightness(1) blur(0) grayscale(0); }
        30% { transform: scale(1.02) rotate(1deg); filter: brightness(1.5) blur(1px) grayscale(0.2); }
        100% { transform: scale(0.9) translateY(20px) rotate(-2deg); opacity: 0; filter: brightness(0.5) blur(15px) grayscale(1); }
      }

      @keyframes new-deal-flash {
        0% { filter: brightness(1) contrast(1); }
        30% { filter: brightness(1.5) contrast(1.2); }
        100% { filter: brightness(1) contrast(1); }
      }

      .new-deal-entry {
        animation: new-deal-flash 1s ease-out;
      }

      .grid-products {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
      }

      .horizontal-scroller {
        display: flex;
        overflow-x: auto;
        gap: 1.5rem;
        padding-bottom: 1rem;
        scroll-snap-type: x mandatory;
      }
      
      .horizontal-scroller::-webkit-scrollbar {
        height: 8px;
        background: #eaeaea;
        border-radius: 4px;
      }
      
      .horizontal-scroller::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
      }

      .horizontal-card {
        scroll-snap-align: start;
      }

      .product-card-container {
        transition: opacity 0.8s ease, transform 0.8s ease;
        overflow: hidden;
      }

      .product-card-container.expired {
        opacity: 0;
        transform: scale(0.85);
        pointer-events: none;
        width: 0 !important;
        margin: 0 !important;
        flex: 0 0 0 !important;
      }

      .card {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border: 1px solid #eaeaea;
        border-radius: 0.5rem;
      }

      .destructing {
        animation: spark-destruction 3s ease-in-out forwards;
      }

      .spark-particle {
        position: absolute;
        pointer-events: none;
        z-index: 100;
        animation: spark-fly 2.5s cubic-bezier(0.11, 0, 0.5, 0) forwards;
      }

      @keyframes spark-fly {
        0% { transform: translate(0, 0) scale(1.5); opacity: 1; }
        20% { opacity: 1; }
        100% { transform: translate(var(--dx), var(--dy)) rotate(360deg) scale(0); opacity: 0; }
      }
      `}</style>
    </div>
  );
}

export default BuyerMarketplace;
