import React, { useState, useEffect, useRef } from 'react';
import './ButchChatBubble.css';
import { getApiBaseUrl } from '../../lib/backend';

const API_BASE = `${getApiBaseUrl()}/butch`;

// Minimal fallback so the UI doesn't crash if config fetch fails
const defaultButchConfig = {
    name: 'Butch the Butcher',
    title: 'The Butcher',
    avatar: '/ShilohRidgeFarmicon256.png',
    greeting: "Hey there! I'm Butch — ask me about cuts, orders, and pricing.",
    voice_endpoint: `${API_BASE}/speak`,
    suggested_prompts: ["Tell me about cuts", "How much freezer space?", "I want a half hog"]
};
export default function ButchChatBubble({ open, onOpenChange, inline = false }) {
    const [isOpen, setIsOpen] = useState(() => (typeof open === 'boolean' ? open : true));
    const [messages, setMessages] = useState([{ role: 'butch', content: defaultButchConfig.greeting, audioUrl: `${defaultButchConfig.voice_endpoint}?text=${encodeURIComponent(defaultButchConfig.greeting)}` }]);
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [config, setConfig] = useState(defaultButchConfig);
    const [suggestions, setSuggestions] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(() => {
        try { return localStorage.getItem('butch_voice_enabled') !== 'false'; } catch { return true; }
    });

    const audioRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => { fetchConfig(); }, []);
    // Sync controlled open prop when provided
    useEffect(() => {
        if (typeof open === 'boolean') setIsOpen(open);
    }, [open]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_BASE}/config`);
            if (!res.ok) throw new Error('Config fetch failed: ' + res.status);
            const data = await res.json();
            setConfig(data);
            setMessages([{
                role: 'butch',
                content: data.greeting,
                audioUrl: `${data.voice_endpoint}?text=${encodeURIComponent(data.greeting)}`
            }]);
            setSuggestions(data.suggested_prompts || data.suggestedPrompts || []);
        } catch (err) {
            console.error('Failed to load Butch config:', err);
            // Use a safe default so the admin UI and site don't render blank
            setConfig(defaultButchConfig);
            setMessages([{
                role: 'butch',
                content: defaultButchConfig.greeting,
                audioUrl: `${defaultButchConfig.voice_endpoint}?text=${encodeURIComponent(defaultButchConfig.greeting)}`
            }]);
            setSuggestions(defaultButchConfig.suggested_prompts || []);
        }
    };

    const sendMessage = async (text) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setInput('');
        setIsTyping(true);
        setSuggestions([]);

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: text })
            });
            const data = await res.json();
            setSessionId(data.session_id);
            setMessages(prev => [...prev, { role: 'butch', content: data.butch_reply, audioUrl: data.audio_url }]);
            setSuggestions(data.suggestions || []);
            // If backend returned an audio URL, play it; otherwise request TTS if voice enabled
            if (data.audio_url) {
                if (voiceEnabled) playAudio(data.audio_url);
            } else {
                if (voiceEnabled) requestAndPlay(data.butch_reply);
            }
        } catch (err) {
            console.error('Chat error:', err);
        } finally {
            setIsTyping(false);
        }
    };

    const playAudio = (url) => {
        if (audioRef.current) { audioRef.current.pause(); }
        audioRef.current = new Audio(url);
        audioRef.current.play().catch(() => { });
    };

    const requestAndPlay = async (text) => {
        try {
            const resp = await fetch(`${API_BASE}/speak?text=${encodeURIComponent(text)}`);
            if (!resp.ok) return;
            const data = await resp.json();
            if (data && data.audio_url) playAudio(data.audio_url);
        } catch (e) {
            console.error('Butch speak error:', e);
        }
    };

    const handleSuggestionClick = (suggestion) => { sendMessage(suggestion); };

    const setOpen = (val) => {
        setIsOpen(val);
        try { onOpenChange && onOpenChange(val); } catch (e) { /* ignore */ }
    };
    const containerClass = inline ? 'butch-chat-inline' : 'butch-chat-container';

    return (
        <div className={containerClass}>

            {isOpen && (
                <div className="butch-chat-window outlined">
                    <div className="butch-header">
                        <img src={config.avatar} alt="" className="butch-header-avatar" />
                        <div className="butch-header-info">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                {config.name || 'Butch the Butcher'}
                                <button className="ml-2 px-2 py-0.5 bg-white/20 text-white text-xs rounded" onClick={() => { const v = !voiceEnabled; setVoiceEnabled(v); try { localStorage.setItem('butch_voice_enabled', v ? 'true' : 'false'); } catch { } }}>
                                    {voiceEnabled ? 'Voice: On' : 'Voice: Off'}
                                </button>
                            </h3>
                            <span className="text-amber-100 text-sm">{config.title}</span>
                        </div>
                        <button className="close-btn" onClick={() => setOpen(false)}>×</button>
                    </div>

                    <div className="butch-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message ${msg.role}`}>
                                {msg.role === 'butch' && <img src={config.avatar} alt="" className="message-avatar" />}
                                <div className="message-content">
                                    <p>{msg.content}</p>
                                    {msg.audioUrl && (
                                        <button className="play-voice-btn" onClick={() => playAudio(msg.audioUrl)}>Hear Butch</button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="message butch typing">
                                <div className="typing-indicator"><span></span><span></span><span></span></div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {suggestions.length > 0 && (
                        <div className="butch-suggestions">
                            {suggestions.map((sugg, idx) => (
                                <button key={idx} className="suggestion-chip" onClick={() => handleSuggestionClick(sugg)}>{sugg}</button>
                            ))}
                        </div>
                    )}

                    <div className="butch-input-area">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)} placeholder="Ask Butch about your order..." className="butch-input" />
                        <button className="send-btn" onClick={() => sendMessage(input)} disabled={!input.trim()}>Send</button>
                    </div>
                </div>
            )}
        </div>
    );
}
