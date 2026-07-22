import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Upload, CheckCircle, AlertCircle, Info, ShieldCheck, User, Briefcase, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { decodeAppNumber } from '../lib/token';
import { jobApplicationApi } from '../features/jobApplication/jobApplication.api';
import { vacancyApi } from '../features/vacancy/vacancy.api';
import { uploadFile } from '../features/upload/upload.api';

const AADHAR_REGEX = /^\d{12}$/;

const PublicDocumentUpload = () => {
  const { token } = useParams();
  const [appNumber, setAppNumber] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({}); // field -> boolean (uploaded)
  const [uploadProgress, setUploadProgress] = useState({}); // field -> string (status)

  const [formData, setFormData] = useState({
    aadharNo: '',
    candidatePhoto: null,
    candidateResume: null,
    experienceLetter: null,
    salarySlip: null,
    relievingLetter: null,
  });

  useEffect(() => {
    const decoded = decodeAppNumber(token);
    if (!decoded) {
      setError('Invalid or expired upload link.');
      setLoading(false);
      return;
    }
    setAppNumber(decoded);
    fetchDetails(decoded);
  }, [token]);

  const fetchDetails = async (applicationNumber) => {
    try {
      setLoading(true);
      const app = await jobApplicationApi.getByNumber(applicationNumber);
      if (!app) {
        setError('Application details not found.');
        return;
      }
      setApplication(app);
      setFormData((prev) => ({
        ...prev,
        aadharNo: app.aadharNo || '',
      }));
    } catch (err) {
      console.error('Error fetching application for document upload:', err);
      setError('Could not retrieve application details. Please verify your link.');
    } finally {
      setLoading(false);
    }
  };

  const handleAadharChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 12);
    setFormData((prev) => ({ ...prev, aadharNo: digitsOnly }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setFormData((prev) => ({ ...prev, [field]: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!AADHAR_REGEX.test(formData.aadharNo)) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }

    if (!formData.candidatePhoto) {
      toast.error('Please upload your Passport Photo');
      return;
    }

    if (!formData.candidateResume) {
      toast.error('Please upload your Resume');
      return;
    }

    const expRequired = application.experienceRequired;

    if (expRequired) {
      if (!formData.experienceLetter) {
        toast.error('Experience Letter is required');
        return;
      }
      if (!formData.salarySlip) {
        toast.error('Salary Slip is required');
        return;
      }
      if (!formData.relievingLetter) {
        toast.error('Relieving Letter is required');
        return;
      }
    }

    setSubmitting(true);

    try {
      // 1. Upload all files
      const uploadField = async (field, file) => {
        if (!file) return null;
        setUploadProgress((prev) => ({ ...prev, [field]: 'Uploading...' }));
        try {
          const url = await uploadFile(file);
          setUploadProgress((prev) => ({ ...prev, [field]: 'Done' }));
          return url;
        } catch (err) {
          setUploadProgress((prev) => ({ ...prev, [field]: 'Failed' }));
          throw new Error(`Failed to upload ${field}`);
        }
      };

      const photoUrl = await uploadField('candidatePhoto', formData.candidatePhoto);
      const resumeUrl = await uploadField('candidateResume', formData.candidateResume);

      let expLetterUrl = null;
      let salarySlipUrl = null;
      let relievingLetterUrl = null;

      if (expRequired) {
        expLetterUrl = await uploadField('experienceLetter', formData.experienceLetter);
        salarySlipUrl = await uploadField('salarySlip', formData.salarySlip);
        relievingLetterUrl = await uploadField('relievingLetter', formData.relievingLetter);
      }

      // 2. Prepare Checklist & Update Stage
      const checklist = {
        aadhar: true,
        photo: true,
        resume: true,
      };

      if (expRequired) {
        checklist.experienceLetter = true;
        checklist.salarySlip = true;
        checklist.relievingLetter = true;
      }

      const patch = {
        aadharNo: formData.aadharNo,
        candidatePhoto: photoUrl,
        candidateResume: resumeUrl,
        documentChecklist: checklist,
        stage: 'OfferAccepted', // Move to document verification stage
      };

      if (expRequired) {
        patch.experienceLetter = expLetterUrl;
        patch.salarySlip = salarySlipUrl;
        patch.relievingLetter = relievingLetterUrl;
      }

      await jobApplicationApi.updateStage(appNumber, patch);
      setSubmitted(true);
      toast.success('Documents uploaded successfully!');
    } catch (err) {
      console.error('Submit docs error:', err);
      toast.error(err.message || 'Failed to submit documents. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center space-y-3">
          <span className="w-12 h-12 rounded-full border-4 border-indigo-650 border-t-transparent animate-spin" />
          <span className="text-gray-550 font-semibold text-sm">Loading details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg border border-gray-100 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Link Inactive</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <div className="pt-2">
            <p className="text-xs text-gray-400">If you believe this is an error, please reach out to your HR contact.</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-xl border border-gray-100 text-center space-y-5">
          <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Documents Submitted!</h2>
            <p className="text-sm text-gray-500 mt-2">
              Thank you, <strong className="text-indigo-600">{application?.candidateName}</strong>. Your documents have been successfully uploaded and sent for verification.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-150 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" /> Next Stage
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              The HR team will review your submitted credentials. You will be notified of the verification outcome and the next steps regarding your onboarding.
            </p>
          </div>
          <div className="pt-3">
            <p className="text-xs text-gray-400">You may now close this browser window.</p>
          </div>
        </div>
      </div>
    );
  }

  const expRequired = application?.experienceRequired;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        
        {/* Candidate & Post Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 bg-indigo-800/40 px-3 py-1 rounded-full border border-indigo-700/50">
              Document Verification Portal
            </span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Upload Joining Documents</h1>
            <p className="text-indigo-200 text-sm mt-1.5">Candidate: <strong className="text-white">{application?.candidateName}</strong></p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-indigo-800/60 text-xs text-indigo-150">
            <div className="flex items-center space-x-2">
              <Briefcase size={14} className="text-indigo-300 animate-pulse" />
              <span>Post Offered: <strong className="text-white">{application?.offeredDesignation || application?.applyingForPost}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <FileCheck size={14} className="text-indigo-300" />
              <span>Application No: <strong className="text-white">{application?.applicationNumber}</strong></span>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-150 p-6 sm:p-8">
          <div className="pb-5 border-b border-gray-100 mb-6">
            <h2 className="text-xl font-bold text-gray-900">Verification Checklist</h2>
            <p className="text-xs text-gray-500 mt-1">
              Please upload all required files. Every field in this form is <strong className="text-red-500">required</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identity Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Identity Details</h3>
              <div>
                <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1 flex items-center">
                  <User size={12} className="mr-1.5" /> Aadhaar Number <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  name="aadharNo"
                  required
                  inputMode="numeric"
                  pattern="\d{12}"
                  maxLength={12}
                  value={formData.aadharNo}
                  onChange={handleAadharChange}
                  placeholder="Enter 12-digit Aadhaar Number"
                  className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Core Attachments */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Core Attachments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1">Passport Photo * (JPG/PNG)</label>
                  <div className="relative border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white">
                    <input type="file" required accept=".jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'candidatePhoto')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload size={20} className="text-gray-400 mb-1" />
                    <span className="text-xs font-bold text-gray-700">{formData.candidatePhoto ? formData.candidatePhoto.name : 'Choose image...'}</span>
                    <span className="text-[10px] text-gray-400 mt-1">Image format, max 10MB</span>
                  </div>
                  {uploadProgress['candidatePhoto'] && <span className="text-[10px] font-bold text-indigo-650 mt-1 block">{uploadProgress['candidatePhoto']}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider mb-1">Resume Upload * (PDF/DOCX)</label>
                  <div className="relative border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white">
                    <input type="file" required accept=".pdf,.doc,.docx" onChange={(e) => handleFileChange(e, 'candidateResume')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload size={20} className="text-gray-400 mb-1" />
                    <span className="text-xs font-bold text-gray-700">{formData.candidateResume ? formData.candidateResume.name : 'Choose file...'}</span>
                    <span className="text-[10px] text-gray-400 mt-1">PDF or Word, max 10MB</span>
                  </div>
                  {uploadProgress['candidateResume'] && <span className="text-[10px] font-bold text-indigo-650 mt-1 block">{uploadProgress['candidateResume']}</span>}
                </div>
              </div>
            </div>

            {/* Experience-based Attachments */}
            {expRequired && (
              <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Experience Attachments</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-850 border border-amber-200">Required for Experienced Post</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Experience Letter *</label>
                    <div className="relative border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white min-h-[110px]">
                      <input type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'experienceLetter')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <Upload size={18} className="text-gray-400 mb-1" />
                      <span className="text-[11px] font-bold text-gray-700 text-center line-clamp-2">{formData.experienceLetter ? formData.experienceLetter.name : 'Choose file...'}</span>
                    </div>
                    {uploadProgress['experienceLetter'] && <span className="text-[10px] font-bold text-indigo-650 mt-1 block">{uploadProgress['experienceLetter']}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Salary Slip *</label>
                    <div className="relative border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white min-h-[110px]">
                      <input type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'salarySlip')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <Upload size={18} className="text-gray-400 mb-1" />
                      <span className="text-[11px] font-bold text-gray-700 text-center line-clamp-2">{formData.salarySlip ? formData.salarySlip.name : 'Choose file...'}</span>
                    </div>
                    {uploadProgress['salarySlip'] && <span className="text-[10px] font-bold text-indigo-650 mt-1 block">{uploadProgress['salarySlip']}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Relieving Letter *</label>
                    <div className="relative border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white min-h-[110px]">
                      <input type="file" required accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'relievingLetter')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <Upload size={18} className="text-gray-400 mb-1" />
                      <span className="text-[11px] font-bold text-gray-700 text-center line-clamp-2">{formData.relievingLetter ? formData.relievingLetter.name : 'Choose file...'}</span>
                    </div>
                    {uploadProgress['relievingLetter'] && <span className="text-[10px] font-bold text-indigo-650 mt-1 block">{uploadProgress['relievingLetter']}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Submission Action */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-colors flex items-center disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                    Uploading Documents...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    Submit for Verification
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default PublicDocumentUpload;
