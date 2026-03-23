import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Check, X, FileText, Image as ImageIcon, Phone, User, Briefcase, ExternalLink, Activity } from 'lucide-react';
import Navbar from './Navbar';

const API_BASE = 'http://localhost:8000/api';

function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users/pending_sellers/`, { withCredentials: true });
      setApplications(res.data);
    } catch (err) {
      showNotification("Failed to fetch applications. Admin access required.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (userId, action) => {
    try {
      await axios.post(`${API_BASE}/users/${userId}/review_seller/`, { action }, { withCredentials: true });
      showNotification(`Seller ${action === 'approve' ? 'Approved' : 'Rejected'} successfully!`, "success");
      setApplications(applications.filter(app => app.id !== userId));
    } catch (err) {
      showNotification("Action failed. Try again.", "error");
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => setNotification({ ...notification, visible: false }), 4000);
  };

  return (
    <div className="juggler-hub">
      <Navbar />
      
      <div className="hub-container" style={{ paddingTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(192, 132, 252, 0.1)', borderRadius: '1rem', color: 'var(--neon-purple)' }}>
            <Shield size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0' }}>Admin Control</h1>
            <p className="text-muted">Reviewing seller credibility applications for Ethiopian registration</p>
          </div>
        </div>

        {notification.visible && (
          <div className={`notification-toast ${notification.type}`}>
            {notification.type === 'success' ? <Check size={20} /> : <X size={20} />}
            {notification.message}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}>
             <Activity className="timer-neon" size={48} />
             <p style={{ marginTop: '1rem' }}>Sourcing applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="hub-card" style={{ textAlign: 'center', padding: '4rem' }}>
             <Check size={64} color="var(--neon-green)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
             <h3>All caught up!</h3>
             <p className="text-muted">No pending seller applications at the moment.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {applications.map(app => (
              <div key={app.id} className="hub-card" style={{ display: 'grid', gridTemplateColumns: '1.5fr 3fr 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* User Info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0 }}>@{app.username}</h4>
                      <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{app.email}</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={16} /> <strong>{app.business_name}</strong></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> {app.seller_full_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={16} /> {app.seller_phone}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> TIN: {app.tin_number}</div>
                  </div>
                </div>

                {/* Documents Preview Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                   {[
                     { label: 'License', key: 'business_license' },
                     { label: 'Gov ID', key: 'id_proof' },
                     { label: 'Bank Proof', key: 'bank_details_proof' },
                     { label: 'Address', key: 'address_proof' },
                     { label: 'VAT', key: 'vat_registration' },
                     { label: 'Import', key: 'import_license' }
                   ].filter(doc => app[doc.key]).map(doc => (
                     <div key={doc.key} className="file-upload-zone" style={{ minHeight: '100px', cursor: 'pointer', padding: '0.5rem' }} onClick={() => setSelectedDoc(app[doc.key])}>
                        <ImageIcon size={20} style={{ opacity: 0.5, marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '0.6rem' }}>{doc.label}</span>
                        <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '2px' }}>
                           <ExternalLink size={10} color="white" />
                        </div>
                     </div>
                   ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <button className="hub-btn hub-btn-neon" style={{ background: 'rgba(52, 211, 153, 0.1)', borderColor: 'var(--neon-green)', color: 'var(--neon-green)' }} onClick={() => handleReview(app.id, 'approve')}>
                     <Check size={18} /> Approve
                  </button>
                  <button className="hub-btn" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleReview(app.id, 'reject')}>
                     <X size={18} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setSelectedDoc(null)}>
           <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
              <img src={selectedDoc.startsWith('http') ? selectedDoc : `http://localhost:8000${selectedDoc}`} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '100%', border: '2px solid white', borderRadius: '0.5rem' }} />
              <div style={{ position: 'absolute', top: '-40px', right: 0, color: 'white', cursor: 'pointer' }}>
                <X size={32} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
