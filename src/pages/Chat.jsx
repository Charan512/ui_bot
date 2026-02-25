import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Brain, ShieldAlert } from 'lucide-react';

const SUGGESTIONS = [
    "I've been feeling really anxious lately",
    "I need someone to talk to",
    "Help me calm down",
];

export default function Chat() {
    const { user, logout, authFetch } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState('default');
    const messagesEnd = useRef(null);

    useEffect(() => {
        loadSessions();
        loadSessionHistory('default');
    }, []);

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const loadSessions = async () => {
        try {
            const res = await authFetch('/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch { }
    };

    const loadSessionHistory = async (sessionId) => {
        setCurrentSessionId(sessionId);
        setLoading(true);
        try {
            const res = await authFetch(`/history/${sessionId}?limit=50`);
            if (res.ok) {
                const data = await res.json();
                const formatted = [];
                // Data comes back in DESC order (latest first), so we reverse to display chronically
                data.reverse().forEach(record => {
                    formatted.push({ role: 'user', text: record.user_msg });
                    formatted.push({
                        role: 'bot',
                        text: record.bot_msg,
                        meta: { risk: record.risk, sentiment: record.sentiment }
                    });
                });
                setMessages(formatted);
            }
        } catch { }
        setLoading(false);
    };

    const startNewChat = () => {
        setCurrentSessionId(Date.now().toString());
        setMessages([]);
    };

    const sendMessage = async (e, overrideText) => {
        if (e) e.preventDefault();
        const userText = (overrideText || input).trim();
        if (!userText || loading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setLoading(true);

        try {
            const res = await authFetch('/chat', {
                method: 'POST',
                body: JSON.stringify({ text: userText, session_id: currentSessionId }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'bot', text: data.response, meta: data }]);

                // Refresh sessions silently in background so sidebar updates if this was first message
                if (messages.length === 0) {
                    loadSessions();
                }
            } else {
                const err = await res.json();
                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: err.detail || 'Something went wrong. Please try again.',
                    meta: null,
                }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'bot',
                text: 'Connection error. Please check if the backend is running.',
                meta: null,
            }]);
        }

        setLoading(false);
    };

    const handleChip = (text) => {
        sendMessage(null, text);
    };

    return (
        <div className="chat-layout">
            {/* ── Sidebar ── */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <div className="sidebar-brand-icon">
                            <Brain size={16} color="#fff" />
                        </div>
                        <h2>Soul Connect</h2>
                    </div>
                    <p>Your safe space</p>
                </div>

                <div className="sidebar-section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={startNewChat}>
                    <span>Past Chats</span>
                    <span style={{ fontSize: '18px', color: 'var(--blue)' }}>+</span>
                </div>

                <div className="sidebar-history">
                    {sessions.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 12px', textAlign: 'center' }}>
                            No conversations yet
                        </p>
                    )}
                    {sessions.map((s) => (
                        <div
                            className={`history-item ${currentSessionId === s.session_id ? 'active' : ''}`}
                            key={s.session_id}
                            onClick={() => loadSessionHistory(s.session_id)}
                            style={currentSessionId === s.session_id ? { background: 'var(--blue-soft)', borderColor: 'var(--blue-light)', fontWeight: '500' } : {}}
                        >
                            <span className="risk-dot risk-low"></span>
                            {s.title}
                        </div>
                    ))}
                </div>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="user-name">{user?.username || 'User'}</span>
                    </div>
                    <button className="btn-logout" onClick={logout}>Sign Out</button>
                </div>
            </div>

            {/* ── Chat Area ── */}
            <div className="chat-area">

                {/* Header bar */}
                <div className="chat-header">
                    <div className="chat-header-icon">
                        <Brain size={18} color="#fff" />
                    </div>
                    <div className="chat-header-text">
                        <h2>Soul Connect</h2>
                        <p>AI Mental Health Companion</p>
                    </div>
                    <div className="status-dot" title="Online" />
                </div>

                {/* Messages */}
                <div className="chat-messages">
                    {messages.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <Brain size={28} color="var(--violet-light)" />
                            </div>
                            <h3>How are you feeling today?</h3>
                            <p>
                                Share what's on your mind. I'm here to listen, support,
                                and offer gentle guidance — everything is private.
                            </p>
                            <div className="suggestion-chips">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s}
                                        className="chip"
                                        onClick={() => handleChip(s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <React.Fragment key={i}>
                            <div className={`message-row ${msg.role}`}>
                                {msg.role === 'bot' && (
                                    <div className="bot-avatar">
                                        <Brain size={13} color="#fff" />
                                    </div>
                                )}
                                <div className="message-bubble">
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                </div>
                            </div>

                            {msg.role === 'bot' && msg.meta?.emergency_contact && (
                                <div className="emergency-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShieldAlert size={16} />
                                    <span>Emergency alert triggered — contact notified: <strong>{msg.meta.emergency_contact}</strong></span>
                                </div>
                            )}
                        </React.Fragment>
                    ))}

                    {loading && (
                        <div className="message-row bot">
                            <div className="bot-avatar">
                                <Brain size={13} color="#fff" />
                            </div>
                            <div className="message-bubble">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEnd} />
                </div>

                {/* Input */}
                <div className="chat-input-area">
                    <form className="chat-input-wrapper" onSubmit={sendMessage}>
                        <input
                            type="text"
                            placeholder="Share what's on your mind..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        <button type="submit" className="btn-send" disabled={loading || !input.trim()}>
                            ↑
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
