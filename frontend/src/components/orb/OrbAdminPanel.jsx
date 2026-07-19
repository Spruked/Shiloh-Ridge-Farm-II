import React, { useState, useEffect } from 'react';
import { Brain, MessageSquare, Database, Settings, TrendingUp, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { adminAuthHeader, getApiBaseUrl } from '../../lib/backend';

const API = getApiBaseUrl();

const OrbAdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [scripts, setScripts] = useState(null);
  const [pendingLearning, setPendingLearning] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [teachingResponse, setTeachingResponse] = useState('');
  const [escalations, setEscalations] = useState([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/orb/admin/dashboard`, { headers: adminAuthHeader() });
      setDashboardData(response.data);
      setScripts(response.data.scripts);
      setPendingLearning(response.data.pending_learning);
      try {
        const escalationResponse = await axios.get(`${API}/orb/substrate/escalations`, { headers: adminAuthHeader() });
        setEscalations(escalationResponse.data.escalations || []);
      } catch (_error) {
        setEscalations([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      setLoading(false);
    }
  };

  const resolveEscalation = async (escalationId) => {
    const resolution = window.prompt('Record the human resolution:');
    if (!resolution?.trim()) return;
    await axios.post(`${API}/orb/substrate/escalations/${escalationId}/resolve`, { resolution }, { headers: adminAuthHeader() });
    fetchDashboardData();
  };

  const handleScriptUpdate = async (section, key, value) => {
    try {
      await axios.post(`${API}/orb/admin/scripts/update`, { section, key, value }, { headers: adminAuthHeader() });
      fetchDashboardData();
    } catch (error) { alert('Failed to update script'); }
  };

  const handleApproveLearning = async () => {
    if (!selectedQuery || !teachingResponse.trim()) return;
    try {
      await axios.post(`${API}/orb/admin/learning/approve`, { query_hash: selectedQuery.hash, response: teachingResponse }, { headers: adminAuthHeader() });
      setSelectedQuery(null); setTeachingResponse(''); fetchDashboardData();
    } catch (error) { alert('Failed to approve learning'); }
  };

  if (loading) return <div className="p-8">Loading Orb Admin...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3"><Brain className="w-8 h-8 text-emerald-600" />Orb Assistant Admin</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your website's learning assistant</p>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
        {[{ id: 'dashboard', label: 'Dashboard', icon: TrendingUp },{ id: 'scripts', label: 'Scripts', icon: MessageSquare },{ id: 'learning', label: 'Learning Queue', icon: Database },{ id: 'escalations', label: 'Human Review', icon: ShieldAlert },{ id: 'settings', label: 'Settings', icon: Settings }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${ activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-600 hover:text-slate-800' }`}>
            <tab.icon className="w-4 h-4" />{tab.label}
            {tab.id === 'learning' && pendingLearning.length > 0 && <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingLearning.length}</span>}
            {tab.id === 'escalations' && escalations.length > 0 && <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{escalations.length}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Interaction Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-600">Total Interactions</span><span className="font-bold text-emerald-600">{dashboardData.metrics.total_interactions}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Successful Responses</span><span className="font-bold text-emerald-600">{dashboardData.metrics.successful_responses}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Learning Opportunities</span><span className="font-bold text-amber-600">{dashboardData.metrics.learning_opportunities}</span></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Vault Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-600">A Priori Entries</span><span className="font-bold">{dashboardData.vault_status.a_priori_entries}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Learned Responses</span><span className="font-bold">{dashboardData.vault_status.a_posteriori_entries}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Pending Review</span><span className="font-bold text-amber-600">{dashboardData.vault_status.unanswered_count}</span></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Improvement Suggestions</h3>
            <div className="space-y-2">
              {dashboardData.improvement_suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm"><AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" /><span className="text-slate-700 dark:text-slate-300">{suggestion.suggestion}</span></div>
              ))}
              {dashboardData.improvement_suggestions.length === 0 && (<p className="text-slate-500 text-sm">No suggestions yet. Keep interacting!</p>)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scripts' && scripts && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Greeting Messages</h3>
            <div className="space-y-4">
              {Object.entries(scripts.greetings).map(([key, value]) => (
                <div key={key}><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 capitalize">{key.replace('_', ' ')}</label><div className="flex gap-2"><textarea defaultValue={value} className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm" rows={2} onBlur={(e) => handleScriptUpdate('greetings', key, e.target.value)} /></div></div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Intent Responses</h3>
            <div className="space-y-4">
              {Object.entries(scripts.intents).map(([key, data]) => (
                <div key={key} className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-0">
                  <h4 className="font-medium text-emerald-600 mb-2 capitalize">{key.replace('_', ' ')}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-slate-600 mb-1">Response</label>
                      <textarea defaultValue={data.response} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900" rows={2} onBlur={(e) => { const newData = { ...data, response: e.target.value }; handleScriptUpdate('intents', key, JSON.stringify(newData)); }} />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Triggers</label>
                      <div className="flex flex-wrap gap-1">{data.triggers.map((t, i) => (<span key={i} className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-xs">{t}</span>))}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'learning' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Pending Questions</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {pendingLearning.map((item) => (
                <div key={item.hash} onClick={() => setSelectedQuery(item)} className={`p-4 rounded-lg border cursor-pointer transition-colors ${ selectedQuery?.hash === item.hash ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300' }`}>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{item.query}</p>
                  <p className="text-xs text-slate-500 mt-1">From: {item.context.page} • {new Date(item.timestamp).toLocaleDateString()}</p>
                </div>
              ))}
              {pendingLearning.length === 0 && (<p className="text-slate-500 text-center py-8">No pending questions!</p>)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Teach the Orb</h3>
            {selectedQuery ? (
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selected Question</label><div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-sm">{selectedQuery.query}</div></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Your Response</label><textarea value={teachingResponse} onChange={(e) => setTeachingResponse(e.target.value)} placeholder="Type the answer the Orb should learn..." className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900" rows={4} /></div>
                <button onClick={handleApproveLearning} disabled={!teachingResponse.trim()} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-lg font-medium transition-colors"><CheckCircle className="w-4 h-4" />Approve & Teach Orb</button>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500"><Brain className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Select a question to teach the Orb</p></div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Learning Configuration</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"><div><h4 className="font-medium">Auto-Learning</h4><p className="text-sm text-slate-600">Automatically approve learned responses</p></div><div className="text-amber-600 text-sm font-medium">Disabled (Admin approval required)</div></div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"><div><h4 className="font-medium">Save Unanswered Queries</h4><p className="text-sm text-slate-600">Store questions the Orb couldn't answer</p></div><div className="text-emerald-600 text-sm font-medium">Enabled</div></div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"><div><h4 className="font-medium">Confidence Threshold</h4><p className="text-sm text-slate-600">Minimum confidence to auto-respond</p></div><div className="text-slate-800 dark:text-slate-200 font-medium">60%</div></div>
          </div>
        </div>
      )}

      {activeTab === 'escalations' && (
        <div className="space-y-4">
          {escalations.map((item) => (
            <article key={item.escalation_id} className="rounded-xl border border-amber-200 bg-white p-5 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div><h3 className="font-semibold">{item.escalation_id}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.user_request}</p></div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">{item.priority}</span>
              </div>
              <p className="mt-3 text-sm"><strong>Reason:</strong> {item.reason}</p>
              <p className="mt-1 text-xs text-slate-500">Evidence pointers: {(item.evidence || []).length}</p>
              <button type="button" onClick={() => resolveEscalation(item.escalation_id)} className="mt-4 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white">Record resolution</button>
            </article>
          ))}
          {escalations.length === 0 && <p className="rounded-xl border p-8 text-center text-slate-500">No open human reviews.</p>}
        </div>
      )}
    </div>
  );
};

export default OrbAdminPanel;
