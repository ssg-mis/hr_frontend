import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X, Check, User } from 'lucide-react';

export const getEmpId = (emp) => (emp?.employee_id ?? emp?.id ?? emp?.employeeId ?? '').toString();
export const getEmpName = (emp) => emp?.name_as_per_aadhar || emp?.candidateName || emp?.name || emp?.employeeName || '';
export const getEmpCode = (emp) => (emp?.employee_code || emp?.biometric_employee_code || emp?.employeeCode || emp?.biotime_emp_code || '').toString();
export const getEmpDesg = (emp) => emp?.designation_name || emp?.designation || '';
export const getEmpDept = (emp) => emp?.department?.department_name || emp?.departmentName || (typeof emp?.department === 'string' ? emp.department : '') || '';

const SearchableEmployeeSelect = ({
  employees = [],
  selectedEmployeeId = '',
  value = '',
  name = '',
  onSelect,
  onChange,
  placeholder = 'Search by employee name or code...',
  disabled = false,
  error = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const currentId = (selectedEmployeeId || value || '').toString();

  // Find currently selected employee object
  const selectedEmployee = employees.find(
    (emp) => getEmpId(emp) === currentId
  );

  // Sync display label when current selection changes
  useEffect(() => {
    if (selectedEmployee) {
      const code = getEmpCode(selectedEmployee);
      const empName = getEmpName(selectedEmployee);
      setSearchTerm(code ? `${empName} (${code})` : empName);
    } else {
      setSearchTerm('');
    }
  }, [currentId, employees]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset search term to selected employee display
        if (selectedEmployee) {
          const code = getEmpCode(selectedEmployee);
          const empName = getEmpName(selectedEmployee);
          setSearchTerm(code ? `${empName} (${code})` : empName);
        } else {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedEmployee]);

  // Filter employees based on search query
  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm.trim()) return true;

    // If search term matches the full selected label, show full list
    if (selectedEmployee) {
      const fullLabel = getEmpCode(selectedEmployee)
        ? `${getEmpName(selectedEmployee)} (${getEmpCode(selectedEmployee)})`
        : getEmpName(selectedEmployee);
      if (searchTerm === fullLabel) {
        return true;
      }
    }

    const term = searchTerm.toLowerCase().trim();
    const empName = getEmpName(emp).toLowerCase();
    const code = getEmpCode(emp).toLowerCase();
    const designation = getEmpDesg(emp).toLowerCase();
    const dept = getEmpDept(emp).toLowerCase();

    return (
      empName.includes(term) ||
      code.includes(term) ||
      designation.includes(term) ||
      dept.includes(term)
    );
  });

  const handleSelect = (emp) => {
    if (onSelect) onSelect(emp);
    if (onChange) {
      onChange({ target: { name, value: emp ? getEmpId(emp) : '' } }, emp);
    }
    const code = getEmpCode(emp);
    const empName = getEmpName(emp);
    setSearchTerm(code ? `${empName} (${code})` : empName);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(null);
    if (onChange) {
      onChange({ target: { name, value: '' } }, null);
    }
    setSearchTerm('');
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isOpen && filteredEmployees.length > 0) {
        e.preventDefault();
        handleSelect(filteredEmployees[0]);
      } else if (isOpen) {
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search size={16} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-9 pr-16 py-2.5 text-sm bg-white border rounded-xl transition-all focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-400 ring-2 ring-red-100 focus:ring-red-400 focus:border-red-500'
              : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'text-gray-800 font-medium'}`}
        />

        {/* Clear & Dropdown toggle buttons */}
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
          {currentId && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 font-medium mt-1">Please search and select an active employee from the list</p>
      )}

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto divide-y divide-gray-50 animate-in fade-in-50 zoom-in-95 duration-150">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => {
              const empId = getEmpId(emp);
              const isSelected = empId === currentId;
              const empCode = getEmpCode(emp) || 'N/A';
              const empName = getEmpName(emp) || 'Employee';
              const designation = getEmpDesg(emp);
              const dept = getEmpDept(emp);

              return (
                <div
                  key={empId || Math.random()}
                  onClick={() => handleSelect(emp)}
                  className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/80 text-indigo-900 font-semibold'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {empName ? empName.charAt(0).toUpperCase() : <User size={14} />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">
                          {empName}
                        </span>
                        <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
                          {empCode}
                        </span>
                      </div>
                      {(designation || dept) && (
                        <div className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          {dept && <span>{dept}</span>}
                          {dept && designation && <span>•</span>}
                          {designation && <span>{designation}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="shrink-0 ml-2 text-indigo-600">
                      <Check size={16} />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-gray-400 text-sm flex flex-col items-center gap-1.5">
              <Search size={20} className="text-gray-300" />
              <span>No active employees matching &ldquo;{searchTerm}&rdquo;</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableEmployeeSelect;
