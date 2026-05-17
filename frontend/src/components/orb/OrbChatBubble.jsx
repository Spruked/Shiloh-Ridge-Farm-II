import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Brain, Sparkles } from 'lucide-react';
import axios from 'axios';

const OrbChatBubble = ({ pageContext = 'general' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [showThinking, setShowThinking] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const sid = 'orb_' + Math.random().toString(36).substr(2, 9);
        setSessionId(sid);
        setMessages([
            {
                role: 'assistant',
                content: "Welcome to Shiloh Ridge Farm! I'm your Orb Assistant. How can I help you with our Katahdin sheep today?",
                intent: 'greeting',
                confidence: 1.0
            }
        ]);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMsg = inputMessage.trim();
        setInputMessage('');
        setIsLoading(true);
        setShowThinking(true);

        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

        try {
            const response = await axios.post('/api/orb/chat', {
                message: userMsg,
                session_id: sessionId,
                page_context: pageContext
            });

            setShowThinking(false);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.response,
                intent: response.data.intent,
                confidence: response.data.confidence,
                suggestions: response.data.page_suggestions,
                learningHash: response.data.learning_hash
            }]);

        } catch (error) {
            setShowThinking(false);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again or contact us directly!",
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const navigateToPage = (path) => {
        window.location.href = path;
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {isOpen && (
                <div className="mb-4 w-96 h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-sm">Orb Assistant</h3>
                                <p className="text-emerald-100 text-xs">Shiloh Ridge Farm</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user'
                                        ? 'bg-emerald-600 text-white rounded-br-md'
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-md shadow-sm'
                                    }`}>
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    {msg.learningHash && (
                                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            Learning opportunity recorded
                                        </div>
                                    )}
                                    {msg.suggestions && msg.suggestions.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {msg.suggestions.map((suggestion, i) => (
                                                <button key={i} onClick={() => navigateToPage(suggestion)} className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                                                    Visit {suggestion.replace('/', '')}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {showThinking && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-xs">Orb is thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex gap-2">
                            <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask about our Katahdin sheep..." className="flex-1 px-4 py-2 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                            <button onClick={handleSend} disabled={isLoading || !inputMessage.trim()} className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 rounded-full flex items-center justify-center text-white transition-colors"><Send className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-center">Powered by Shiloh Ridge Farm Orb Assistant</p>
                    </div>
                </div>
            )}

            <button onClick={() => setIsOpen(!isOpen)} className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-slate-700 hover:bg-slate-800 rotate-90' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 hover:scale-110'
                }`}>
                {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
            </button>
        </div>
    );
};

export default OrbChatBubble;
