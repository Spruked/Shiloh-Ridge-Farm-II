// WorkerChatAdmin.jsx - Admin panel for managing worker learning
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Brain, MessageSquare, Database, TrendingUp,
    CheckCircle, XCircle, Plus, Search, Filter,
    ThumbsUp, ThumbsDown, AlertCircle, BookOpen,
    Sparkles, Trash2, Edit3
} from 'lucide-react';

const WorkerChatAdmin = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [learningQueue, setLearningQueue] = useState([]);
    const [knowledge, setKnowledge] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [teachForm, setTeachForm] = useState({
        question_pattern: '',
        answer: '',
        category: 'faq',
        related_concepts: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsRes, queueRes, knowledgeRes] = await Promise.all([
                axios.get('/api/worker-chat/admin/stats'),
                axios.get('/api/worker-chat/admin/learning-queue'),
                axios.get('/api/worker-chat/admin/knowledge')
            ]);
            setStats(statsRes.data);
            setLearningQueue(queueRes.data);
            setKnowledge(knowledgeRes.data.knowledge);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveLearning = async (itemId) => {
        if (!teachForm.answer.trim()) return;
        try {
            await axios.post('/api/worker-chat/admin/approve-learning', {
                learning_id: itemId,
                answer: teachForm.answer,
                category: teachForm.category,
                related_concepts: teachForm.related_concepts.split(',').map(s => s.trim())
            });
            setTeachForm({ question_pattern: '', answer: '', category: 'faq', related_concepts: '' });
            setSelectedItem(null);
            loadData();
        } catch (error) {
            alert('Failed to approve learning');
        }
    };

    const handleTeachNew = async () => {
        if (!teachForm.question_pattern.trim() || !teachForm.answer.trim()) return;
        try {
            await axios.post('/api/worker-chat/admin/teach', {
                question_pattern: teachForm.question_pattern,
                answer: teachForm.answer,
                category: teachForm.category,
                related_concepts: teachForm.related_concepts.split(',').map(s => s.trim())
            });
            setTeachForm({ question_pattern: '', answer: '', category: 'faq', related_concepts: '' });
            loadData();
            setActiveTab('knowledge');
        } catch (error) {
            alert('Failed to teach worker');
        }
    };

    const filteredKnowledge = knowledge.filter(node => {
        const matchesSearch = node.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || node.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = [
        { id: 'website_feature', label: 'Website Features', color: 'blue' },
        { id: 'product_info', label: 'Product Info', color: 'green' },
        { id: 'process', label: 'Processes', color: 'amber' },
        { id: 'faq', label: 'FAQs', color: 'purple' },
        { id: 'unanswered', label: 'Unanswered', color: 'red' }
    ];

    if (loading) return (
        <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Loading Worker Chat Admin...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <Brain className="w-8 h-8 text-emerald-600" />
                    Worker Chat Assistant Admin
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Manage your learning chat assistant. Review unanswered questions, teach new responses, and monitor performance.
                </p>
            </div>

            <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                    { id: 'learning', label: 'Learning Queue', icon: Sparkles, badge: learningQueue.length },
                    { id: 'teach', label: 'Teach New', icon: Plus },
                    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${activeTab === tab.id
                                ? 'border-emerald-600 text-emerald-600'
                                : 'border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.badge > 0 && (
                            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{tab.badge}</span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'dashboard' && stats && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Total Knowledge</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.total_knowledge_nodes}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Pending Learning</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.pending_learning}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Learned Total</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.learned_total}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Active Sessions</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.recent_conversations}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Knowledge by Category</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {categories.map(cat => (
                                <div key={cat.id} className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <div className={`text-2xl font-bold text-${cat.color}-600`}>{stats.knowledge_by_category[cat.id] || 0}</div>
                                    <div className="text-xs text-slate-500 mt-1">{cat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
                        <h3 className="font-semibold mb-2">How It Works</h3>
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <div className="bg-white/10 rounded-lg p-4">
                                <div className="font-semibold mb-1">1. Visitor Asks</div>
                                <p className="text-emerald-100">Visitor asks questions through the chat bubble on any page.</p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-4">
                                <div className="font-semibold mb-1">2. Worker Learns</div>
                                <p className="text-emerald-100">Unanswered questions are saved to the learning queue.</p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-4">
                                <div className="font-semibold mb-1">3. You Teach</div>
                                <p className="text-emerald-100">You review and provide answers, improving the worker over time.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'learning' && (
                <div className="grid lg:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Questions Awaiting Answers ({learningQueue.length})</h3>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {learningQueue.map(item => (
                                <div key={item.id} onClick={() => { setSelectedItem(item); setTeachForm({ ...teachForm, question_pattern: item.question }); }} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedItem?.id === item.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'}`}>
                                    <p className="font-medium text-slate-800 dark:text-slate-200 mb-2">{item.question}</p>
                                    <div className="flex items-center gap-4 text-xs text-slate-500"><span>From: {item.context.page}</span><span>{new Date(item.timestamp).toLocaleDateString()}</span><span className="capitalize">{item.context.user_type}</span></div>
                                </div>
                            ))}
                            {learningQueue.length === 0 && (<div className="text-center py-12 text-slate-500"><CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" /><p>No pending questions! The worker is fully trained.</p></div>)}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Teach the Worker</h3>
                        {selectedItem ? (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Question Pattern</label>
                                    <input type="text" value={teachForm.question_pattern} onChange={(e) => setTeachForm({ ...teachForm, question_pattern: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                                    <select value={teachForm.category} onChange={(e) => setTeachForm({ ...teachForm, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900">
                                        {categories.filter(c => c.id !== 'unanswered').map(cat => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Your Answer</label>
                                    <textarea value={teachForm.answer} onChange={(e) => setTeachForm({ ...teachForm, answer: e.target.value })} placeholder="Type the answer the worker should learn..." rows={4} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Related Concepts (comma separated)</label>
                                    <input type="text" value={teachForm.related_concepts} onChange={(e) => setTeachForm({ ...teachForm, related_concepts: e.target.value })} placeholder="e.g., ordering, deposit, timeline" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900" />
                                </div>

                                <button onClick={() => handleApproveLearning(selectedItem.id)} disabled={!teachForm.answer.trim()} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"><CheckCircle className="w-5 h-5" /> Approve & Teach Worker</button>
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-8 text-center text-slate-500"><Brain className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Select a question from the queue to teach the worker</p></div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'teach' && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Teach New Knowledge</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">Proactively teach the worker responses before visitors ask. This is useful for common questions you anticipate.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Question Pattern</label>
                                <input type="text" value={teachForm.question_pattern} onChange={(e) => setTeachForm({ ...teachForm, question_pattern: e.target.value })} placeholder="e.g., How much freezer space do I need?" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                                <select value={teachForm.category} onChange={(e) => setTeachForm({ ...teachForm, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900">
                                    {categories.filter(c => c.id !== 'unanswered').map(cat => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Answer</label>
                                <textarea value={teachForm.answer} onChange={(e) => setTeachForm({ ...teachForm, answer: e.target.value })} placeholder="Type the complete answer..." rows={4} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Related Concepts</label>
                                <input type="text" value={teachForm.related_concepts} onChange={(e) => setTeachForm({ ...teachForm, related_concepts: e.target.value })} placeholder="e.g., freezer, storage, space, cubic feet" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900" />
                            </div>

                            <button onClick={handleTeachNew} disabled={!teachForm.question_pattern.trim() || !teachForm.answer.trim()} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"><Plus className="w-5 h-5" /> Teach Worker</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'knowledge' && (
                <div>
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input type="text" placeholder="Search knowledge..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900" />
                        </div>
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900">
                            <option value="all">All Categories</option>
                            {categories.filter(c => c.id !== 'unanswered').map(cat => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}
                        </select>
                    </div>

                    <div className="grid gap-4">
                        {filteredKnowledge.map(node => (
                            <div key={node.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${node.category === 'website_feature' ? 'bg-blue-100 text-blue-700' : node.category === 'product_info' ? 'bg-green-100 text-green-700' : node.category === 'process' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {node.category.replace('_', ' ')}
                                        </span>
                                        <span className="ml-2 text-xs text-slate-500">Confidence: {Math.round(node.confidence * 100)}%</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500"><span>Accessed {node.access_count} times</span></div>
                                </div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{node.concept.replace('_', ' ')}</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{node.content}</p>
                                {node.related_concepts.length > 0 && (<div className="flex gap-2 flex-wrap">{node.related_concepts.map((concept, idx) => (<span key={idx} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-400">{concept}</span>))}</div>)}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkerChatAdmin;
