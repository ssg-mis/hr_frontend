import React, { useState } from 'react';
import { Search, CreditCard, DollarSign, Calendar, Filter, Eye, Plus, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const EMIManagement = () => {
    const employeeList = [
        { id: 'EMP001', name: 'John Doe' },
        { id: 'EMP002', name: 'Jane Smith' },
        { id: 'EMP003', name: 'Michael Brown' },
        { id: 'EMP004', name: 'Sarah Wilson' },
        { id: 'EMP005', name: 'David Lee' },
        { id: 'EMP006', name: 'Emily Chen' },
        { id: 'EMP007', name: 'Robert Taylor' },
    ];

    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedEmi, setSelectedEmi] = useState(null);

    // Mock initial data
    const [emiData, setEmiData] = useState([
        { id: 'EMI001', empId: 'EMP001', name: 'John Doe', loanType: 'Personal Loan', loanAmount: 50000, emiAmount: 5000, tenure: 12, paidEmis: 4, remainingEmis: 8, status: 'Active' },
        { id: 'EMI002', empId: 'EMP002', name: 'Jane Smith', loanType: 'Home Loan', loanAmount: 200000, emiAmount: 15000, tenure: 24, paidEmis: 10, remainingEmis: 14, status: 'Active' },
        { id: 'EMI003', empId: 'EMP003', name: 'Michael Brown', loanType: 'Car Loan', loanAmount: 100000, emiAmount: 8000, tenure: 18, paidEmis: 18, remainingEmis: 0, status: 'Completed' },
        { id: 'EMI004', empId: 'EMP004', name: 'Sarah Wilson', loanType: 'Personal Loan', loanAmount: 30000, emiAmount: 3000, tenure: 10, paidEmis: 2, remainingEmis: 8, status: 'Active' },
    ]);

    const [newEmiFormData, setNewEmiFormData] = useState({
        empId: '',
        name: '',
        loanType: '',
        loanAmount: '',
        emiAmount: '',
        tenure: ''
    });

    const [updateFormData, setUpdateFormData] = useState({
        paidEmis: 0,
        status: ''
    });

    const stats = [
        { label: 'Total active Loans', value: `₹${emiData.filter(e => e.status === 'Active').reduce((sum, e) => sum + e.loanAmount, 0).toLocaleString()}`, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Monthly EMI Collection', value: `₹${emiData.filter(e => e.status === 'Active').reduce((sum, e) => sum + e.emiAmount, 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Pending EMIs', value: emiData.reduce((sum, e) => sum + e.remainingEmis, 0).toString(), icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-100' },
        { label: 'Completed Loans', value: emiData.filter(e => e.status === 'Completed').length.toString(), icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    ];

    const filteredData = emiData.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.loanType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        setNewEmiFormData(prev => {
            const updated = { ...prev, [name]: value };
            const loanAmount = parseFloat(updated.loanAmount) || 0;

            if (name === 'empId') {
                const employee = employeeList.find(emp => emp.id === value);
                updated.name = employee ? employee.name : '';
            } else if (name === 'name') {
                const employee = employeeList.find(emp => emp.name === value);
                updated.empId = employee ? employee.id : '';
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

    const handleAddEmi = (e) => {
        e.preventDefault();
        const newEmi = {
            id: `EMI00${emiData.length + 1}`,
            ...newEmiFormData,
            loanAmount: parseFloat(newEmiFormData.loanAmount),
            emiAmount: parseFloat(newEmiFormData.emiAmount),
            tenure: parseInt(newEmiFormData.tenure),
            paidEmis: 0,
            remainingEmis: parseInt(newEmiFormData.tenure),
            status: 'Active'
        };
        setEmiData([...emiData, newEmi]);
        setShowAddModal(false);
        setNewEmiFormData({ empId: '', name: '', loanType: '', loanAmount: '', emiAmount: '', tenure: '' });
    };

    const handleActionClick = (emi) => {
        setSelectedEmi(emi);
        setUpdateFormData({
            paidEmis: emi.paidEmis,
            status: emi.status
        });
        setShowUpdateModal(true);
    };

    const handleUpdateEmi = (e) => {
        e.preventDefault();
        setEmiData(prev => prev.map(item => {
            if (item.id === selectedEmi.id) {
                const updatedPaid = parseInt(updateFormData.paidEmis);
                return {
                    ...item,
                    paidEmis: updatedPaid,
                    remainingEmis: item.tenure - updatedPaid,
                    status: updatedPaid >= item.tenure ? 'Completed' : updateFormData.status
                };
            }
            return item;
        }));
        setShowUpdateModal(false);
    };

    return (
        <div className="space-y-6 page-content p-6">
            <div className="flex items-center justify-end">
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
                            {filteredData.map((item) => (
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
                                        <div className="text-sm text-gray-900 font-medium">{item.loanType}</div>
                                        <div className="text-xs text-gray-500">Total: ₹{item.loanAmount.toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">₹{item.emiAmount.toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{item.tenure} Months</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1 max-w-[100px]">
                                            <div 
                                                className="bg-indigo-600 h-2 rounded-full" 
                                                style={{ width: `${(item.paidEmis / item.tenure) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-[10px] text-gray-500">{item.paidEmis}/{item.tenure} EMIs Paid</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                            item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button 
                                            onClick={() => handleActionClick(item)}
                                            className="text-indigo-600 hover:text-indigo-900 transition-colors p-2 rounded-lg hover:bg-indigo-50"
                                            title="Update EMI"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New EMI Entry Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-indigo-50/30">
                            <h2 className="text-xl font-bold text-gray-800">New EMI Entry</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddEmi} className="p-6 space-y-4">
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
                                            <option key={emp.id} value={emp.id}>{emp.id}</option>
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
                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
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

            {/* Update EMI Modal */}
            {showUpdateModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-indigo-50/30">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Update EMI</h2>
                                <p className="text-xs text-gray-500">{selectedEmi?.name} ({selectedEmi?.id})</p>
                            </div>
                            <button onClick={() => setShowUpdateModal(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateEmi} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paid EMIs (Current: {selectedEmi?.paidEmis}/{selectedEmi?.tenure})</label>
                                <input 
                                    type="number" 
                                    max={selectedEmi?.tenure}
                                    min="0"
                                    value={updateFormData.paidEmis} 
                                    onChange={(e) => setUpdateFormData({...updateFormData, paidEmis: e.target.value})} 
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select 
                                    value={updateFormData.status} 
                                    onChange={(e) => setUpdateFormData({...updateFormData, status: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Paused">Paused</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>
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
