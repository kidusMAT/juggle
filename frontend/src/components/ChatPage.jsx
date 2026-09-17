import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api';
import Navbar from './Navbar';
import { Send, ArrowLeft, MessageCircle, Search } from 'lucide-react';

export default function ChatPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations/');
      setConversations(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await api.get(`/conversations/${conversationId}/messages/`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const res = await api.post(`/conversations/${selectedConversation.id}/send_message/`, {
        content: newMessage.trim()
      });
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');

      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id 
          ? { ...c, last_message: { content: newMessage.trim(), sender_name: 'You', created_at: new Date().toISOString() } }
          : c
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversations = conversations.filter(c => 
    c.other_user?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <Navbar />
      
      <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1000px' }}>
        <div style={{ display: 'flex', height: '70vh', background: 'var(--bg-card)', borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
          
          {/* Conversations List */}
          <div style={{ 
            width: selectedConversation ? '300px' : '100%',
            borderRight: selectedConversation ? '1px solid #eee' : 'none',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>
                <MessageCircle size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                Messages
              </h2>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #eee',
                    background: '#f9f9f9',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading...</div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                  No conversations yet
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    style={{
                      padding: '1rem 1.5rem',
                      borderBottom: '1px solid #f5f5f5',
                      cursor: 'pointer',
                      background: selectedConversation?.id === conv.id ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                      borderLeft: selectedConversation?.id === conv.id ? '3px solid var(--neon-green)' : '3px solid transparent',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '45px',
                        height: '45px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #22c55e, #a855f7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '1rem'
                      }}>
                        {conv.other_user?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600' }}>{conv.other_user?.username || 'Unknown'}</span>
                          <span style={{ fontSize: '0.7rem', color: '#999' }}>
                            {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: '#666',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {conv.last_message?.content || 'No messages yet'}
                        </div>
                        {conv.product_name && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--neon-green)', marginTop: '2px' }}>
                            Re: {conv.product_name}
                          </div>
                        )}
                      </div>
                      {conv.unread_count > 0 && (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'var(--neon-green)',
                          color: '#000',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {conv.unread_count}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedConversation ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Chat Header */}
              <div style={{ 
                padding: '1rem 1.5rem', 
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <button
                  onClick={() => setSelectedConversation(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                >
                  <ArrowLeft size={20} />
                </button>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22c55e, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: '700'
                }}>
                  {selectedConversation.other_user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: '600' }}>{selectedConversation.other_user?.username}</div>
                  {selectedConversation.product_name && (
                    <div style={{ fontSize: '0.75rem', color: '#999' }}>Re: {selectedConversation.product_name}</div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.sender_name === 'You' || msg.sender_name === selectedConversation.other_user?.username ? (msg.sender_name === 'You' ? 'flex-end' : 'flex-start') : 'flex-start',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      padding: '0.75rem 1rem',
                      borderRadius: '1rem',
                      background: msg.sender_name === 'You' ? 'var(--neon-green)' : '#f0f0f0',
                      color: msg.sender_name === 'You' ? '#000' : '#333',
                      borderBottomRightRadius: msg.sender_name === 'You' ? '0.25rem' : '1rem',
                      borderBottomLeftRadius: msg.sender_name === 'You' ? '1rem' : '0.25rem'
                    }}>
                      <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{msg.content}</div>
                      <div style={{ 
                        fontSize: '0.65rem', 
                        color: msg.sender_name === 'You' ? 'rgba(0,0,0,0.5)' : '#999',
                        marginTop: '0.25rem',
                        textAlign: 'right'
                      }}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div style={{ 
                padding: '1rem 1.5rem', 
                borderTop: '1px solid #eee',
                display: 'flex',
                gap: '0.75rem'
              }}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '2rem',
                    border: '1px solid #eee',
                    background: '#f9f9f9',
                    fontSize: '0.9rem'
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    background: newMessage.trim() ? 'var(--neon-green)' : '#ddd',
                    border: 'none',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: newMessage.trim() ? '#000' : '#999',
                    transition: 'all 0.2s'
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#999'
            }}>
              <MessageCircle size={64} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '1.1rem' }}>Select a conversation</p>
              <p style={{ fontSize: '0.85rem' }}>Choose from your existing conversations or start a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
