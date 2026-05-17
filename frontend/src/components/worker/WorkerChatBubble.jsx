import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  ChevronRight,
  Loader2,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X
} from 'lucide-react';
import { getApiBaseUrl } from '../../lib/backend';

/* Simple sheep SVG — keeps the farm character without a dependency */
const SheepAvatar = React.memo(function SheepAvatar({ size = 28, white = false }) { return (
  <svg
    viewBox="0 0 36 36"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* woolly body */}
    <circle cx="11" cy="14" r="5" fill={white ? '#fff' : '#d1fae5'} opacity="0.85" />
    <circle cx="25" cy="14" r="5" fill={white ? '#fff' : '#d1fae5'} opacity="0.85" />
    <circle cx="18" cy="11" r="5" fill={white ? '#fff' : '#d1fae5'} opacity="0.85" />
    <ellipse cx="18" cy="17" rx="8" ry="6" fill={white ? '#fff' : '#d1fae5'} />
    {/* face */}
    <ellipse cx="18" cy="20" rx="5" ry="4" fill={white ? '#f5f0eb' : '#a16207'} />
    {/* eyes */}
    <circle cx="16" cy="19" r="0.8" fill={white ? '#0f5132' : '#1a1a1a'} />
    <circle cx="20" cy="19" r="0.8" fill={white ? '#0f5132' : '#1a1a1a'} />
    {/* nose */}
    <path d="M17 21.5 Q18 22.5 19 21.5" stroke={white ? '#0f5132' : '#78350f'} strokeWidth="0.8" strokeLinecap="round" fill="none" />
    {/* legs */}
    <line x1="13" y1="23" x2="12" y2="29" stroke={white ? '#f5f0eb' : '#a16207'} strokeWidth="2" strokeLinecap="round" />
    <line x1="15" y1="24" x2="15" y2="30" stroke={white ? '#f5f0eb' : '#a16207'} strokeWidth="2" strokeLinecap="round" />
    <line x1="21" y1="24" x2="21" y2="30" stroke={white ? '#f5f0eb' : '#a16207'} strokeWidth="2" strokeLinecap="round" />
    <line x1="23" y1="23" x2="24" y2="29" stroke={white ? '#f5f0eb' : '#a16207'} strokeWidth="2" strokeLinecap="round" />
  </svg>
); });

const WorkerChatBubble = ({ pageContext = 'general', userType = 'visitor' }) => {
  const apiBaseUrl = getApiBaseUrl();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [showFeedback, setShowFeedback] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLearning, setIsLearning] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const generatedSessionId = `worker_${Math.random().toString(36).slice(2, 11)}`;
    setSessionId(generatedSessionId);
    setMessages([
      {
        role: 'assistant',
        content:
          userType === 'visitor'
            ? "Hey there! I'm CALI — Shiloh Ridge Farm's assistant. Ask me anything about our livestock, products, or how to order."
            : 'Assistant ready. Ask me a question and I will try to help.',
      },
    ]);
  }, [userType]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (overrideMessage = null) => {
    const messageToSend = (overrideMessage || inputMessage).trim();
    if (!messageToSend || isLoading) return;
    if (!overrideMessage) setInputMessage('');

    setIsLoading(true);
    setShowFeedback(null);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: messageToSend, timestamp: new Date().toISOString() },
    ]);

    try {
      const response = await axios.post(`${apiBaseUrl}/worker-chat/message`, {
        message: messageToSend,
        order_text: messageToSend,
        session_id: sessionId,
        page_context: pageContext,
        user_type: userType,
      });

      const data = response.data;
      if (data.learning_id) {
        setIsLearning(true);
        setTimeout(() => setIsLearning(false), 2500);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          suggestions: data.suggestions || [],
          learning_id: data.learning_id || null,
        },
      ]);
      setSuggestions(data.suggestions || []);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again soon.",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const detectAnimal = (text) => {
    const t = (text || '').toLowerCase();
    if (/hog|pork|pig|bacon|ham/.test(t)) return 'hog';
    if (/lamb|sheep|rack|shank/.test(t)) return 'lamb';
    return 'general';
  };

  const handleButchHandoff = () => {
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    const lastUserMsg = userMessages[userMessages.length - 1]?.content || '';
    const lastShepMsg = assistantMessages[assistantMessages.length - 1]?.content || '';
    const handoffContext = {
      original_question: lastUserMsg,
      shep_answer: lastShepMsg,
      topic: 'butcher',
      animal: detectAnimal(lastUserMsg),
    };
    localStorage.setItem('shep_butch_handoff', JSON.stringify(handoffContext));
    window.dispatchEvent(new CustomEvent('shep-butch-handoff', { detail: handoffContext }));
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: 'Connecting you with Butch now — he already knows what we were talking about.',
        isHandoff: true,
      },
    ]);
  };

  const handleFeedback = async (helpful) => {
    try {
      await axios.post(
        `${apiBaseUrl}/worker-chat/feedback?session_id=${encodeURIComponent(sessionId)}&helpful=${helpful}`
      );
      setShowFeedback(true);
    } catch {
      /* silent */
    }
  };

  return (
    <>
      {/* Overlay for mobile — tap outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed bottom-5 right-4 z-50 font-sans sm:bottom-6 sm:right-6">
        {/* Learning toast */}
        {isLearning && (
          <div className="absolute -top-10 right-0 flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg whitespace-nowrap">
            <Sparkles className="h-3 w-3" />
            Learning…
          </div>
        )}

        {/* Chat window */}
        {isOpen && (
          <div className="
            mb-3
            flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl
            /* mobile: full width, anchored to bottom */
            fixed bottom-20 left-3 right-3
            h-[65vh] max-h-[520px]
            /* sm+: floating window */
            sm:static sm:left-auto sm:right-auto sm:bottom-auto
            sm:w-[360px] sm:h-[500px] sm:max-h-none
          ">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#0f5132] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                  <SheepAvatar size={28} white />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white leading-none">Shep Sheppard the Site Assistant</h3>
                  <p className="text-xs text-green-200 mt-0.5">Shiloh Ridge Farm</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-stone-50 px-3 py-3 space-y-3">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full self-end ${
                        message.role === 'user' ? 'bg-[#0f5132]' : 'bg-amber-100 border border-amber-200'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <span className="text-[10px] font-bold text-white">You</span>
                      ) : (
                        <SheepAvatar size={20} />
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'rounded-br-sm bg-[#0f5132] text-white'
                          : message.isError
                            ? 'rounded-bl-sm bg-red-50 text-red-700 border border-red-100'
                            : 'rounded-bl-sm bg-white text-slate-800 border border-stone-200 shadow-sm'
                      }`}
                    >
                      {message.content}
                      {message.learning_id && (
                        <div className="mt-1.5 flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                          <Sparkles className="h-3 w-3" />
                          Noted for learning
                        </div>
                      )}
                      {message.role === 'assistant' && !message.isError && index > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 border-t border-stone-100 pt-1.5">
                          <span className="text-xs text-slate-400">Helpful?</span>
                          {showFeedback ? (
                            <span className="text-xs text-green-600">Thanks!</span>
                          ) : (
                            <div className="flex gap-0.5">
                              <button
                                onClick={() => handleFeedback(true)}
                                className="rounded p-0.5 hover:bg-slate-100 transition-colors"
                              >
                                <ThumbsUp className="h-3 w-3 text-slate-400 hover:text-green-500" />
                              </button>
                              <button
                                onClick={() => handleFeedback(false)}
                                className="rounded p-0.5 hover:bg-slate-100 transition-colors"
                              >
                                <ThumbsDown className="h-3 w-3 text-slate-400 hover:text-red-500" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 border border-amber-200 self-end">
                      <SheepAvatar size={20} />
                    </div>
                    <div className="rounded-2xl rounded-bl-sm border border-stone-200 bg-white px-3 py-2 shadow-sm">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-xs">Thinking…</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="border-t border-stone-200 bg-stone-50 px-3 py-2">
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => (s === 'Bring in Butch' ? handleButchHandoff() : handleSend(s))}
                      className="flex shrink-0 items-center gap-1 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-[#0f5132] hover:text-[#0f5132] transition-colors"
                    >
                      {s}
                      <ChevronRight className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-stone-200 bg-white px-3 py-2.5">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
                  }}
                  placeholder="Ask Shep about the farm…"
                  className="flex-1 rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f5132]/40 focus:border-[#0f5132]"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !inputMessage.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f5132] text-white shadow transition-colors hover:bg-[#0a3c24] disabled:bg-slate-300"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAB trigger */}
        <button
          onClick={() => setIsOpen((o) => !o)}
          className={`flex items-center justify-center rounded-full shadow-xl transition-all duration-200 ${
            isOpen
              ? 'h-12 w-12 bg-slate-600 hover:bg-slate-700 rotate-90'
              : 'h-14 w-14 bg-[#0f5132] hover:bg-[#0a3c24] hover:scale-105'
          }`}
          aria-label={isOpen ? 'Close chat' : 'Chat with Shep'}
        >
          {isOpen ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <div className="relative flex items-center justify-center">
              <SheepAvatar size={30} white />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0f5132] bg-amber-400" />
            </div>
          )}
        </button>
      </div>
    </>
  );
};

export default WorkerChatBubble;
