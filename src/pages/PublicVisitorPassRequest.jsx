import React, { useState, useEffect } from "react";
import {
  Ticket,
  User,
  Users,
  Building,
  Phone,
  Car,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  Send,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";

const PublicVisitorPassRequest = () => {
  const [departmentsList, setDepartmentsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedPass, setSubmittedPass] = useState(null);

  const [form, setForm] = useState({
    visitorName: "",
    visitorPhone: "",
    visitorCompany: "",
    hostName: "",
    departmentId: "",
    purpose: "",
    idProofType: "Aadhar",
    idProofNumber: "",
    vehicleNumber: "",
    expectedOutTime: new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16),
    expectedInTime: "",
    remarks: "",
  });

  useEffect(() => {
    // Fetch departments list for host department selection
    api
      .get("/departments")
      .then((res) => {
        if (res.success) setDepartmentsList(res.data || []);
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.visitorName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!form.purpose.trim()) {
      toast.error("Please enter the purpose of your visit");
      return;
    }

    if (!form.expectedOutTime) {
      toast.error("Please specify your expected arrival/exit date and time");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
      };

      const res = await api.post("/gate-passes/public-visitor-request", payload);

      if (res.success) {
        toast.success(res.message || "Visitor pass request submitted!");
        setSubmittedPass(res.data);
      } else {
        toast.error(res.message || "Failed to submit request");
      }
    } catch (err) {
      console.error("Public visitor request error:", err);
      toast.error(err.message || "Something went wrong while submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedPass(null);
    setForm({
      visitorName: "",
      visitorPhone: "",
      visitorCompany: "",
      hostName: "",
      departmentId: "",
      purpose: "",
      idProofType: "Aadhar",
      idProofNumber: "",
      vehicleNumber: "",
      expectedOutTime: new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16),
      expectedInTime: "",
      remarks: "",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Soft Background Accents matching Login/App theme */}
      <div className="absolute top-[5%] left-[5%] w-96 h-96 bg-indigo-200 rounded-full blur-[140px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-[5%] right-[5%] w-96 h-96 bg-purple-200 rounded-full blur-[140px] opacity-40 pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="relative z-10 max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-gray-200/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-100">
            <Ticket className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                HR FMS
              </span>
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Visitor Gate Pass Portal
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
          <ShieldCheck size={15} /> External Visitor Portal
        </span>
      </header>

      {/* Main Content Box */}
      <main className="relative z-10 max-w-4xl mx-auto w-full my-8">
        {submittedPass ? (
          /* Confirmation Receipt View */
          <div className="relative bg-white rounded-2xl p-8 sm:p-10 shadow-2xl border border-gray-100 overflow-hidden text-center space-y-6 animate-fadeIn">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                Visitor Request Submitted!
              </h2>
              <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto font-medium">
                Your entry request has been sent to HR for approval. Please present your Pass Number upon arrival at the security gate.
              </p>
            </div>

            {/* Ticket Badge Card */}
            <div className="max-w-md mx-auto bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-2 border-indigo-200 rounded-2xl p-6 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pass Number</span>
                <span className="text-xl font-black text-indigo-700 tracking-wider font-mono">
                  {submittedPass.passNumber}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-500 font-medium">Visitor Name</p>
                  <p className="font-bold text-gray-900 text-sm">{submittedPass.visitorName}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Phone</p>
                  <p className="font-semibold text-gray-800">{submittedPass.visitorPhone || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Host Person</p>
                  <p className="font-semibold text-gray-800">{submittedPass.hostName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Status</p>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 mt-0.5">
                    Pending HR Approval
                  </span>
                </div>
              </div>

              <div className="border-t border-indigo-100 pt-3 text-[11px] text-gray-600 flex items-start gap-2">
                <Sparkles size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                <span>Show this pass number to gate security upon entry.</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={resetForm}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-6 py-3 rounded-xl transition duration-200 shadow-lg shadow-indigo-100 cursor-pointer text-sm"
              >
                Submit Another Request
              </button>
            </div>
          </div>
        ) : (
          /* Visitor Application Form Card */
          <div className="relative bg-white rounded-2xl p-6 sm:p-10 shadow-2xl border border-gray-100 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

            <div className="mb-8 border-b border-gray-100 pb-5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                <Users className="text-indigo-600" size={28} />
                <span>Visitor Gate Pass Request</span>
              </h2>
              <p className="text-gray-500 text-sm mt-1 font-medium">
                Please provide your visit details. Your request will be routed directly to HR for approval.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Visitor Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                  <User size={14} /> Visitor Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="visitorName"
                      value={form.visitorName}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contact Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3 text-gray-400" />
                      <input
                        type="tel"
                        name="visitorPhone"
                        value={form.visitorPhone}
                        onChange={handleChange}
                        placeholder="Mobile Number"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Organization / Company</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      name="visitorCompany"
                      value={form.visitorCompany}
                      onChange={handleChange}
                      placeholder="Company Name (if applicable)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Host & Department */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                  <Building size={14} /> Host & Destination
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Host Employee / Person to Visit</label>
                    <input
                      type="text"
                      name="hostName"
                      value={form.hostName}
                      onChange={handleChange}
                      placeholder="Person's Name"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Target Department</label>
                    <select
                      name="departmentId"
                      value={form.departmentId}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-medium bg-white"
                    >
                      <option value="">-- Choose Department --</option>
                      {departmentsList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Visit Particulars */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                  <FileText size={14} /> Visit Particulars
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Purpose of Visit <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="purpose"
                    value={form.purpose}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Brief description of your visit purpose..."
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">ID Proof Type</label>
                    <select
                      name="idProofType"
                      value={form.idProofType}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-medium bg-white"
                    >
                      <option value="Aadhar">Aadhar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Passport">Passport</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">ID Proof Number</label>
                    <input
                      type="text"
                      name="idProofNumber"
                      value={form.idProofNumber}
                      onChange={handleChange}
                      placeholder="e.g. XXXX-XXXX-XXXX"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Expected Arrival / Out Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="expectedOutTime"
                      value={form.expectedOutTime}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Vehicle Number</label>
                    <div className="relative">
                      <Car size={16} className="absolute left-3.5 top-3 text-gray-400" />
                      <input
                        type="text"
                        name="vehicleNumber"
                        value={form.vehicleNumber}
                        onChange={handleChange}
                        placeholder="e.g. MH 12 AB 1234"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-gray-900 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-100 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-base"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Submit Visitor Pass Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs font-medium text-gray-500">
        Powered by{" "}
        <a
          href="https://www.botivate.in"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 font-semibold underline"
        >
          Botivate
        </a>
      </footer>
    </div>
  );
};

export default PublicVisitorPassRequest;
