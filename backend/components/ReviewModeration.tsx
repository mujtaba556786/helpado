
import React, { useState } from 'react';
import { Review } from '../types';
import { ICONS, AI_FEATURES_ENABLED } from '../constants';
import { apiService } from '../services/api';
import { GoogleGenAI } from "@google/genai";

interface ReviewModerationProps {
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
}

const ReviewModerationView: React.FC<ReviewModerationProps> = ({ reviews, setReviews }) => {
  const [scanning, setScanning] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: 'Approved' | 'Rejected') => {
    const success = await apiService.moderateReview(id, status);
    if (success) {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this review? This cannot be undone.')) return;
    const success = await apiService.deleteReview(id);
    if (success) {
      setReviews(prev => prev.filter(r => r.id !== id));
    }
  };

  const aiScan = async (review: Review) => {
    setScanning(review.id);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analyze this review for a service marketplace. 
        Detect profanity, hate speech, or inappropriate content. 
        Review: "${review.comment}"
        If bad, return "BLOCK". If safe, return "SAFE". Only return one word.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        const result = response.text?.trim().toUpperCase();
        if (result === 'BLOCK') {
            alert("⚠️ AI Alert: This review contains inappropriate language!");
            setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status: 'Flagged' } : r));
        } else {
            alert("✅ AI Scan: No inappropriate content detected.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        setScanning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black italic">Moderation Queue</h2>
          <p className="text-indigo-200 text-sm">Protect the community from bad words and spam.</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black">{reviews.filter(r => r.status === 'Pending').length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Pending Approval</p>
        </div>
      </div>

      <div className="grid gap-6">
        {reviews.map((review) => (
          <div key={review.id} className={`bg-white p-6 rounded-3xl border transition-all ${
            review.status === 'Flagged' ? 'border-red-500 bg-red-50/10' : 
            review.status === 'Approved' ? 'border-green-100 opacity-60' : 'border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <img src={`https://picsum.photos/seed/${review.id}/100`} className="w-10 h-10 rounded-xl border" alt="" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{review.customerName}</p>
                  <p className="text-xs text-slate-500">{review.date} • {review.serviceName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
            </div>

            <p className="text-slate-700 text-sm mb-6 bg-slate-50 p-4 rounded-xl italic font-medium">"{review.comment}"</p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-3">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                    review.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    review.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    review.status === 'Flagged' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                    {review.status}
                </span>
                {AI_FEATURES_ENABLED && (
                <button
                    onClick={() => aiScan(review)}
                    disabled={scanning === review.id}
                    className="flex items-center space-x-1 text-[10px] font-black text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                >
                    <ICONS.Bot className="w-3 h-3" />
                    <span>{scanning === review.id ? 'Scanning...' : 'AI SAFETY SCAN'}</span>
                </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {(review.status === 'Pending' || review.status === 'Flagged') && (
                  <>
                    <button
                        onClick={() => handleStatusChange(review.id, 'Rejected')}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        Reject
                    </button>
                    <button
                        onClick={() => handleStatusChange(review.id, 'Approved')}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                    >
                        Approve
                    </button>
                  </>
                )}
                {review.status === 'Approved' && (
                  <button
                      onClick={() => handleStatusChange(review.id, 'Rejected')}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                      Reject
                  </button>
                )}
                {review.status === 'Rejected' && (
                  <button
                      onClick={() => handleStatusChange(review.id, 'Approved')}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-green-50 hover:text-green-600 transition-colors"
                  >
                      Re-approve
                  </button>
                )}
                <button
                    onClick={() => handleDelete(review.id)}
                    className="px-3 py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-black hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Delete review"
                >
                    ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewModerationView;
