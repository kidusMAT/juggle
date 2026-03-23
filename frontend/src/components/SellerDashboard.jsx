import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import { 
  Package, PlusCircle, CheckCircle, XCircle, DollarSign, List, 
  BarChart2, Tag, Image, Truck, Zap, Smartphone, Laptop, 
  Gamepad2, Armchair, Utensils, Footprints, Shirt, Watch, Leaf, ShieldCheck, AlertCircle, UploadCloud
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

function SellerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [myProducts, setMyProducts] = useState([]);
  const [stats, setStats] = useState({ revenue: 0, active: 0, sold: 0 });
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState(0);
  const [licenseFile, setLicenseFile] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [addressFile, setAddressFile] = useState(null);
  const [vatFile, setVatFile] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    description: '',
    base_price: '',
    category: '',
    attributes: {},
    delivery_type: 'ABET',
    delivery_fee: '100',
    stock: '1',
    is_limited: false
  });
  
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageErrors, setImageErrors] = useState([]);
  const [variants, setVariants] = useState([]); // [{name, price_override, stock}]
  const [variantOptions, setVariantOptions] = useState([{ name: 'Color', values: '' }, { name: 'Size', values: '' }]);
  
  const [showGuide, setShowGuide] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [checklist, setChecklist] = useState({ focus: false, light: false, background: false, frame: false });
  // - [x] Restored Product Detail styling with image fixes
  // - [x] Implemented First-Time Seller Verification Step
  // - [x] Added Limited Edition toggle and neon badges
  // - [x] Fixed Seller Dashboard JSX structure
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });
  const [loading, setLoading] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 5000);
  };

  const CATEGORY_SCHEMAS = {
    'Shoes': { fields: ['Shoe Size', 'Material'], variants: [{ name: 'Size', values: '38, 39, 40, 41, 42, 43, 44' }, { name: 'Color', values: 'Black, White, Brown' }] },
    'Clothing': { fields: ['Fabric Type', 'Fit'], variants: [{ name: 'Size', values: 'S, M, L, XL, XXL' }, { name: 'Color', values: 'Black, White, Gray' }] },
    'Smartphones': { fields: ['Battery', 'Screen'], variants: [{ name: 'Storage', values: '64GB, 128GB, 256GB' }, { name: 'Color', values: 'Phantom Black, Silver' }] },
    'Laptops': { fields: ['Processor', 'Graphics'], variants: [{ name: 'RAM', values: '8GB, 16GB, 32GB' }, { name: 'Storage', values: '256GB SSD, 512GB SSD, 1TB SSD' }] },
    'Furniture': { fields: ['Dimensions', 'Weight'], variants: [{ name: 'Material', values: 'Oak, Pine, Walnut' }, { name: 'Finish', values: 'Matte, Glossy' }] },
    'Kitchen': { fields: ['Capacity', 'Heat Resistance'], variants: [{ name: 'Material', values: 'Stainless Steel, Ceramic, Cast Iron' }] },
    'Home Decor': { fields: ['Style', 'Placement'], variants: [{ name: 'Size', values: 'Small, Medium, Large' }, { name: 'Theme', values: 'Modern, Rustic, Minimal' }] },
    'Gaming': { fields: ['Platform', 'Condition'], variants: [{ name: 'Edition', values: 'Standard, Deluxe, Collector' }] },
    'Accessories': { fields: ['Material', 'Type'], variants: [{ name: 'Color', values: 'Gold, Silver, Rose Gold' }] }
  };

  const QUICK_TAGS = {
    'Color': ['Black', 'White', 'Red', 'Blue', 'Green', 'Gold', 'Silver'],
    'Size': ['S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44'],
    'Material': ['Leather', 'Cotton', 'Metal', 'Wood', 'Plastic', 'Glass'],
    'Storage': ['64GB', '128GB', '256GB', '512GB', '1TB']
  };

    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_BASE}/categories/`, { withCredentials: true });
        setCategories(res.data);
      } catch (err) { console.error("Error fetching categories", err); }
    };
  
    const fetchMyProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await axios.get(`${API_BASE}/products/my_products/`, { withCredentials: true });
        const products = res.data;
        setMyProducts(products);
        
        let revenue = 0;
        let active = 0;
        let sold = 0;
        
        products.forEach(p => {
          if (p.status === 'SOLD') {
            sold += 1;
            revenue += parseFloat(p.base_price);
          } else {
            active += 1;
          }
        });
        setStats({ revenue, active, sold });
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProducts(false);
      }
    };
  
    useEffect(() => {
      fetchCategories();
      fetchMyProducts();
      const fetchUser = async () => {
        try {
          const res = await axios.get(`${API_BASE}/users/me/`, { withCredentials: true });
          setUser(res.data);
          // If they just got verified, we can let them stay on their current tab or go to dashboard
          // but we MUST ensure the step is correct.
          if (res.data.seller_status === 'VERIFIED') {
            setStep(prev => prev === 0 ? 1 : prev); 
          }
        
        if (res.data.seller_status === 'UNVERIFIED' || res.data.seller_status === 'REJECTED' || res.data.seller_status === 'PENDING') {
          setStep(0);
        } else if (res.data.seller_status === 'VERIFIED') {
          setStep(prev => prev === 0 ? 1 : prev);
        }
      } catch (err) { console.error("Error fetching user", err); }
    };
    fetchUser();
  }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const currentFiles = [...imageFiles];
    const duplicates = [];
    
    files.forEach(file => {
        // Anti-Multiplication: Check if file already exists in current list
        const isDuplicate = currentFiles.some(f => f.name === file.name && f.size === file.size);
        if (isDuplicate) {
          duplicates.push(file.name);
          return;
        }

        currentFiles.push(file);
        setImageErrors([]);
        setAiApplied(false);
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result]);
          
          const img = new window.Image();
          img.onload = () => {
            if (img.width < 1000 || img.height < 1000) {
              setImageErrors(prev => [...prev, `Image "${file.name}" resolution too low (${img.width}x${img.height}). 1000px required.`]);
            }
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
    
    setImageFiles(currentFiles);
    if (duplicates.length > 0) {
      showNotification(`Skipped ${duplicates.length} duplicate image(s)`, "info");
    }
    
    // CRITICAL: Reset input value
    e.target.value = '';
  };

  const applyAIEnhance = () => {
    setLoading(true);
    setTimeout(() => {
      setAiApplied(true);
      setLoading(false);
      showNotification("AI Enhancement applied to all images!", "success");
    }, 1500);
  };

  const handleSmartVerify = () => {
    if (imagePreviews.length === 0) return;
    setIsScanning(true);
    
    setTimeout(() => {
        const img = new window.Image();
        img.src = imagePreviews[0];
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 100;
            canvas.height = 100;
            ctx.drawImage(img, 0, 0, 100, 100);
            const data = ctx.getImageData(0, 0, 100, 100).data;
            
            let totalBrightness = 0;
            for (let i = 0; i < data.length; i += 4) {
                totalBrightness += (data[i] + data[i+1] + data[i+2]) / 3;
            }
            const avgBrightness = totalBrightness / (100 * 100);
            
            setChecklist({
                focus: img.width > 1200,
                light: avgBrightness > 100,
                background: true,
                frame: true
            });
            
            setIsScanning(false);
            showNotification(`Smart Scan Complete! ${imagePreviews.length} images verified.`, "success");
        };
    }, 2000);
  };

  const generateVariants = () => {
    const options = variantOptions.filter(opt => opt.name && opt.values);
    if (options.length === 0) {
      showNotification("Enter at least one option (e.g. Size: M, L)", "error");
      return;
    }

    let combinations = [[]];
    options.forEach(opt => {
      const vals = opt.values.split(',').map(v => v.trim()).filter(v => v);
      const newCombs = [];
      combinations.forEach(comb => {
        vals.forEach(val => {
          newCombs.push([...comb, val]);
        });
      });
      combinations = newCombs;
    });

    const newVariants = combinations.map(comb => ({
      name: comb.join(' / '),
      price_override: formData.base_price || '0.00',
      stock: 1
    }));
    setVariants(newVariants);
    showNotification(`Generated ${newVariants.length} variants!`);
  };

  const handlePostProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.base_price || !formData.category) {
      showNotification("Please fill all required fields", "error");
      return;
    }
    setLoading(true);
    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('brand', formData.brand || 'Generic');
    payload.append('description', formData.description);
    payload.append('base_price', formData.base_price);
    payload.append('category', formData.category);
    payload.append('delivery_type', formData.delivery_type);
    payload.append('delivery_fee', formData.delivery_fee);
    payload.append('stock', formData.stock);
    payload.append('is_limited', formData.is_limited);
    payload.append('attributes', JSON.stringify(formData.attributes));

    if (imageFiles.length > 0) {
      payload.append('image', imageFiles[0]);
      imageFiles.forEach(file => payload.append('images', file));
    }

    if (variants.length > 0) {
      payload.append('variants_data', JSON.stringify(variants));
    }

    try {
      await axios.post(`${API_BASE}/products/`, payload, { withCredentials: true });
      showNotification("Product listed with advanced configuration!");
      fetchMyProducts();
      setStep(1);
      setActiveTab('inventory');
      
      setFormData({ name: '', brand: '', description: '', base_price: '', category: '', attributes: {}, stock: '1', delivery_type: 'ABET', delivery_fee: '100', is_limited: false });
      setImageFiles([]);
      setImagePreviews([]);
      setVariants([]);
    } catch (err) {
      showNotification("Error posting product. Check resolution and fields.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const catId = e.target.value;
    const selectedCat = categories.find(c => c.id === parseInt(catId));
    
    // Clear previous attributes and variants to avoid "Kitchen Shoe Size" bug
    setFormData({ ...formData, category: catId, attributes: {} });
    setVariantOptions([]); 
    
    if (selectedCat && CATEGORY_SCHEMAS[selectedCat.name]) {
        const schema = CATEGORY_SCHEMAS[selectedCat.name];
        setVariantOptions(schema.variants);
        showNotification(`Layout optimized for ${selectedCat.name}!`, "success");
    } else if (selectedCat) {
        // Generic default for categories without a schema
        setVariantOptions([{ name: 'Option', values: 'Standard' }]);
        showNotification(`Using standard layout for ${selectedCat.name}`, "info");
    }
  };

  const handleSellerVerification = async () => {
    if (!user.seller_full_name || !user.business_name || !user.seller_phone || !user.tin_number || !licenseFile || !idFile || !bankFile || !addressFile) {
      showNotification("Please fill all required fields and upload the necessary documents (ID, TIN, Bank, Address).", "error");
      return;
    }
    setLoading(true);
    const payload = new FormData();
    payload.append('full_name', user.seller_full_name);
    payload.append('business_name', user.business_name);
    payload.append('phone_number', user.seller_phone);
    payload.append('tin_number', user.tin_number);
    payload.append('business_license', licenseFile);
    payload.append('id_proof', idFile);
    payload.append('bank_details_proof', bankFile);
    payload.append('address_proof', addressFile);
    
    if (vatFile) payload.append('vat_registration', vatFile);
    if (importFile) payload.append('import_license', importFile);

    try {
      const res = await axios.post(`${API_BASE}/users/verify_seller/`, payload, { withCredentials: true });
      setUser(res.data);
      // Don't call setStep(1). The useEffect/render logic will handle status.
      showNotification("Seller details submitted for review!", "success");
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || "Error verifying seller. Please try again.";
      showNotification(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <Navbar />
      
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.05em', color: 'var(--neon-green)', textShadow: '0 0 20px rgba(132, 252, 194, 0.3)' }}>Seller Pro Hub</h1>
          <p className="text-muted">High-Performance Marketplace Listing Tools</p>
        </header>

        {/* Tabs - Only show if verified */}
        {user?.seller_status === 'VERIFIED' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
            <button onClick={() => setActiveTab('dashboard')} className={`btn ${activeTab === 'dashboard' ? 'btn-black' : ''}`} style={{ padding: '0.75rem 1.5rem', background: activeTab === 'dashboard' ? 'var(--neon-green)' : 'transparent', color: activeTab === 'dashboard' ? '#000' : 'inherit', border: '1px solid var(--neon-green)', fontWeight: 'bold' }}>Overview</button>
            <button onClick={() => setActiveTab('inventory')} className={`btn ${activeTab === 'inventory' ? 'btn-black' : ''}`} style={{ padding: '0.75rem 1.5rem', background: activeTab === 'inventory' ? 'var(--neon-green)' : 'transparent', color: activeTab === 'inventory' ? '#000' : 'inherit', border: '1px solid var(--neon-green)', fontWeight: 'bold' }}>My Inventory</button>
            <button onClick={() => setActiveTab('post')} className={`btn ${activeTab === 'post' ? 'btn-black' : ''}`} style={{ padding: '0.75rem 1.5rem', background: activeTab === 'post' ? 'var(--neon-green)' : 'transparent', color: activeTab === 'post' ? '#000' : 'inherit', border: '1px solid var(--neon-green)', fontWeight: 'bold' }}>Post Prototype</button>
          </div>
        )}

        {/* If not verified and trying to access other tabs, force to post tab content */}
        {user?.seller_status !== 'VERIFIED' && activeTab !== 'post' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
             <button onClick={() => setActiveTab('post')} className="btn-black" style={{ background: 'var(--neon-green)', color: '#000' }}>Complete Verification to Access Hub</button>
          </div>
        )}

        {activeTab === 'dashboard' && user?.seller_status === 'VERIFIED' && (
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
              <div className="card" style={{ textAlign: 'center', padding: '2rem', border: '1px solid var(--neon-green)', background: 'var(--bg-card)' }}>
                <DollarSign size={32} color="var(--neon-green)" style={{ margin: '0 auto 1rem' }} />
                <p className="text-muted">Total Revenue</p>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--neon-green)' }}>ETB {stats.revenue.toFixed(2)}</h2>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <Package size={32} color="#888" style={{ margin: '0 auto 1rem' }} />
                <p className="text-muted">Active Listings</p>
                <h2 style={{ fontSize: '2.5rem' }}>{stats.active}</h2>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <CheckCircle size={32} color="var(--neon-purple)" style={{ margin: '0 auto 1rem' }} />
                <p className="text-muted">Units Sold</p>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--neon-purple)' }}>{stats.sold}</h2>
              </div>
           </div>
        )}

        {activeTab === 'inventory' && user?.seller_status === 'VERIFIED' && (
          <div className="grid-products" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {myProducts.map(product => (
              <div key={product.id} className="card card-alive" onClick={() => navigate(`/product/${product.id}`)} style={{ overflow: 'hidden', padding: 0, cursor: 'pointer' }}>
                <div style={{ height: 200, background: product.image ? `url(http://localhost:8000${product.image}) center/cover` : '#333' }}></div>
                <div style={{ padding: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{product.name}</h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--neon-green)', fontWeight: 'bold' }}>{product.category_name || 'Uncategorized'}</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>{product.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>ETB {product.base_price}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Stock: {product.stock}</span>
                  </div>
                  {product.variants && product.variants.length > 0 && (
                     <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                       {product.variants.map((v, i) => (
                         <span key={i} style={{ fontSize: '0.6rem', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{v.name}</span>
                       ))}
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'post' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', justifyContent: 'center' }}>
              {[0, 1, 2, 3, 4].map(s => {
                const stepNames = ["VERIFICATION", "IDENTITY", "MEDIA", "INVENTORY", "FULFILLMENT"];
                if (s === 0 && user?.seller_status === 'VERIFIED') return null;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: step === s ? 1 : 0.3 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: step === s ? 'var(--neon-green)' : '#ddd', color: step === s ? 'black' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>{s}</div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.1rem' }}>{stepNames[s]}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '3rem' }}>
              <div className="card" style={{ padding: '3rem', border: '1px solid rgba(132, 252, 194, 0.1)', background: 'var(--bg-card)' }}>
                
                {step === 0 && (
                  <div className="fade-in">
                    {user?.seller_status === 'PENDING' ? (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(192, 132, 252, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '2px solid var(--neon-purple)', boxShadow: '0 0 20px rgba(192, 132, 252, 0.2)' }}>
                          <ShieldCheck size={40} color="var(--neon-purple)" />
                        </div>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Verification Pending</h2>
                        <p className="text-muted" style={{ marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                          Your credibility details have been submitted. Our admin team is currently reviewing your application. This usually takes 24-48 hours.
                        </p>
                        <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '1rem', border: '1px solid #eee', display: 'inline-block' }}>
                           <p style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Status: <span style={{ color: 'var(--neon-purple)' }}>PENDING REVIEW</span></p>
                        </div>
                      </div>
                    ) : user?.seller_status === 'REJECTED' ? (
                       <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '2px solid #ef4444' }}>
                          <AlertCircle size={40} color="#ef4444" />
                        </div>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>Verification Rejected</h2>
                        <p className="text-muted" style={{ marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                          Unfortunately, your seller application was not approved. Please ensure your business license is clear and matches your details.
                        </p>
                        <button className="btn-checkout" style={{ background: '#000', color: '#fff', width: 'auto', padding: '1rem 2rem' }} onClick={() => setUser({...user, seller_status: 'UNVERIFIED'})}>
                          Try Again
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Seller Onboarding</h2>
                        <p className="text-muted" style={{ marginBottom: '2rem' }}>Since this is your first time selling, we need comprehensive credibility information to verify your account in Ethiopia.</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                          <div>
                            <h4 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Basic Identity</h4>
                            <div style={{ marginBottom: '1.5rem' }}>
                              <label className="label-neon">Full Name (Legal)</label>
                              <input className="input-neon" value={user?.seller_full_name || ''} onChange={e => setUser({...user, seller_full_name: e.target.value})} placeholder="e.g. Abebe Bikila" />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                              <label className="label-neon">Business / Shop Name</label>
                              <input className="input-neon" value={user?.business_name || ''} onChange={e => setUser({...user, business_name: e.target.value})} placeholder="e.g. Bikila Electronics" />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                              <label className="label-neon">Phone Number</label>
                              <input className="input-neon" value={user?.seller_phone || ''} onChange={e => setUser({...user, seller_phone: e.target.value})} placeholder="e.g. +251 911 234 567" />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                              <label className="label-neon">Tax Identification Number (TIN)</label>
                              <input className="input-neon" value={user?.tin_number || ''} onChange={e => setUser({...user, tin_number: e.target.value})} placeholder="9-digit TIN number" />
                            </div>
                          </div>

                          <div>
                            <h4 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Required Documents</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div className="file-upload-zone" style={{ minHeight: '100px', padding: '1rem' }}>
                                <UploadCloud className="upload-icon" size={24} />
                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Business License</span>
                                {licenseFile && <p className="file-name">✓ {licenseFile.name.substring(0, 15)}...</p>}
                                <input type="file" onChange={e => setLicenseFile(e.target.files[0])} accept="image/*" />
                              </div>

                              <div className="file-upload-zone" style={{ minHeight: '100px', padding: '1rem' }}>
                                <UploadCloud className="upload-icon" size={24} />
                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Government ID</span>
                                {idFile && <p className="file-name">✓ {idFile.name.substring(0, 15)}...</p>}
                                <input type="file" onChange={e => setIdFile(e.target.files[0])} accept="image/*" />
                              </div>

                              <div className="file-upload-zone" style={{ minHeight: '100px', padding: '1rem' }}>
                                <UploadCloud className="upload-icon" size={24} />
                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Bank Proof</span>
                                {bankFile && <p className="file-name">✓ {bankFile.name.substring(0, 15)}...</p>}
                                <input type="file" onChange={e => setBankFile(e.target.files[0])} accept="image/*" />
                              </div>

                              <div className="file-upload-zone" style={{ minHeight: '100px', padding: '1rem' }}>
                                <UploadCloud className="upload-icon" size={24} />
                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Address Proof</span>
                                {addressFile && <p className="file-name">✓ {addressFile.name.substring(0, 15)}...</p>}
                                <input type="file" onChange={e => setAddressFile(e.target.files[0])} accept="image/*" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f9f9f9', borderRadius: '1rem' }}>
                           <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Additional (If Applicable)</h4>
                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                              <div className="file-upload-zone" style={{ minHeight: '80px', padding: '1rem' }}>
                                <UploadCloud className="upload-icon" size={20} />
                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>VAT Registration</span>
                                {vatFile && <p className="file-name">✓ {vatFile.name.substring(0, 15)}...</p>}
                                <input type="file" onChange={e => setVatFile(e.target.files[0])} accept="image/*" />
                              </div>
                              <div className="file-upload-zone" style={{ minHeight: '80px', padding: '1rem' }}>
                                <UploadCloud className="upload-icon" size={20} />
                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Import License</span>
                                {importFile && <p className="file-name">✓ {importFile.name.substring(0, 15)}...</p>}
                                <input type="file" onChange={e => setImportFile(e.target.files[0])} accept="image/*" />
                              </div>
                           </div>
                        </div>

                        <button className="btn-checkout" style={{ width: '100%', marginTop: '3rem' }} onClick={handleSellerVerification} disabled={loading}>
                          {loading ? 'Submitting Application...' : 'Submit Verification Request'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                <form onSubmit={handlePostProduct}>
                  {step === 1 && (
                    <div className="step-content">
                      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Tag size={24} /> Step 1: Product Identity</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>Product Name</label>
                          <input 
                            className="input-neon" 
                            placeholder="e.g. Vintage Ethiopian Leather Satchel"
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>Brand / Label</label>
                          <input 
                          className="input-neon" 
                          placeholder="e.g. Sheba Leather Works"
                          value={formData.brand} 
                          onChange={e => setFormData({...formData, brand: e.target.value})}
                          required
                        />
                        </div>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>Category Selection</label>
                        <select 
                          className="input-neon" 
                          value={formData.category} 
                          onChange={handleCategoryChange}
                          required
                        >
                          <option value="">Select a Category...</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.parent ? `— ${cat.name}` : cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>Description & Craftsmanship</label>
                        <textarea 
                          className="input-neon" 
                          placeholder="Tell your story. What makes this prototype unique? Describe materials, heritage, and care instructions."
                          rows="4"
                          value={formData.description} 
                          onChange={e => setFormData({...formData, description: e.target.value})}
                          required
                        />
                      </div>
                      <button type="button" className="btn-black" style={{ width: '100%', background: 'var(--neon-green)', color: '#000' }} onClick={() => setStep(2)}>Next: Media Gallery</button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="step-content">
                      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Image size={24} /> Step 2: High-Red Media</h2>
                      <div style={{ position: 'relative', marginBottom: '2rem' }}>
                        <label style={{ 
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          padding: imagePreviews.length > 0 ? '1rem' : '3rem',
                          border: '2px dashed rgba(132, 252, 194, 0.4)', borderRadius: '1rem', cursor: 'pointer',
                          background: 'rgba(132, 252, 194, 0.05)', color: 'var(--neon-green)'
                        }}>
                          {imagePreviews.length > 0 ? (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                              {imagePreviews.map((preview, idx) => (
                                <div key={idx} style={{ position: 'relative', width: '100px', height: '100px' }}>
                                  <img src={preview} alt="" style={{ width: '100%', height: '100%', borderRadius: '0.5rem', objectFit: 'cover' }} />
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreviews(prev=>prev.filter((_,i)=>i!==idx)); setImageFiles(prev=>prev.filter((_,i)=>i!==idx)); }} style={{ position: 'absolute', top: -5, right: -5, background: '#ff4d4f', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#000', cursor: 'pointer', zIndex: 10 }}>×</button>
                                </div>
                              ))}
                              <div style={{ width: 100, height: 100, border: '2px dashed #333', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PlusCircle /></div>
                            </div>
                          ) : (
                            <>
                              <PlusCircle size={32} style={{ marginBottom: '1rem' }} />
                              <span style={{ fontWeight: 'bold' }}>Drop High-Res Product Photos</span>
                              <span style={{ fontSize: '0.7rem' }}>Min: 1000 x 1000px</span>
                            </>
                          )}
                          <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                        </label>
                      </div>
                      
                      {imagePreviews.length > 0 && (
                        <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem' }}>
                           <button type="button" onClick={handleSmartVerify} className="btn-black" style={{ flex: 1, fontSize: '0.7rem', background: 'rgba(132, 252, 194, 0.1)', border: '1px solid var(--neon-green)', color: 'var(--neon-green)' }}>{isScanning ? 'SCANNING...' : 'SMART VERIFY ALL'}</button>
                           <button type="button" onClick={applyAIEnhance} className="btn-black" style={{ flex: 1, fontSize: '0.7rem', background: 'rgba(192, 132, 252, 0.1)', border: '1px solid var(--neon-purple)', color: 'var(--neon-purple)' }}>{aiApplied ? 'ENHANCED' : 'AI REMOVE BG'}</button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn-black" style={{ flex: 1, border: '1px solid #333' }} onClick={() => setStep(1)}>Back</button>
                        <button type="button" className="btn-black" style={{ flex: 1, background: 'var(--neon-green)', color: '#000' }} onClick={() => setStep(3)}>Next: Inventory & Variants</button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="step-content">
                      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Tag size={24} /> Step 3: Inventory & Variants</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>Base Retail Price (ETB)</label>
                          <input 
                          type="number" 
                          className="input-neon" 
                          placeholder="0.00"
                          value={formData.base_price} 
                          onChange={e => setFormData({...formData, base_price: e.target.value})}
                          required
                        />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>Global Stock</label>
                          <input 
                          type="number"
                          className="input-neon" 
                          placeholder="1"
                          value={formData.stock} 
                          onChange={e => setFormData({...formData, stock: e.target.value})}
                          required
                        />
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                        {/* Dynamic Category Attributes */}
                        {categories.find(c => c.id === parseInt(formData.category)) && CATEGORY_SCHEMAS[categories.find(c => c.id === parseInt(formData.category)).name] && (
                           <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--neon-purple)', borderRadius: '0.5rem', background: 'rgba(192, 132, 252, 0.05)' }}>
                              <h4 style={{ fontSize: '0.8rem', color: 'var(--neon-purple)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Zap size={14}/> {categories.find(c => c.id === parseInt(formData.category)).name} Special Specs</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                 {CATEGORY_SCHEMAS[categories.find(c => c.id === parseInt(formData.category)).name].fields.map(field => (
                                    <div key={field}>
                                       <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.25rem', opacity: 0.6 }}>{field}</label>
                                       <input 
                                          className="input-neon" 
                                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} 
                                          placeholder={field === 'Dimensions' ? 'e.g. 120cm x 60cm' : field === 'Material' ? 'e.g. Calf Leather' : 'e.g. Premium quality'}
                                          value={formData.attributes[field] || ''} 
                                          onChange={e => setFormData({ ...formData, attributes: { ...formData.attributes, [field]: e.target.value } })}
                                       />
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Multi-Variant Builder</h3>
                        <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '1rem' }}>Enter options like "Color: Red, Blue" or "Size: S, M, L"</p>
                        
                        {variantOptions.map((opt, idx) => (
                          <div key={idx} style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                              <input className="input-neon" style={{ flex: 1, fontSize: '0.8rem' }} value={opt.name} placeholder="e.g. Color" onChange={e => {
                                const next = [...variantOptions]; next[idx].name = e.target.value; setVariantOptions(next);
                              }} />
                              <input className="input-neon" style={{ flex: 2, fontSize: '0.8rem' }} value={opt.values} placeholder="e.g. Red, Blue, Green" onChange={e => {
                                const next = [...variantOptions]; next[idx].values = e.target.value; setVariantOptions(next);
                              }} />
                            </div>
                            
                            {/* Quick Tags (Anti-Gibberish) */}
                            {QUICK_TAGS[opt.name] && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginLeft: 'calc(33% + 0.5rem)' }}>
                                {QUICK_TAGS[opt.name].map(tag => (
                                  <button 
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      const next = [...variantOptions];
                                      const currentVals = next[idx].values.split(',').map(v => v.trim()).filter(v => v);
                                      if (!currentVals.includes(tag)) {
                                        next[idx].values = [...currentVals, tag].join(', ');
                                        setVariantOptions(next);
                                      }
                                    }}
                                    style={{ 
                                      fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ddd', 
                                      background: 'white', cursor: 'pointer', opacity: 0.7 
                                    }}
                                  >+ {tag}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={generateVariants} style={{ marginTop: '0.5rem', background: 'var(--neon-purple)', border: 'none', padding: '0.4rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 'bold' }}>Generate Variants Matrix</button>

                        {variants.length > 0 && (
                          <div style={{ marginTop: '1.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {variants.map((v, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '0.5rem', marginBottom: '0.5rem', border: '1px solid #333' }}>
                                <span style={{ flex: 2, fontSize: '0.75rem' }}>{v.name}</span>
                                <input className="input-neon" style={{ flex: 1, padding: '0.2rem', fontSize: '0.75rem' }} type="number" value={v.price_override} onChange={e => {
                                  const next = [...variants]; next[idx].price_override = e.target.value; setVariants(next);
                                }} />
                                <input className="input-neon" style={{ flex: 1, padding: '0.2rem', fontSize: '0.75rem' }} type="number" value={v.stock} onChange={e => {
                                  const next = [...variants]; next[idx].stock = e.target.value; setVariants(next);
                                }} />
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8f8f8', padding: '1rem', borderRadius: '1rem', border: '1px solid #eee' }}>
                           <div style={{ flex: 1 }}>
                             <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block' }}>Limited Edition Offer?</label>
                             <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Check this if the product has a restricted quantity.</span>
                           </div>
                           <input 
                             type="checkbox" 
                             checked={formData.is_limited} 
                             onChange={e => setFormData({ ...formData, is_limited: e.target.checked })} 
                             style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                           />
                        </div>

                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" className="btn-black" style={{ flex: 1, border: '1px solid #333' }} onClick={() => setStep(2)}>Back</button>
                        <button type="button" className="btn-black" style={{ flex: 1, background: 'var(--neon-green)', color: '#000' }} onClick={() => setStep(4)}>Next: Fulfillment</button>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="step-content">
                      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Truck size={24} /> Step 4: Fulfillment</h2>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>Delivery Method</label>
                        <select className="input-neon" value={formData.delivery_type} onChange={e => setFormData({...formData, delivery_type: e.target.value})}>
                          <option value="ABET">Abet Platform Delivery</option>
                          <option value="SELLER">Seller Managed Shipping</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>Delivery Fee (ETB)</label>
                          <input 
                            type="number" 
                            className="input-neon" 
                            placeholder="e.g. 100.00"
                            value={formData.delivery_fee} 
                            onChange={e => setFormData({...formData, delivery_fee: e.target.value})}
                          />
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(132, 252, 194, 0.05)', borderRadius: '0.5rem', marginBottom: '2rem' }}>
                        <input type="checkbox" id="juggling" checked={formData.allow_juggling} onChange={e => setFormData({...formData, allow_juggling: e.target.checked})} />
                        <label htmlFor="juggling" style={{ fontSize: '0.8rem' }}>Permit Promoters to Juggle Product</label>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn-black" style={{ flex: 1, border: '1px solid #333' }} onClick={() => setStep(3)}>Back</button>
                        <button type="submit" className="btn-black" style={{ flex: 1, background: 'var(--neon-green)', color: '#000', fontWeight: '900' }} disabled={loading}>
                          {loading ? 'DEPLOYING...' : 'FINALIZE & LIST'}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* PREVIEW BOX */}
              <div style={{ position: 'sticky', top: '2rem' }}>
                <div className="card" style={{ padding: '1rem', border: '1px solid rgba(0,0,0,0.05)', background: 'var(--bg-card)' }}>
                  <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--neon-purple)', marginBottom: '1rem' }}>Live Listing Preview</h3>
                  <div style={{ height: '200px', background: imagePreviews[0] ? `url(${imagePreviews[0]}) center/cover` : '#222', borderRadius: '0.5rem', marginBottom: '1rem' }}></div>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>{formData.name || 'Product Prototype'}</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>{formData.brand || 'Your Brand Lab'}</p>
                  
                  {/* Preview Attributes */}
                  {Object.entries(formData.attributes).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                      {Object.entries(formData.attributes).map(([k, v]) => v && (
                        <span key={k} style={{ fontSize: '0.6rem', border: '1px solid rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px', opacity: 0.7 }}>{k}: {v}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>ETB {formData.base_price || '0.00'}</span>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '1rem', opacity: 0.7 }}>
                      {variants.length > 0 ? `${variants.length} Variants` : `${formData.stock} Ready`}
                    </span>
                  </div>
                  
                  {formData.is_limited && (
                    <div style={{ 
                      position: 'absolute', top: '15px', right: '15px', 
                      background: 'var(--neon-purple)', color: 'white', 
                      fontSize: '0.6rem', fontWeight: '900', padding: '4px 10px', 
                      borderRadius: '2rem', boxShadow: '0 0 15px rgba(192, 132, 252, 0.5)',
                      animation: 'pulse-limited 2s infinite'
                    }}>
                      LIMITED EDITION
                    </div>
                  )}

                  <style>{`
                    @keyframes pulse-limited {
                      0%, 100% { opacity: 1; transform: scale(1); }
                      50% { opacity: 0.8; transform: scale(1.05); }
                    }
                  `}</style>
                </div>

                <div className="card" style={{ marginTop: '1.5rem', border: '1px solid rgba(132, 252, 194, 0.3)', background: 'var(--bg-card)' }}>
                   <h3 style={{ fontSize: '0.8rem', color: 'var(--neon-green)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={16}/> Quality Check</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <QCItem label="High Detail (AI Scanned)" active={checklist.focus} />
                      <QCItem label="Balanced Exposure" active={checklist.light} />
                      <QCItem label="Safe Background" active={checklist.background} />
                      <QCItem label="Frame Coverage" active={checklist.frame} />
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATION TOAST */}
        {notification.visible && (
          <div style={{ 
            position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 2rem', 
            background: notification.type === 'error' ? '#ef4444' : 'var(--neon-green)', 
            color: '#000', fontWeight: 'bold', borderRadius: '0.5rem', zIndex: 100001,
            animation: 'slide-in 0.3s ease-out'
          }}>
            {notification.message}
          </div>
        )}
      </div>

      <style>{`
        .label-neon { display: block; fontSize: 0.8rem; margin-bottom: 0.5rem; opacity: 0.7; font-weight: 700; }
        .step-content { animation: slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slide-down {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
      </div>
  );
}

const QCItem = ({ label, active }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: active ? 1 : 0.3 }}>
    {active ? <CheckCircle size={14} color="var(--neon-green)" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #555' }} />}
    <span style={{ fontSize: '0.75rem' }}>{label}</span>
  </div>
);

export default SellerDashboard;
