import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  CheckCircle,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  UserRound
} from 'lucide-react';

const SESSION_KEY = 'shiloh_butch_session_id';
const PROFILE_KEY = 'shiloh_butch_profile';

const getStoredSessionId = () => {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const generated = `butch_${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem(SESSION_KEY, generated);
  return generated;
};

const getStoredProfile = () => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
  } catch (error) {
    console.error('Failed to read Butch profile from storage:', error);
    return {};
  }
};

const saveProfile = (profile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

const OrderParserChat = ({ onOrderParsed }) => {
  const apiBaseUrl = `${process.env.REACT_APP_BACKEND_URL}/api`;
  const storedProfile = useMemo(() => getStoredProfile(), []);
  const [sessionId, setSessionId] = useState('');
  const [input, setInput] = useState('');
  const [visitorName, setVisitorName] = useState(storedProfile.name || '');
  const [visitorEmail, setVisitorEmail] = useState(storedProfile.email || '');
  const [visitorPhone, setVisitorPhone] = useState(storedProfile.phone || '');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        storedProfile.name
          ? `Welcome back${storedProfile.name ? `, ${storedProfile.name}` : ''}. I can help with whole and half hog or lamb orders, freezer planning, and prior orders.`
          : 'Hi, I am Butch. I can help with whole and half hog or lamb orders, freezer planning, and prior-order recall if you share your email.'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    'I want a whole hog',
    'How much meat do I get from a half lamb?',
    'How do I place an order?'
  ]);

  useEffect(() => {
    setSessionId(getStoredSessionId());
  }, []);

  const handleSend = async (overrideMessage = null) => {
    const messageText = (overrideMessage || input).trim();
    if (!messageText) {
      return;
    }

    setInput('');
    setMessages((previous) => [...previous, { role: 'user', content: messageText }]);
    setLoading(true);

    try {
      const response = await axios.post(`${apiBaseUrl}/butcher/parse`, {
        order_text: messageText,
        session_id: sessionId || getStoredSessionId(),
        visitor_name: visitorName || null,
        visitor_email: visitorEmail || null,
        visitor_phone: visitorPhone || null,
        page_context: 'products'
      });

      const parsed = response.data;
      const mergedProfile = {
        name: visitorName || parsed.visitor_profile?.name || '',
        email: visitorEmail || parsed.visitor_profile?.email || '',
        phone: visitorPhone || ''
      };
      saveProfile(mergedProfile);

      setSuggestions(parsed.suggestions || []);
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: parsed.reply,
          parsed: parsed.parsed_successfully,
          recalledOrders: parsed.recalled_orders || [],
          estimate: parsed.estimate_summary || null
        }
      ]);

      if (parsed.parsed_successfully && onOrderParsed) {
        onOrderParsed(parsed);
      }
    } catch (error) {
      console.error('Butch chat error:', error);
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content:
            'I hit a snag reaching the butcher planner just now. Please try again in a moment or use the calculator while I catch back up.',
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="border-b border-amber-200 bg-gradient-to-r from-amber-600 to-orange-600 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-white">
          <MessageSquare className="h-5 w-5" />
          Butch The Butcher
        </h3>
        <p className="mt-1 text-xs text-amber-100">
          Product-page assistant for cuts, freezer planning, reorder recall, and checkout guidance.
        </p>
      </div>

      <div className="space-y-3 border-b border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
              <UserRound className="h-3.5 w-3.5" />
              Name
            </span>
            <input
              type="text"
              value={visitorName}
              onChange={(event) => setVisitorName(event.target.value)}
              onBlur={() => saveProfile({ name: visitorName, email: visitorEmail, phone: visitorPhone })}
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
              <Mail className="h-3.5 w-3.5" />
              Email For Prior Orders
            </span>
            <input
              type="email"
              value={visitorEmail}
              onChange={(event) => setVisitorEmail(event.target.value)}
              onBlur={() => saveProfile({ name: visitorName, email: visitorEmail, phone: visitorPhone })}
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="h-80 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-amber-600 text-white'
                  : message.isError
                    ? 'bg-red-100 text-red-800'
                    : 'bg-slate-100 text-slate-800'
              }`}
            >
              <div className="whitespace-pre-line">{message.content}</div>

              {message.parsed && (
                <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Parsed successfully
                </div>
              )}

              {message.recalledOrders?.length > 0 && (
                <div className="mt-3 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700">
                  <div className="mb-1 font-semibold text-slate-800">Recent Orders</div>
                  {message.recalledOrders.map((order) => (
                    <div key={order.id} className="mb-2 last:mb-0">
                      <div>
                        <span className="font-medium">{order.status}</span>
                        {' · '}
                        ${Number(order.total_amount || 0).toFixed(2)}
                      </div>
                      <div className="text-slate-500">{(order.items || []).join('; ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-slate-100 px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            </div>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="mb-2 text-xs font-medium text-slate-500">Quick prompts</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 transition-colors hover:border-amber-400 hover:text-amber-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about cuts, whole vs half, freezer space, or prior orders..."
            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-amber-600 px-3 py-2 text-white transition-colors hover:bg-amber-700 disabled:bg-slate-300"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          Butch learns which requests need better answers and keeps your saved visitor profile lightweight.
        </p>
      </div>
    </div>
  );
};

export default OrderParserChat;
