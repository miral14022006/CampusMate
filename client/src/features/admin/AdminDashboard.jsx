import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReviewQueueTab from '../feedback/ReviewQueueTab';
import AnalyticsDashboard from '../dashboard/AnalyticsDashboard';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function AdminDashboard({ onLogout }) {
  const [token, setToken] = useState(() => localStorage.getItem('campus_admin_token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Upload Form State
  const [title, setTitle] = useState('');
  const [topicKey, setTopicKey] = useState('');
  const [docType, setDocType] = useState('notice');
  const [department, setDepartment] = useState('Examination Cell');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Version History Drawer
  const [selectedDocHistory, setSelectedDocHistory] = useState(null);

  // Index Stats
  const [indexVersion, setIndexVersion] = useState('v1');
  const [activeChunkCount, setActiveChunkCount] = useState(0);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'documents' | 'review_queue'

  useEffect(() => {
    if (token) {
      fetchDocuments();
    }
  }, [token, statusFilter]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post(`${API_BASE}/admin/login`, { username, password });
      const jwt = res.data.token;
      localStorage.setItem('campus_admin_token', jwt);
      setToken(jwt);
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Login failed. Invalid credentials.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('campus_admin_token');
    setToken('');
    if (onLogout) onLogout();
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/documents`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: statusFilter, search }
      });
      setDocuments(res.data.documents || []);
      const totalChunks = (res.data.documents || []).reduce((acc, d) => acc + (d.chunk_count || 0), 0);
      setActiveChunkCount(totalChunks);
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    setUploadError('');
    setUploadMessage('Uploading and processing document through NLP pipeline...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title);
    formData.append('topic_key', topicKey);
    formData.append('doc_type', docType);
    formData.append('department', department);
    formData.append('effective_date', effectiveDate);

    try {
      const res = await axios.post(`${API_BASE}/admin/documents/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadMessage(`Success: ${res.data.message}`);
      setIndexVersion(res.data.new_index_version || 'v2');
      setTitle('');
      setTopicKey('');
      setSelectedFile(null);
      fetchDocuments();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed.');
      setUploadMessage('');
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const res = await axios.post(`${API_BASE}/admin/documents/reindex`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Index Rebuilt Successfully! Active chunks: ${res.data.nlp?.active_chunks || 're-indexed'}`);
      setIndexVersion(res.data.nlp?.new_index_version || 'updated');
      fetchDocuments();
    } catch (err) {
      alert(`Re-index failed: ${err.message}`);
    } finally {
      setReindexing(false);
    }
  };

  const handleArchive = async (id) => {
    if (!confirm('Are you sure you want to archive this document?')) return;
    try {
      await axios.patch(`${API_BASE}/admin/documents/${id}/status`, { status: 'archived' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDocuments();
    } catch (err) {
      alert(`Failed to archive: ${err.message}`);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[600px] w-full max-w-md mx-auto p-6">
        <div className="w-full bg-white shadow-2xl rounded-2xl p-8 border border-slate-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Admin Portal</h2>
            <p className="text-xs text-slate-500 mt-1">Manage documents, versions, and search indexes</p>
          </div>
          {loginError && (
            <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-lg mb-4 border border-rose-200">
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md"
            >
              Sign In to Admin Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Campus Administrative Portal</h1>
          <p className="text-xs text-slate-500 mt-0.5">Document versioning, indexing, user feedback curation & retraining pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>{reindexing ? 'Re-indexing...' : 'Re-index All'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-300 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📊</span>
          <span>Analytics & Observability</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📁</span>
          <span>Documents & Versioning</span>
        </button>

        <button
          onClick={() => setActiveTab('review_queue')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'review_queue'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🔍</span>
          <span>Feedback & Failure Review Queue</span>
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <AnalyticsDashboard token={token} />
      ) : activeTab === 'review_queue' ? (
        <ReviewQueueTab token={token} />
      ) : (
        <>
          {/* Index Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Active Search Index Version</div>
          <div className="text-lg font-bold text-indigo-600 mt-1 font-mono">{indexVersion}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Indexed Documents</div>
          <div className="text-lg font-bold text-slate-800 mt-1">{documents.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Active Retrieval Chunks</div>
          <div className="text-lg font-bold text-emerald-600 mt-1">{activeChunkCount} chunks</div>
        </div>
      </div>

      {/* Upload New Document Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📤</span>
          <span>Upload & Version New Circular / Notice</span>
        </h2>

        {uploadError && (
          <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-lg mb-4 border border-rose-200">
            {uploadError}
          </div>
        )}
        {uploadMessage && (
          <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-lg mb-4 border border-emerald-200">
            {uploadMessage}
          </div>
        )}

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mid-Sem Exam Form Deadline Extended"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Topic Key (for auto-versioning)</label>
            <input
              type="text"
              value={topicKey}
              onChange={(e) => setTopicKey(e.target.value)}
              placeholder="e.g. exam_form_schedule"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Doc Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="notice">Notice</option>
              <option value="circular">Circular</option>
              <option value="calendar">Academic Calendar</option>
              <option value="handbook">Handbook</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Issuing Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Effective Date</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Upload File (PDF / DOCX / TXT)</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              required
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-sm"
            >
              Upload, Version & Index Document
            </button>
          </div>
        </form>
      </div>

      {/* Document Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800">Document Repository</h2>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="superseded">Superseded</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Topic Key</th>
                <th className="p-3">Version</th>
                <th className="p-3">Status</th>
                <th className="p-3">Effective Date</th>
                <th className="p-3">Chunks</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc._id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-medium text-slate-800">{doc.title}</td>
                  <td className="p-3 font-mono text-slate-600">{doc.topic_key}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      v{doc.version}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      doc.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : doc.status === 'superseded'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">
                    {new Date(doc.effective_date).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-slate-600 font-medium">{doc.chunk_count}</td>
                  <td className="p-3 flex items-center gap-2">
                    {doc.supersedes && (
                      <button
                        onClick={() => setSelectedDocHistory(doc)}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        History
                      </button>
                    )}
                    {doc.status === 'active' && (
                      <button
                        onClick={() => handleArchive(doc._id)}
                        className="text-rose-600 hover:underline"
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {documents.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-400">
                    No documents found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

