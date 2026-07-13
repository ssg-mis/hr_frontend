import React, { useState, useEffect } from 'react';
import { Search, CreditCard, IndianRupee, Calendar, Filter, Eye, Plus, X, ArrowUpRight, ArrowDownRight, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const groupPaymentsByDay = (payments) => {
    const groups = {};
    payments.forEach(p => {
        const dateStr = new Date(p.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        if (!groups[dateStr]) {
            groups[dateStr] = {
                date: dateStr,
                paidAt: p.paidAt,
                installments: [],
                totalAmount: 0
            };
        }
        groups[dateStr].installments.push(p.installmentNo);
        groups[dateStr].totalAmount += Number(p.amountPaid || 0);
    });
    
    return Object.values(groups).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
};

const formatInstallments = (list) => {
    if (list.length === 1) return `Installment #${list[0]}`;
    const sorted = [...list].sort((a, b) => a - b);
    let isContiguous = true;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i-1] + 1) {
            isContiguous = false;
            break;
        }
    }
    if (isContiguous) {
        return `${sorted.length} Installments (#${sorted[0]} - #${sorted[sorted.length - 1]})`;
    }
    return `${sorted.length} Installments (#${sorted.join(', #')})`;
};

const EMIManagement = () => {
    const [employeeList, setEmployeeList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEmi, setSelectedEmi] = useState(null);
    const [selectedEmiPayments, setSelectedEmiPayments] = useState([]);
    const [emiData, setEmiData] = useState([]);
    const [paymentsData, setPaymentsData] = useState([]);
    const [activeTab, setActiveTab] = useState('activeLoans');
    const [loading, setLoading] = useState(false);

    const [newEmiFormData, setNewEmiFormData] = useState({
        empId: '',
        name: '',
        employeeId: '',
        loanType: '',
        loanAmount: '',
        emiAmount: '',
        interestRate: '0.00',
        tenure: ''
    });

    const [updateFormData, setUpdateFormData] = useState({
        paidEmis: 0,
        status: ''
    });

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/employees/active');
            if (res.success) {
                setEmployeeList(res.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch active employees:", error);
        }
    };

    const fetchEmis = async () => {
        setLoading(true);
        try {
            const res = await api.get('/emis');
            if (res.success) {
                setEmiData(res.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch EMIs:", error);
            toast.error("Failed to fetch EMIs");
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            const res = await api.get('/emis/payments');
            if (res.success) {
                setPaymentsData(res.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch payments:", error);
        }
    };

    useEffect(() => {
        fetchEmployees();
        fetchEmis();
        fetchPayments();
    }, []);

    const stats = [
        { label: 'Total active Loans', value: `₹${emiData.filter(e => e.status === 'Active').reduce((sum, e) => sum + Number(e.loanAmount || 0), 0).toLocaleString()}`, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Monthly EMI Collection', value: `₹${emiData.filter(e => e.status === 'Active').reduce((sum, e) => sum + Number(e.emiAmount || 0), 0).toLocaleString()}`, icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Pending EMIs', value: emiData.reduce((sum, e) => sum + (Number(e.tenure || 0) - Number(e.paidEmis || 0)), 0).toString(), icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-100' },
        { label: 'Completed Loans', value: emiData.filter(e => e.status === 'Completed').length.toString(), icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    ];

    const activeLoans = emiData.filter(item =>
        item.status !== 'Completed' && (
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.loanType.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const completedLoans = emiData.filter(item =>
        item.status === 'Completed' && (
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.loanType.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        setNewEmiFormData(prev => {
            const updated = { ...prev, [name]: value };
            const loanAmount = parseFloat(updated.loanAmount) || 0;

            if (name === 'empId') {
                const employee = employeeList.find(emp => emp.employee_code === value);
                updated.name = employee ? employee.name_as_per_aadhar : '';
                updated.employeeId = employee ? employee.employee_id : '';
            } else if (name === 'name') {
                const employee = employeeList.find(emp => emp.name_as_per_aadhar === value);
                updated.empId = employee ? employee.employee_code : '';
                updated.employeeId = employee ? employee.employee_id : '';
            } else if (name === 'loanAmount') {
                // If loanAmount changes, update emiAmount or tenure if they exist
                if (updated.tenure && parseFloat(updated.tenure) > 0) {
                    updated.emiAmount = Math.round(loanAmount / parseInt(updated.tenure));
                } else if (updated.emiAmount && parseFloat(updated.emiAmount) > 0) {
                    updated.tenure = Math.ceil(loanAmount / parseFloat(updated.emiAmount));
                }
            } else if (name === 'emiAmount') {
                // Emi Amount -> Tenure
                if (loanAmount > 0 && parseFloat(value) > 0) {
                    updated.tenure = Math.ceil(loanAmount / parseFloat(value));
                }
            } else if (name === 'tenure') {
                // Tenure -> Emi Amount
                if (loanAmount > 0 && parseInt(value) > 0) {
                    updated.emiAmount = Math.round(loanAmount / parseInt(value));
                }
            }
            return updated;
        });
    };

    const handleAddEmi = async (e) => {
        e.preventDefault();
        if (Number(newEmiFormData.emiAmount) > Number(newEmiFormData.loanAmount)) {
            toast.error("EMI amount cannot be greater than the loan amount!");
            return;
        }
        try {
            const payload = {
                employeeId: Number(newEmiFormData.employeeId),
                loanType: newEmiFormData.loanType,
                loanAmount: Number(newEmiFormData.loanAmount),
                emiAmount: Number(newEmiFormData.emiAmount),
                interestRate: Number(newEmiFormData.interestRate || 0),
                tenure: Number(newEmiFormData.tenure),
                status: 'Active'
            };
            const res = await api.post('/emis', payload);
            if (res.success) {
                toast.success("EMI Loan Entry added successfully!");
                setShowAddModal(false);
                setNewEmiFormData({ empId: '', name: '', employeeId: '', loanType: '', loanAmount: '', emiAmount: '', interestRate: '0.00', tenure: '' });
                fetchEmis();
                fetchPayments();
            }
        } catch (error) {
            console.error("Failed to add EMI:", error);
            toast.error(error.message || "Failed to add EMI");
        }
    };

    const handleEditClick = (emi) => {
        setSelectedEmi(emi);
        setUpdateFormData({
            paidEmis: emi.paidEmis,
            status: emi.status
        });
        setShowUpdateModal(true);
    };

    const handleViewClick = async (emi) => {
        setSelectedEmi(emi);
        setShowViewModal(true);
        setSelectedEmiPayments([]);
        try {
            const res = await api.get(`/emis/${emi.id}/payments`);
            if (res.success) {
                setSelectedEmiPayments(res.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch EMI payments:", error);
            toast.error("Failed to fetch payment details");
        }
    };

    const handleUpdateEmi = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                paidEmis: Number(updateFormData.paidEmis),
            };
            const res = await api.patch(`/emis/${selectedEmi.id}`, payload);
            if (res.success) {
                toast.success("EMI updated successfully!");
                setShowUpdateModal(false);
                fetchEmis();
                fetchPayments();
            }
        } catch (error) {
            console.error("Failed to update EMI:", error);
            toast.error(error.message || "Failed to update EMI");
        }
    };

    return (
        <div className="space-y-6 page-content p-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('activeLoans')}
                        className={`py-2 px-4 font-semibold text-sm rounded-lg transition-all ${
                            activeTab === 'activeLoans'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        Active Loans
                    </button>
                    <button
                        onClick={() => setActiveTab('completedLoans')}
                        className={`py-2 px-4 font-semibold text-sm rounded-lg transition-all ${
                            activeTab === 'completedLoans'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        Completed Loans
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`py-2 px-4 font-semibold text-sm rounded-lg transition-all ${
                            activeTab === 'payments'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        Payment History
                    </button>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                >
                    <Plus size={18} className="mr-2" />
                    New EMI Entry
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center transition-all hover:shadow-md">
                            <div className={`p-3 rounded-xl ${stat.bg} mr-4`}>
                                <Icon size={24} className={stat.color} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                                <h3 className="text-xl font-bold text-gray-800">{stat.value}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, ID or loan type..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {activeTab !== 'payments' ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Details</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {(activeTab === 'activeLoans' ? activeLoans : completedLoans).map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3">
                                                    {item.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                                    <div className="text-xs text-gray-500">{item.empId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 font-medium">
                                                {item.loanType} <span className="text-xs text-gray-400 font-normal">@ {item.interestRate}%</span>
                                            </div>
                                            <div className="text-xs text-gray-500">Total: ₹{Number(item.loanAmount || 0).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">₹{Number(item.emiAmount || 0).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{item.tenure} Months</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1 max-w-[100px]">
                                                <div
                                                    className={`h-2 rounded-full ${item.status === 'Completed' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                                    style={{ width: `${item.status === 'Completed' ? 100 : (Number(item.paidEmis || 0) / Number(item.tenure || 1)) * 100}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-[10px] text-gray-500">
                                                {item.status === 'Completed' ? `Completed (${item.tenure}/${item.tenure})` : `${item.paidEmis}/${item.tenure} EMIs Paid`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs font-semibold inline-flex px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewClick(item)}
                                                    className="text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEditClick(item)}
                                                    className="text-amber-600 hover:text-amber-800 transition-colors p-2 rounded-lg hover:bg-amber-50"
                                                    title="Update EMI"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Details</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installment</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Date & Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {paymentsData.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-gray-400 text-sm">
                                            No payment records found.
                                        </td>
                                    </tr>
                                ) : (
                                    paymentsData.filter(p => 
                                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        p.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        p.loanType.toLowerCase().includes(searchTerm.toLowerCase())
                                    ).map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3 text-sm">
                                                        {payment.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{payment.name}</div>
                                                        <div className="text-xs text-gray-500">{payment.empId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {payment.loanType}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                Installment #{payment.installmentNo}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                                                ₹{Number(payment.amountPaid).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* New EMI Entry Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-indigo-50/30">
                            <h2 className="text-xl font-bold text-gray-800">New EMI Entry</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddEmi} className="p-6 space-y-4 overflow-y-auto pr-1 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
                                    <select
                                        name="empId"
                                        value={newEmiFormData.empId}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Select ID</option>
                                        {employeeList.map(emp => (
                                            <option key={emp.employee_id} value={emp.employee_code}>{emp.employee_code}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name *</label>
                                    <select
                                        name="name"
                                        value={newEmiFormData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Select Name</option>
                                        {employeeList.map(emp => (
                                            <option key={emp.employee_id} value={emp.name_as_per_aadhar}>{emp.name_as_per_aadhar}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Type *</label>
                                <select name="loanType" value={newEmiFormData.loanType} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">Select Type</option>
                                    <option value="Personal Loan">Personal Loan</option>
                                    <option value="Home Loan">Home Loan</option>
                                    <option value="Car Loan">Car Loan</option>
                                    <option value="Advanced Salary">Advanced Salary</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount *</label>
                                    <input type="number" name="loanAmount" value={newEmiFormData.loanAmount} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="50000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">EMI Amount *</label>
                                    <input type="number" name="emiAmount" value={newEmiFormData.emiAmount} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="5000" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%) *</label>
                                <input type="number" step="0.01" name="interestRate" value={newEmiFormData.interestRate} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="8.50" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tenure (Months) *</label>
                                <input type="number" name="tenure" value={newEmiFormData.tenure} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="12" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md">Add Entry</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View EMI Details Modal */}
            {showViewModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-indigo-50/30">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">EMI Details</h2>
                                <p className="text-xs text-gray-500">{selectedEmi?.name} ({selectedEmi?.empId})</p>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto pr-1 flex-1">
                            {/* Loan Info Grid */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <div>
                                    <span className="text-xs text-gray-400 font-semibold uppercase">Loan Type</span>
                                    <p className="text-sm font-bold text-gray-800">{selectedEmi?.loanType}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400 font-semibold uppercase">Interest Rate</span>
                                    <p className="text-sm font-bold text-gray-800">{selectedEmi?.interestRate}%</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400 font-semibold uppercase">Loan Amount</span>
                                    <p className="text-sm font-bold text-gray-800">₹{Number(selectedEmi?.loanAmount || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400 font-semibold uppercase">Monthly EMI</span>
                                    <p className="text-sm font-bold text-gray-800">₹{Number(selectedEmi?.emiAmount || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400 font-semibold uppercase">Tenure</span>
                                    <p className="text-sm font-bold text-gray-800">{selectedEmi?.tenure} Months</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400 font-semibold uppercase">Status</span>
                                    <p className="text-sm font-bold text-gray-800">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                                            selectedEmi?.status === 'Completed' 
                                                ? 'bg-green-100 text-green-800' 
                                                : selectedEmi?.status === 'Paused'
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {selectedEmi?.status}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Repayment History list */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Calendar size={16} className="text-indigo-600" />
                                    Repayment Installment Logs ({selectedEmi?.paidEmis}/{selectedEmi?.tenure})
                                </h3>
                                {selectedEmiPayments.length === 0 ? (
                                    <div className="text-center py-4 border border-dashed border-gray-200 rounded-lg text-gray-400 text-xs">
                                        No payments logged yet.
                                    </div>
                                ) : (
                                    <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-100">
                                        {groupPaymentsByDay(selectedEmiPayments).map((group, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 text-xs bg-white hover:bg-gray-50">
                                                <div>
                                                    <p className="font-semibold text-gray-700">{formatInstallments(group.installments)}</p>
                                                    <p className="text-[10px] text-gray-400">Paid on: {group.date}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-emerald-600">+ ₹{group.totalAmount.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex pt-4">
                                <button type="button" onClick={() => setShowViewModal(false)} className="w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-sm">
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Update EMI Modal */}
            {showUpdateModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-indigo-50/30">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Update EMI</h2>
                                <p className="text-xs text-gray-500">{selectedEmi?.name} ({selectedEmi?.empId})</p>
                            </div>
                            <button onClick={() => setShowUpdateModal(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateEmi} className="p-6 space-y-4 overflow-y-auto pr-1 flex-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paid EMIs (Current: {selectedEmi?.paidEmis}/{selectedEmi?.tenure})</label>
                                <input
                                    type="number"
                                    max={selectedEmi?.tenure}
                                    min="0"
                                    value={updateFormData.paidEmis}
                                    onChange={(e) => setUpdateFormData({ ...updateFormData, paidEmis: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            {/* Status dropdown removed as status is managed automatically */}
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowUpdateModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md">Update EMI</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EMIManagement;
