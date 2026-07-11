import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, FileCheck, CheckCircle, X, Send, ThumbsUp, ThumbsDown, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobApplicationApi } from '../features/jobApplication/jobApplication.api';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const offerBadge = (stage) => {
  const style = {
    OfferReleased: 'bg-blue-100 text-blue-800 border border-blue-200',
    OfferAccepted: 'bg-green-100 text-green-800 border border-green-200',
    OfferDeclined: 'bg-red-100 text-red-800 border border-red-200',
    Rejected: 'bg-red-100 text-red-800 border border-red-200',
  }[stage] || 'bg-gray-100 text-gray-700 border border-gray-200';

  const label = {
    OfferReleased: 'Sent',
    OfferAccepted: 'Accepted',
    OfferDeclined: 'Declined',
    Rejected: 'Declined',
  }[stage] || stage;

  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>{label}</span>;
};

const OfferManagement = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [offering, setOffering] = useState(null); // candidate row being offered/responded to
  const [form, setForm] = useState({ offeredDesignation: '', offeredSalary: '', offeredJoiningDate: '', offerRemark: '' });

  const [offerWarning, setOfferWarning] = useState('');
  const [shouldBypassLimit, setShouldBypassLimit] = useState(false);

  const load = async () => {
    setTableLoading(true);
    try {
      const pendingRes = await jobApplicationApi.list({ stage: 'OfferReleased', limit: 1000, search: searchTerm });
      setPendingData(pendingRes.data || []);

      const historyRes = await jobApplicationApi.list({ stage: 'OfferAccepted,OfferDeclined,Rejected', limit: 1000, search: searchTerm });
      setHistoryData(historyRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load offer data');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openOffer = (candidate) => {
    setForm({
      offeredDesignation: candidate.offeredDesignation || candidate.applyingForPost || '',
      offeredSalary: candidate.offeredSalary || '',
      offeredJoiningDate: candidate.offeredJoiningDate ? candidate.offeredJoiningDate.slice(0, 10) : '',
      offerRemark: candidate.offerRemark || '',
    });
    setOfferWarning('');
    setShouldBypassLimit(false);
    setOffering(candidate);
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const sendOffer = async (e) => {
    e.preventDefault();
    if (!form.offeredSalary || !form.offeredJoiningDate) {
      toast.error('Please fill offered salary and target joining date');
      return;
    }
    setSubmitting(true);
    try {
      await jobApplicationApi.updateStage(offering.applicationNumber, {
        stage: 'OfferReleased',
        offerStatus: 'Sent',
        offeredDesignation: form.offeredDesignation || null,
        offeredSalary: form.offeredSalary,
        offeredJoiningDate: form.offeredJoiningDate,
        offerRemark: form.offerRemark || null,
        bypassLimit: shouldBypassLimit,
      });
      toast.success('Offer sent to candidate');
      setOffering(null);
      setOfferWarning('');
      setShouldBypassLimit(false);
      load();
    } catch (err) {
      if ((err.body && err.body.isLimitExceeded) || err.message?.includes('exceed') || err.message?.includes('limit')) {
        setOfferWarning(err.message);
        setShouldBypassLimit(true);
      } else {
        toast.error(err.message || 'Failed to send offer');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const recordResponse = async (candidate, accepted) => {
    if (!window.confirm(`Mark this offer as ${accepted ? 'Accepted' : 'Declined'}?`)) return;
    try {
      const payload = {
        stage: accepted ? 'OfferAccepted' : 'OfferDeclined',
      };
      await jobApplicationApi.updateStage(candidate.applicationNumber, payload);
      toast.success(accepted ? 'Offer accepted — ready for Document Verification' : 'Offer declined');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to record response');
    }
  };

  const rows = activeTab === 'pending' ? pendingData : historyData;

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Offer Management</h2>
            <p className="mt-0.5 text-sm text-gray-500">Release offers to selected candidates and track their response</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by candidate name, phone or application no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50/50 pl-10 pr-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'pending' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('pending')}
            >
              <Send size={16} className="inline mr-2" />
              Pending Offers ({pendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('history')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Offer History ({historyData.length})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-3 text-left">App No.</th>
                <th className="px-6 py-3 text-left">Candidate</th>
                <th className="px-6 py-3 text-left">Applying For</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Offered Salary</th>
                <th className="px-6 py-3 text-left">Joining Date</th>
                <th className="px-6 py-3 text-center">{activeTab === 'pending' ? 'Action' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tableLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-gray-400 text-sm">
                    {activeTab === 'pending' ? 'No offers pending. Select a candidate first.' : 'No offer responses recorded yet.'}
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-medium text-gray-700">{c.applicationNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{c.candidateName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800">{c.offeredDesignation || c.applyingForPost || '—'}</div>
                      <div className="text-xs text-gray-400">{c.vacancyNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{c.candidateEmail || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{c.offeredSalary || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{fmtDate(c.offeredJoiningDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {activeTab === 'pending' ? (
                        !c.offerStatus ? (
                          <button onClick={() => openOffer(c)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                            <Send size={13} /> Send Offer
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => recordResponse(c, true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-green-200 text-green-700 hover:bg-green-50 rounded-lg text-xs font-semibold transition-colors">
                              <ThumbsUp size={13} /> Accepted
                            </button>
                            <button onClick={() => recordResponse(c, false)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors">
                              <ThumbsDown size={13} /> Declined
                            </button>
                          </div>
                        )
                      ) : (
                        offerBadge(c.stage)
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Offer modal */}
      {offering && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Mail size={18} /> Send Offer</h3>
                <p className="text-xs text-gray-500 mt-0.5">{offering.candidateName} · {offering.applicationNumber}</p>
              </div>
              <button onClick={() => { setOffering(null); setOfferWarning(''); setShouldBypassLimit(false); }} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={sendOffer} className="flex flex-col">
              <div className="p-6 space-y-4">
                {offerWarning && (
                  <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-sm font-semibold flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-650 animate-pulse" />
                      <span>Slots Limit Exceeded Warning</span>
                    </div>
                    <p className="text-xs text-red-600 font-medium leading-relaxed mt-1">
                      {offerWarning}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Designation</label>
                  <input type="text" name="offeredDesignation" value={form.offeredDesignation} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Offered Salary * <span className="text-xs font-normal text-gray-400">(numbers only)</span></label>
                    <input type="number" name="offeredSalary" required min="0" step="1" value={form.offeredSalary} onChange={handleChange} placeholder="e.g. 600000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Target Joining Date *</label>
                    <input type="date" name="offeredJoiningDate" required value={form.offeredJoiningDate} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Remark</label>
                  <textarea name="offerRemark" rows={2} value={form.offerRemark} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Notes for the candidate/record..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => { setOffering(null); setOfferWarning(''); setShouldBypassLimit(false); }} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 font-semibold rounded-xl text-white transition-colors ${
                    shouldBypassLimit
                      ? 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-100'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100'
                  }`}
                >
                  {submitting ? 'Sending...' : shouldBypassLimit ? 'Proceed & Send Anyway' : 'Send Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default OfferManagement;
