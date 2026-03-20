import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Brain,
  ChevronRight,
  Lightbulb,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X
} from 'lucide-react';
import { getApiBaseUrl } from '../../lib/backend';

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

  useEffect(() => {
    const generatedSessionId = `worker_${Math.random().toString(36).slice(2, 11)}`;
    setSessionId(generatedSessionId);
    setMessages([
      {
        role: 'assistant',
        content:
          userType === 'visitor'
            ? 'Welcome to Shiloh Ridge Farm. I can help with livestock, products, and ordering questions.'
            : 'Assistant ready. Ask me a question and I will try to help.'
      }
    ]);
  }, [userType]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (overrideMessage = null) => {
    const messageToSend = (overrideMessage || inputMessage).trim();
    if (!messageToSend || isLoading) {
      return;
    }

    if (!overrideMessage) {
      setInputMessage('');
    }

    setIsLoading(true);
    setShowFeedback(null);
    setMessages((previous) => [
      ...previous,
      { role: 'user', content: messageToSend, timestamp: new Date().toISOString() }
    ]);

    try {
      const response = await axios.post(`${apiBaseUrl}/worker-chat/message`, {
        message: messageToSend,
        order_text: messageToSend,
        session_id: sessionId,
        page_context: pageContext,
        user_type: userType
      });

      const data = response.data;
      if (data.learning_id) {
        setIsLearning(true);
        setTimeout(() => setIsLearning(false), 2500);
      }

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: data.response,
          suggestions: data.suggestions || [],
          learning_id: data.learning_id || null
        }
      ]);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Worker chat error:', error);
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: 'I am having trouble connecting right now. Please try again soon.',
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (helpful) => {
    try {
      await axios.post(
        `${apiBaseUrl}/worker-chat/feedback?session_id=${encodeURIComponent(sessionId)}&helpful=${helpful}`
      );
      setShowFeedback(true);
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  return (
    <div className="fixed bottom-10 right-14 z-50 font-sans">
      {isLearning && (
        <div className="absolute -top-12 right-0 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <Sparkles className="h-4 w-4" />
          Learning from this conversation...
        </div>
      )}

      {isOpen && (
        <div
          className="mb-4 flex h-[715px] w-[31.2rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-800 to-teal-700 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Shep</h3>
                <p className="flex items-center gap-1 text-xs text-emerald-100">
                  <Lightbulb className="h-3 w-3" />
                  Learning farm assistant
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[85%] gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      message.role === 'user' ? 'bg-emerald-800' : 'bg-amber-500'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <span className="text-xs font-bold text-white">You</span>
                    ) : (
                      <Brain className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-emerald-600 text-white'
                        : message.isError
                          ? 'rounded-bl-md bg-red-100 text-red-800'
                          : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="mb-1 text-xs font-semibold text-slate-500">Shep</div>
                    )}
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    {message.learning_id && (
                      <div className="mt-2 flex items-center gap-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        <Sparkles className="h-3 w-3" />
                        Learning opportunity noted
                      </div>
                    )}
                    {message.role === 'assistant' && !message.isError && index > 0 && (
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-2">
                        <span className="text-xs text-slate-500">Helpful?</span>
                        {showFeedback ? (
                          <span className="text-xs font-medium text-emerald-600">Thanks for the feedback.</span>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleFeedback(true)}
                              className="rounded p-1 transition-colors hover:bg-slate-100"
                              title="Helpful"
                            >
                              <ThumbsUp className="h-3 w-3 text-slate-400 hover:text-emerald-500" />
                            </button>
                            <button
                              onClick={() => handleFeedback(false)}
                              className="rounded p-1 transition-colors hover:bg-slate-100"
                              title="Not helpful"
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {suggestions.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-100 px-4 py-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    className="flex whitespace-nowrap items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
                  >
                    {suggestion}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about the farm, products, or ordering..."
                className="flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !inputMessage.trim()}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-800 text-white shadow-md transition-colors hover:bg-emerald-900 disabled:bg-slate-300"
              >
                <Send className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              I learn from repeated requests and help surface gaps for improvement.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-20 w-20 items-center justify-center rounded-full shadow-2xl transition-all duration-300 ${
          isOpen
            ? 'rotate-90 scale-90 bg-slate-700 hover:bg-slate-800'
            : 'bg-gradient-to-r from-emerald-800 to-teal-700 hover:scale-110 hover:from-emerald-900 hover:to-teal-800'
        }`}
      >
        {isOpen ? (
          <X className="h-8 w-8 text-white" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-8 w-8 text-white" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-emerald-800 bg-amber-500" />
          </div>
        )}
      </button>
    </div>
  );
};

export default WorkerChatBubble;
