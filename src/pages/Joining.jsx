import React, { useEffect, useState } from 'react';
import { Search, Users, CheckCircle, UserPlus, BadgeCheck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobApplicationApi } from '../features/jobApplication/jobApplication.api';
import JoiningFormModal from '../features/joining-form/JoiningFormModal';
import JoiningFormSamplePreview from '../features/joining-form/JoiningFormSamplePreview';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const Joining = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const [joining, setJoining] = useState(null); // candidate row whose joining form is open
  const [showFormat, setShowFormat] = useState(false); // sample joining form preview

  const load = async () => {
    setTableLoading(true);
    try {
      const res = await jobApplicationApi.list({ stage: 'Verified', limit: 1000, search: searchTerm });
      setPendingData(res.data || []);

      const historyRes = await jobApplicationApi.list({ stage: 'Hired', limit: 1000, search: searchTerm });
      setHistoryData(historyRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load joining data');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const closeFormat = React.useCallback(() => setShowFormat(false), []);
  const rows = activeTab === 'pending' ? pendingData : historyData;

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Joining</h2>
            <p className="mt-0.5 text-sm text-gray-500">Confirm joining for verified candidates and onboard them</p>
          </div>
          <button onClick={() => setShowFormat(true)} className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-sm font-semibold shrink-0">
            <FileText size={16} /> Preview Format
          </button>
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
              <UserPlus size={16} className="inline mr-2" />
              Ready to Join ({pendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('history')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Onboarded ({historyData.length})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-3 text-left">App No.</th>
                <th className="px-6 py-3 text-left">Candidate</th>
                <th className="px-6 py-3 text-left">Designation</th>
                <th className="px-6 py-3 text-left">Phone</th>
                {activeTab === 'pending' ? (
                  <>
                    <th className="px-6 py-3 text-left">Target Joining Date</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left">Employee Code</th>
                    <th className="px-6 py-3 text-left">Joined On</th>
                    <th className="px-6 py-3 text-center">Joining Form</th>
                  </>
                )}
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
                    {activeTab === 'pending'
                      ? 'No candidates ready to join. Complete Document Verification first.'
                      : 'No candidates onboarded yet.'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{c.candidatePhone}</td>
                    {activeTab === 'pending' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{fmtDate(c.offeredJoiningDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button onClick={() => setJoining(c)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                            <UserPlus size={13} /> Joining Form
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                            <BadgeCheck size={12} /> {c.employeeCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{fmtDate(c.joiningDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button onClick={() => setJoining(c)} className="inline-flex items-center gap-1 px-3 py-1.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition-colors">
                            <FileText size={13} /> View / Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {joining && (
        <JoiningFormModal application={joining} onClose={() => setJoining(null)} onDone={load} />
      )}
      {showFormat && <JoiningFormSamplePreview onClose={closeFormat} />}
    </div>
  );
};

export default Joining;
