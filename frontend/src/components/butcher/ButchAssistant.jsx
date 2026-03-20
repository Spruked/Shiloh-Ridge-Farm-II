import React, { useEffect, useRef, useState } from 'react';
import { History, MessageCircle, Send, Tag, User, Volume2, X } from 'lucide-react';

import { Button } from '../ui/buttons';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';


const BUTCH_CUSTOMER_KEY = 'butch_customer_id';
const BUTCH_CONTEXT_KEY = 'butch_customer_context';
const SHILOH_PROFILE_KEY = 'shiloh_butch_profile';


const getStoredJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    return {};
  }
};

const ButchAssistant = ({ onProfileUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerContext, setCustomerContext] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loyaltyTier, setLoyaltyTier] = useState('new');
  const [currentAudio, setCurrentAudio] = useState(null);
  const [voiceMode, setVoiceMode] = useState('browser');
  const messagesEndRef = useRef(null);

  const apiBaseUrl = `${process.env.REACT_APP_BACKEND_URL}/api`;

  const persistContext = (nextContext) => {
    const mergedProfile = {
      ...(getStoredJson(SHILOH_PROFILE_KEY) || {}),
      ...nextContext,
    };
    localStorage.setItem(BUTCH_CONTEXT_KEY, JSON.stringify(mergedProfile));
    localStorage.setItem(SHILOH_PROFILE_KEY, JSON.stringify(mergedProfile));
    setCustomerContext(mergedProfile);
    if (onProfileUpdate) {
      onProfileUpdate(mergedProfile);
    }
  };

  useEffect(() => {
    let cid = localStorage.getItem(BUTCH_CUSTOMER_KEY);
    if (!cid) {
      cid = `butch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(BUTCH_CUSTOMER_KEY, cid);
    }
    setCustomerId(cid);

    const storedContext = getStoredJson(BUTCH_CONTEXT_KEY);
    const shilohProfile = getStoredJson(SHILOH_PROFILE_KEY);
    const merged = {
      ...storedContext,
      ...shilohProfile,
    };
    setCustomerContext(merged);
    localStorage.setItem(BUTCH_CONTEXT_KEY, JSON.stringify(merged));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => {
    if (currentAudio) {
      currentAudio.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [currentAudio]);

  const speakWithBrowser = (text, acpSettings = {}) => {
    if (!window.speechSynthesis || !text) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = acpSettings.voice_speed || 1;
    utterance.pitch = acpSettings.voice_warmth ? Math.min(1.5, 0.9 + (acpSettings.voice_warmth * 0.4)) : 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  const playMessageVoice = (message) => {
    if (currentAudio) {
      currentAudio.pause();
    }

    if (message.audioUrl) {
        const audio = new Audio(`${process.env.REACT_APP_BACKEND_URL}${message.audioUrl}`);
        setCurrentAudio(audio);
        audio.play().catch((error) => {
          console.error('Audio playback failed:', error);
          if (message.useBrowserTts) {
          speakWithBrowser(message.text, message.acpSettings);
        }
      });
      return;
    }

    if (message.useBrowserTts) {
      speakWithBrowser(message.text, message.acpSettings);
    }
  };

  const buildRequestBody = (message) => ({
    message,
    customer_id: customerId,
    customer_context: customerContext || {},
  });

  const appendButchMessage = (data) => {
    if (data.customer_id && data.customer_id !== customerId) {
      localStorage.setItem(BUTCH_CUSTOMER_KEY, data.customer_id);
      setCustomerId(data.customer_id);
    }

    const nextMessage = {
      id: `${Date.now()}_butch`,
      text: data.text,
      sender: 'butch',
      timestamp: new Date(),
      audioUrl: data.audio_url,
      suggestions: data.suggestions || [],
      discounts: data.available_discounts || [],
      useBrowserTts: data.use_browser_tts,
      acpSettings: data.acp_settings || data.aacp_settings || {},
      voiceBackend: data.voice_backend,
    };

    setMessages((previous) => [...previous, nextMessage]);
    setLoyaltyTier(data.loyalty_tier || 'new');
    setVoiceMode(data.use_browser_tts ? 'browser' : (data.voice_backend || 'audio'));

    if (data.audio_url || data.use_browser_tts) {
      setTimeout(() => playMessageVoice(nextMessage), 150);
    }
  };

  const sendMessage = async (overrideText = null, greeting = false) => {
    const message = (overrideText ?? inputText).trim();
    if (!message || !customerId) {
      return;
    }

    if (!greeting) {
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}_user`,
          text: message,
          sender: 'user',
          timestamp: new Date(),
        },
      ]);
    }

    setInputText('');
    setIsTyping(true);

    try {
      const response = await fetch(`${apiBaseUrl}/butch/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody(message)),
      });

      if (!response.ok) {
        throw new Error('Butch chat request failed');
      }

      const data = await response.json();
      appendButchMessage(data);
    } catch (error) {
      console.error('Butch chat failed:', error);
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}_error`,
          text: "I'm having trouble reaching the butcher tools right now, but I can still help once the connection settles down.",
          text: "I'm having trouble connecting to the butcher tools right now, but I can still help once the connection settles down.",
          sender: 'butch',
          timestamp: new Date(),
          useBrowserTts: true,
          acpSettings: { voice_speed: 1 },
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateGreeting = async () => {
    await sendMessage("Hello, I'm looking at your lamb products.", true);
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'vip':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'regular':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-40">
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            if (messages.length === 0) {
              generateGreeting();
            }
          }}
          className="flex items-center gap-2 rounded-full bg-[#7b4b2a] px-5 py-4 text-white shadow-xl transition-all hover:bg-[#643a1f]"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="font-semibold">Ask Butch</span>
          {loyaltyTier !== 'new' && (
            <Badge className={`border ${getTierColor(loyaltyTier)}`}>
              {loyaltyTier}
            </Badge>
          )}
        </button>
      )}

      {isOpen && (
        <Card className="flex h-[540px] w-[24rem] flex-col overflow-hidden border-stone-300 shadow-2xl">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-stone-200 bg-gradient-to-r from-[#7b4b2a] to-[#5f3216] py-4 text-white">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-xl">🥩</span>
                Butch
              </CardTitle>
              <div className="mt-1 flex items-center gap-2 text-xs text-amber-50">
                <Badge className={`border ${getTierColor(loyaltyTier)}`}>
                  {loyaltyTier}
                </Badge>
                <span>{voiceMode === 'browser' ? 'Browser voice fallback' : `Voice: ${voiceMode}`}</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close Butch assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>

          <CardContent className="border-b border-stone-200 bg-stone-50 px-4 py-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-stone-700">
                <span className="mb-1 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Name
                </span>
                <input
                  type="text"
                  value={customerContext?.name || ''}
                  onChange={(event) => setCustomerContext((current) => ({ ...(current || {}), name: event.target.value }))}
                  onBlur={() => persistContext(customerContext || {})}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </label>
              <label className="text-xs font-medium text-stone-700">
                <span className="mb-1 flex items-center gap-1">
                  <History className="h-3 w-3" />
                  Email For Memory
                </span>
                <input
                  type="email"
                  value={customerContext?.email || ''}
                  onChange={(event) => setCustomerContext((current) => ({ ...(current || {}), email: event.target.value }))}
                  onBlur={() => persistContext(customerContext || {})}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </label>
            </div>
          </CardContent>

          <div className="flex-1 space-y-3 overflow-y-auto bg-white p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    message.sender === 'user'
                      ? 'rounded-br-md bg-[#7b4b2a] text-white'
                      : 'rounded-bl-md bg-stone-100 text-stone-800'
                  }`}
                >
                  <p className="whitespace-pre-line">{message.text}</p>

                  {message.sender === 'butch' && (message.audioUrl || message.useBrowserTts) && (
                    <button
                      onClick={() => playMessageVoice(message)}
                      className="mt-2 flex items-center gap-1 text-xs text-stone-500 transition-colors hover:text-stone-800"
                    >
                      <Volume2 className="h-3 w-3" />
                      {message.audioUrl ? 'Play voice' : 'Speak in browser'}
                    </button>
                  )}

                  {message.sender === 'butch' && message.suggestions?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => sendMessage(`Tell me more about ${suggestion}`)}
                          className="rounded-full bg-white px-2.5 py-1 text-xs text-stone-700 shadow-sm ring-1 ring-stone-200 transition-colors hover:bg-stone-50"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {message.sender === 'butch' && message.discounts?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {message.discounts.map((discount, index) => (
                        <div
                          key={`${discount.code || 'discount'}_${index}`}
                          className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs text-green-700"
                        >
                          <Tag className="h-3 w-3" />
                          <span>
                            {discount.code}: {discount.description || 'Available discount'} ({discount.discount_percent}% off)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-stone-100 px-4 py-3 text-sm text-stone-500">
                  Butch is thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-stone-200 bg-stone-50 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                placeholder="Ask about cuts, prior orders, pricing, or cooking..."
              />
              <Button
                type="button"
                onClick={() => sendMessage()}
                disabled={isTyping || !inputText.trim()}
                className="bg-[#7b4b2a] hover:bg-[#643a1f]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};


export default ButchAssistant;
