import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const INTENT_TAXONOMY = [
  'exam_form_deadline',
  'fee_payment',
  'fee_structure',
  'attendance_rules',
  'scholarship',
  'holidays',
  'hostel',
  'admission',
  're_evaluation',
  'placement',
  'bonafide_certificate',
  'library_timings',
  'bus_transport',
  'syllabus',
  'backlog_rules',
  'contact_office',
  'out_of_scope'
];

export default function ReviewQueueTab({ token }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [ratingFilter, setRatingFilter] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editedIntent, setEditedIntent] = useState('');
  const [editedDoc, setEditedDoc] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, ratingFilter]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/feedback/queue`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: statusFilter, rating: ratingFilter || undefined }
      });
      setQueue(res.data.queue || []);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (itemId, decision) => {
    try {
      await axios.patch(
        `${API_BASE}/admin/feedback/${itemId}/review`,
        {
          reviewStatus: decision,
          correctIntent: editedIntent || undefined,
          correctDoc: editedDoc || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setActionMsg(`Feedback record ${decision === 'approved' ? 'Approved for Retraining' : 'Rejected'}.`);
      setEditingItem(null);
      fetchQueue();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      console.error('Failed to submit review action:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-800">Feedback & Failure Review Queue</h3>
          <p className="text-xs text-slate-500">
            Review user-reported issues and auto-flagged implicit failures. Approve corrected samples for model retraining.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-medium"
          >
            <option value="pending">Status: Pending Review</option>
            <option value="approved">Status: Approved for Retraining</option>
            <option value="rejected">Status: Rejected</option>
            <option value="">Status: All</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 font-medium"
          >
            <option value="">Rating: All</option>
            <option value="down">User Thumbs Down 👎</option>
            <option value="implicit_failure">Auto Implicit Failures ⚠️</option>
            <option value="up">User Thumbs Up 👍</option>
          </select>

          <button
            onClick={fetchQueue}
            className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-lg border border-indigo-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium">
          ✓ {actionMsg}
        </div>
      )}

      {/* Review Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading feedback queue...</div>
        ) : queue.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No feedback entries found matching current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">User Query</th>
                  <th className="p-3">Pipeline Prediction</th>
                  <th className="p-3">Reason / User Note</th>
                  <th className="p-3">Correction</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map((item) => {
                  const isEditing = editingItem === item._id;
                  const snapshot = item.pipelineSnapshot || {};

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.rating === 'down'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : item.rating === 'implicit_failure'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {item.rating === 'down'
                            ? '👎 Thumbs Down'
                            : item.rating === 'implicit_failure'
                            ? '⚠️ Implicit Failure'
                            : '👍 Thumbs Up'}
                        </span>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="font-medium text-slate-900 line-clamp-2">{item.query}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Lang: {snapshot.language || 'en'} • {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{snapshot.intent || 'None'}</div>
                        <div className="text-[10px] text-slate-500">
                          Conf: {((snapshot.confidence || 0) * 100).toFixed(0)}% • Mode: {snapshot.mode || 'rag'}
                        </div>
                        {snapshot.decision && snapshot.decision !== 'ANSWER' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            {snapshot.decision}
                          </span>
                        )}
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="text-slate-700 font-medium">{item.reason || 'None specified'}</div>
                        {item.comment && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">"{item.comment}"</div>
                        )}
                      </td>

                      <td className="p-3">
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <select
                              value={editedIntent}
                              onChange={(e) => setEditedIntent(e.target.value)}
                              className="text-[11px] p-1 border border-indigo-200 rounded w-full bg-white"
                            >
                              <option value="">-- Assign Correct Intent --</option>
                              {INTENT_TAXONOMY.map((it) => (
                                <option key={it} value={it}>
                                  {it}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Correct Doc/Chunk"
                              value={editedDoc}
                              onChange={(e) => setEditedDoc(e.target.value)}
                              className="text-[11px] p-1 border border-indigo-200 rounded w-full"
                            />
                          </div>
                        ) : (
                          <div>
                            {item.correctIntent ? (
                              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                🎯 {item.correctIntent}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                            {item.correctDoc && (
                              <div className="text-[10px] text-slate-500 mt-1">📄 {item.correctDoc}</div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReviewAction(item._id, 'approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewAction(item._id, 'rejected')}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium text-[11px]"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="text-[10px] text-slate-400 hover:underline px-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingItem(item._id);
                                setEditedIntent(item.correctIntent || snapshot.intent || '');
                                setEditedDoc(item.correctDoc || '');
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px]"
                            >
                              Annotate
                            </button>
                            {item.reviewStatus === 'pending' && (
                              <button
                                onClick={() => {
                                  setEditedIntent(item.correctIntent || snapshot.intent || '');
                                  handleReviewAction(item._id, 'approved');
                                }}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded font-medium text-[11px]"
                                title="Approve with current intent"
                              >
                                Quick Approve
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

