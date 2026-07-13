import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Briefcase, Calendar, MapPin, IndianRupee, Upload, CheckCircle, AlertCircle, Info, Award, User, Phone, Mail, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { vacancyApi } from '../vacancy/vacancy.api';
import { jobApplicationApi } from './jobApplication.api';
import { uploadFile } from '../upload/upload.api';

const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAR_REGEX = /^\d{12}$/;

const getMaxDobDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 16);
  return date.toISOString().split('T')[0];
};

const PublicApplyPage = () => {
  const { vacancyNumber } = useParams();
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  const [formData, setFormData] = useState({
    candidateName: '',
    candidateDob: '',
    candidatePhone: '',
    candidateEmail: '',
    previousCompany: '',
    previousCompanyNoticePeriod: '',
    jobExperience: '',
    lastSalary: '',
    maritalStatus: 'Single',
    presentAddress: '',
    aadharNo: '',
    candidatePhoto: null,
    candidateResume: null,
  });

  useEffect(() => {
    fetchVacancyDetails();
  }, [vacancyNumber]);

  const fetchVacancyDetails = async () => {
    try {
      setLoading(true);
      const data = await vacancyApi.getByNumber(vacancyNumber);
      if (data.approvalStatus !== 'Approved') {
        setError('This job posting is not active or is currently undergoing review.');
      } else {
        setVacancy(data);
      }
    } catch (err) {
      console.error('Error fetching public vacancy details:', err);
      setError(err.status === 404 ? 'Job posting not found.' : 'Could not retrieve job posting details. Please check the link or try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, candidatePhone: digitsOnly }));
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

    if (!PHONE_REGEX.test(formData.candidatePhone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!EMAIL_REGEX.test(formData.candidateEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (vacancy.experienceRequired && !formData.jobExperience) {
      toast.error('Professional experience is required for this vacancy');
      return;
    }

    if (formData.aadharNo && !AADHAR_REGEX.test(formData.aadharNo)) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }

    if (!formData.candidateResume) {
      toast.error('Please upload your Resume');
      return;
    }

    if (formData.candidateDob) {
      const birthDate = new Date(formData.candidateDob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 16) {
        toast.error('Candidate must be at least 16 years old');
        return;
      }
    }

    setSubmitting(true);

    try {
      let photoUrl = '';
      let resumeUrl = '';

      if (formData.candidatePhoto) {
        setUploadingPhoto(true);
        photoUrl = await uploadFile(formData.candidatePhoto);
        setUploadingPhoto(false);
      }

      setUploadingResume(true);
      resumeUrl = await uploadFile(formData.candidateResume);
      setUploadingResume(false);

      const payload = {
        vacancyNumber,
        source: 'External',
        candidateName: formData.candidateName,
        candidateDob: formData.candidateDob || null,
        candidatePhone: formData.candidatePhone,
        candidateEmail: formData.candidateEmail,
        previousCompany: formData.previousCompany || null,
        previousCompanyNoticePeriod: formData.previousCompanyNoticePeriod || null,
        jobExperience: formData.jobExperience || null,
        lastSalary: formData.lastSalary || null,
        maritalStatus: formData.maritalStatus,
        presentAddress: formData.presentAddress || null,
        aadharNo: formData.aadharNo || null,
        candidatePhoto: photoUrl || null,
        candidateResume: resumeUrl || null,
        referenceBy: 'Direct Applicant',
      };

      await jobApplicationApi.create(payload);
      setSubmitted(true);
      toast.success('Your application was submitted successfully!');
    } catch (err) {
      console.error('Submission error:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
      setUploadingPhoto(false);
      setUploadingResume(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center space-y-3">
          <span className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <span className="text-gray-500 font-semibold text-sm">Loading job details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg border border-gray-100 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Job Posting Inactive</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <div className="pt-2">
            <p className="text-xs text-gray-400">If you believe this is an error, please contact the recruiter.</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-xl border border-gray-100 text-center space-y-5 animate-in zoom-in-95 duration-300">
          <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Application Submitted!</h2>
            <p className="text-sm text-gray-500 mt-2">
              Thank you for applying. Your application for <strong className="text-indigo-600 font-bold">{vacancy?.designationName || vacancy?.vacancyNumber || vacancyNumber}</strong> has been received.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-150 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Next Steps</div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Our hiring team will review your credentials and resume. If your profile matches our requirements, we will contact you directly via the email address or phone number you provided.
            </p>
          </div>
          <div className="pt-3">
            <p className="text-xs text-gray-400">You can safely close this page now.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full space-y-8">

        {/* Job Header Info */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 bg-indigo-800/40 px-3 py-1 rounded-full border border-indigo-700/50">
              Active Opening: {vacancy.vacancyNumber}
            </span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{vacancy.vacancyName || vacancy.designationName}</h1>
            <p className="text-indigo-200 text-sm mt-1.5">{vacancy.departmentName || 'General Operations'}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-indigo-800/60 text-xs text-indigo-150">
            <div className="flex items-center space-x-2">
              <Briefcase size={14} className="text-indigo-300" />
              <span>{vacancy.designationName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin size={14} className="text-indigo-300" />
              <span>{vacancy.preferredLocation || 'Not Specified'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <IndianRupee size={14} className="text-indigo-300" />
              <span>{vacancy.salaryCriteria || 'Negotiable'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar size={14} className="text-indigo-300" />
              <span>Apply before: {vacancy.completionDate ? new Date(vacancy.completionDate).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>

        {/* Job Details (Read Only) */}
        {(vacancy.jobDescription || vacancy.preferredQualification) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 space-y-4">
            {vacancy.preferredQualification && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center mb-1">
                  <Award size={14} className="mr-1.5" /> Preferred Qualifications
                </h4>
                <p className="text-sm text-gray-700">{vacancy.preferredQualification}</p>
              </div>
            )}

            {vacancy.jobDescription && (
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center mb-1.5">
                  <Info size={14} className="mr-1.5" /> Role & Job Description
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{vacancy.jobDescription}</p>
              </div>
            )}
          </div>
        )}

        {/* Application Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-150 p-6 sm:p-8">
          <div className="pb-5 border-b border-gray-100 mb-6">
            <h2 className="text-xl font-bold text-gray-900">Job Application Form</h2>
            <p className="text-xs text-gray-500 mt-1">Please provide accurate personal and professional details.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1 flex items-center">
                    <User size={12} className="mr-1.5" /> Full Name <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="text" name="candidateName" required value={formData.candidateName} onChange={handleInputChange} placeholder="Enter your first and last name" className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1 flex items-center">
                    <Calendar size={12} className="mr-1.5" /> Date of Birth <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="date" name="candidateDob" required max={getMaxDobDate()} value={formData.candidateDob} onChange={handleInputChange} className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1 flex items-center">
                    <Phone size={12} className="mr-1.5" /> Phone Number <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="tel" name="candidatePhone" required inputMode="numeric" pattern="\d{10}" maxLength={10} title="Enter a valid 10-digit phone number" value={formData.candidatePhone} onChange={handlePhoneChange} placeholder="e.g. 9876543210" className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1 flex items-center">
                    <Mail size={12} className="mr-1.5" /> Email Address <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="email" name="candidateEmail" required title="Enter a valid email address" value={formData.candidateEmail} onChange={handleInputChange} placeholder="e.g. name@example.com" className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Marital Status</label>
                  <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white text-gray-850 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Aadhaar Number</label>
                  <input type="text" name="aadharNo" inputMode="numeric" pattern="\d{12}" maxLength={12} title="Enter a valid 12-digit Aadhaar number" value={formData.aadharNo} onChange={handleAadharChange} placeholder="12 digit Aadhaar Number" className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Present Address</label>
                <textarea name="presentAddress" rows={2} value={formData.presentAddress} onChange={handleInputChange} placeholder="Enter your current residential address" className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Professional Details */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Professional Experience</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Last / Current Employer</label>
                  <input type="text" name="previousCompany" value={formData.previousCompany} onChange={handleInputChange} placeholder="e.g. Tech Solutions Pvt Ltd" className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Total Experience (in Years){vacancy.experienceRequired && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input type="number" step="0.1" name="jobExperience" required={vacancy.experienceRequired} value={formData.jobExperience} onChange={handleInputChange} placeholder="e.g. 3.5" className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Notice Period (in Days)</label>
                  <input type="number" name="previousCompanyNoticePeriod" value={formData.previousCompanyNoticePeriod} onChange={handleInputChange} placeholder="e.g. 30" className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Last Drawn CTC / Salary</label>
                  <input type="text" name="lastSalary" value={formData.lastSalary} onChange={handleInputChange} placeholder="e.g. 6,00,000 LPA" className="w-full border border-gray-250 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>

            {/* File Uploads */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Attachments</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Resume Upload * (PDF/DOCX)</label>
                  <div className="relative border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white">
                    <input type="file" required accept=".pdf,.doc,.docx" onChange={(e) => handleFileChange(e, 'candidateResume')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload size={20} className="text-gray-400 mb-1" />
                    <span className="text-xs font-bold text-gray-700">{formData.candidateResume ? formData.candidateResume.name : 'Choose file...'}</span>
                    <span className="text-[10px] text-gray-400 mt-1">PDF or Word, max 10MB</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-755 uppercase tracking-wider mb-1">Passport Photo (JPG/PNG)</label>
                  <div className="relative border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white">
                    <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'candidatePhoto')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload size={20} className="text-gray-400 mb-1" />
                    <span className="text-xs font-bold text-gray-700">{formData.candidatePhoto ? formData.candidatePhoto.name : 'Choose file...'}</span>
                    <span className="text-[10px] text-gray-400 mt-1">Images, max 10MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Action */}
            <div className="pt-4 flex justify-end">
              <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-colors flex items-center" disabled={submitting || uploadingPhoto || uploadingResume}>
                {submitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                    {uploadingPhoto ? 'Uploading Photo...' : uploadingResume ? 'Uploading Resume...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <FileText size={16} className="mr-2" />
                    Submit Application
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

export default PublicApplyPage;
