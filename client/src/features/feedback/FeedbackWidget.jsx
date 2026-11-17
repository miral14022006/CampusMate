import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const FAILURE_REASONS = [
  { id: 'wrong answer', label: 'Wrong answer' },
  { id: 'wrong language', label: 'Wrong language' },
  { id: 'outdated', label: 'Outdated info' },
  { id: 'not helpful', label: 'Not helpful' },
  { id: 'other', label: 'Other' }
];

const COMMON_INTENTS = [
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

export default function FeedbackWidget({ message, userQuery, sessionId }) {
  const [submitted, setSubmitted] = useState(null); // 'up' | 'down'
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [comment, setComment] = useState('');
  const [suggestedIntent, setSuggestedIntent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (rating) => {
    if (submitted) return;

    if (rating === 'up') {
      try {
        setIsSubmitting(true);
        await axios.post(`${API_BASE}/feedback`, {
          messageId: message.messageId || String(message.id),
          sessionId,
          query: userQuery || message.standaloneQuery || 'User Query',
          rating: 'up',
          pipelineSnapshot: {
            language: message.language,
            intent: message.intent,
            confidence: message.confidence,
            retrievedDocs: message.sourceDoc ? [message.sourceDoc] : [],
            answer: message.text,
            mode: message.generationMode || 'rag',
            decision: message.decision || 'ANSWER'
          }
        });
        setSubmitted('up');
      } catch (err) {
        console.error('Failed to submit thumbs-up:', err);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setShowReasonPicker(true);
    }
  };

  const submitThumbsDown = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await axios.post(`${API_BASE}/feedback`, {
        messageId: message.messageId || String(message.id),
        sessionId,
        query: userQuery || message.standaloneQuery || 'User Query',
        rating: 'down',
        reason: selectedReason || 'not helpful',
        comment: comment.trim(),
        correctIntent: suggestedIntent || null,
        pipelineSnapshot: {
          language: message.language,
          intent: message.intent,
          confidence: message.confidence,
          retrievedDocs: message.sourceDoc ? [message.sourceDoc] : [],
          answer: message.text,
          mode: message.generationMode || 'rag',
          decision: message.decision || 'ANSWER'
        }
      });
      setSubmitted('down');
      setShowReasonPicker(false);
    } catch (err) {
      console.error('Failed to submit thumbs-down:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-2 text-xs flex flex-col items-start gap-1.5">
      {/* Thumbs actions */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400 font-medium select-none">Was this helpful?</span>
        <button
          type="button"
          onClick={() => handleFeedback('up')}
          disabled={isSubmitting || submitted !== null}
          className={`p-1.5 rounded-lg border transition-all ${
            submitted === 'up'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-300 font-bold'
              : 'hover:bg-slate-100 text-slate-500 border-slate-200'
          }`}
          title="Helpful response"
        >
          👍 {submitted === 'up' && <span className="text-[10px] ml-1 text-emerald-700">Thank you!</span>}
        </button>

        <button
          type="button"
          onClick={() => handleFeedback('down')}
          disabled={isSubmitting || submitted !== null}
          className={`p-1.5 rounded-lg border transition-all ${
            submitted === 'down'
              ? 'bg-rose-50 text-rose-600 border-rose-300 font-bold'
              : 'hover:bg-slate-100 text-slate-500 border-slate-200'
          }`}
          title="Not helpful / Incorrect"
        >
          👎 {submitted === 'down' && <span className="text-[10px] ml-1 text-rose-700">Logged for review</span>}
        </button>
      </div>

      {/* Popover Reason Picker when thumbs down clicked */}
      {showReasonPicker && !submitted && (
        <form
          onSubmit={submitThumbsDown}
          className="mt-1.5 p-3 w-full max-w-sm bg-white border border-rose-200 shadow-md rounded-xl space-y-2.5"
        >
          <div className="flex justify-between items-center text-slate-700 font-semibold text-[11px]">
            <span>What went wrong?</span>
            <button
              type="button"
              onClick={() => setShowReasonPicker(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          </div>

          {/* Reason Pills */}
          <div className="flex flex-wrap gap-1.5">
            {FAILURE_REASONS.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => setSelectedReason(r.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                  selectedReason === r.id
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Optional Correct Intent Selection */}
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-1">
              Correct intent (optional):
            </label>
            <select
              value={suggestedIntent}
              onChange={(e) => setSuggestedIntent(e.target.value)}
              className="w-full text-[11px] p-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="">-- Choose what was meant --</option>
              {COMMON_INTENTS.map((intent) => (
                <option key={intent} value={intent}>
                  {intent}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Comment */}
          <input
            type="text"
            placeholder="Tell us more (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full text-[11px] px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
          />

          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setShowReasonPicker(false)}
              className="px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

