import React, { useState, useEffect } from "react";
import { Clock, CheckCircle, AlertCircle, Play, Square, Coffee, Moon, Calendar, History, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

const AttendanceLogs = () => {
  const [employee, setEmployee] = useState(null);
  const [todaySession, setTodaySession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

  // Fetch current employee data based on logged-in user name
  const fetchEmployeeData = async () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        throw new Error("No user logged in");
      }
      const currentUser = JSON.parse(userData);
      const userName = currentUser.Name || currentUser.Username || currentUser.username;
      
      const response = await fetch(`${API_URL}/employees/active?name=${encodeURIComponent(userName)}`);
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        const emp = result.data[0];
        setEmployee(emp);
        return emp.employee_id;
      } else {
        throw new Error("Employee record not found for the user " + userName);
      }
    } catch (error) {
      console.error("fetchEmployeeData error:", error);
      toast.error(error.message || "Failed to load employee profile");
      return null;
    }
  };

  // Fetch today's session details
  const fetchTodaySession = async (empId) => {
    try {
      const res = await fetch(`${API_URL}/attendance/sessions/today?employeeId=${empId}`);
      const result = await res.json();
      if (result.success) {
        setTodaySession(result.data);
      }
    } catch (err) {
      console.error("Error fetching today session:", err);
    }
  };

  // Fetch attendance history
  const fetchHistory = async (empId) => {
    try {
      const res = await fetch(`${API_URL}/attendance/sessions/history?employeeId=${empId}`);
      const result = await res.json();
      if (result.success) {
        // Reverse array to show newest first
        setHistory(result.data ? [...result.data].reverse() : []);
      }
    } catch (err) {
      console.error("Error fetching attendance history:", err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    const empId = await fetchEmployeeData();
    if (empId) {
      await Promise.all([
        fetchTodaySession(empId),
        fetchHistory(empId)
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Record an attendance event
  const handleRecordEvent = async (eventType) => {
    if (!employee) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/attendance/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: employee.employee_id,
          eventType,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Recorded ${eventType.replace("_", " ")} successfully`);
        await Promise.all([
          fetchTodaySession(employee.employee_id),
          fetchHistory(employee.employee_id)
        ]);
      } else {
        throw new Error(result.message || "Failed to record event");
      }
    } catch (error) {
      console.error("Record event error:", error);
      toast.error(error.message || "Failed to record event");
    } finally {
      setSubmitting(false);
    }
  };

  // Determine current status state
  const getCurrentState = () => {
    if (!todaySession || !todaySession.events || todaySession.events.length === 0) {
      return "NOT_CHECKED_IN";
    }
    const lastEvent = todaySession.events[todaySession.events.length - 1];
    return lastEvent.eventType; // 'CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END'
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return "0 mins";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const currentState = getCurrentState();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-sm text-gray-500">Record check-in, breaks, check-out, and view history</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-indigo-700">
          <Calendar size={18} />
          <span className="font-semibold text-sm">{formatDate(new Date())}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status and Action Console */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Console</h2>
            
            {/* Status Card */}
            <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 mb-6 text-center">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Current Status</span>
              
              <div className="mt-2 flex items-center justify-center gap-2">
                {currentState === "NOT_CHECKED_IN" && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <AlertCircle size={16} className="mr-1.5" />
                    Not Checked In
                  </span>
                )}
                {currentState === "CHECK_OUT" && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <AlertCircle size={16} className="mr-1.5" />
                    Checked Out
                  </span>
                )}
                {(currentState === "CHECK_IN" || currentState === "BREAK_END") && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 animate-pulse">
                    <CheckCircle size={16} className="mr-1.5" />
                    Working
                  </span>
                )}
                {currentState === "BREAK_START" && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    <Coffee size={16} className="mr-1.5" />
                    On Break
                  </span>
                )}
              </div>

              <div className="mt-4">
                <span className="text-2xl font-bold text-gray-800">
                  {formatMinutes(todaySession?.session?.workMinutes)}
                </span>
                <p className="text-xs text-gray-400 mt-1">Logged Work Time Today</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Check In */}
            {(currentState === "NOT_CHECKED_IN" || currentState === "CHECK_OUT") && (
              <button
                onClick={() => handleRecordEvent("CHECK_IN")}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition duration-200 cursor-pointer disabled:opacity-55"
              >
                <Play size={18} />
                <span>Check In</span>
              </button>
            )}

            {/* Check Out / Break Buttons */}
            {(currentState === "CHECK_IN" || currentState === "BREAK_END") && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRecordEvent("BREAK_START")}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition duration-200 cursor-pointer disabled:opacity-55"
                >
                  <Coffee size={18} />
                  <span>Break</span>
                </button>
                <button
                  onClick={() => handleRecordEvent("CHECK_OUT")}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition duration-200 cursor-pointer disabled:opacity-55"
                >
                  <Square size={18} />
                  <span>Check Out</span>
                </button>
              </div>
            )}

            {/* End Break */}
            {currentState === "BREAK_START" && (
              <button
                onClick={() => handleRecordEvent("BREAK_END")}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition duration-200 cursor-pointer disabled:opacity-55"
              >
                <Play size={18} />
                <span>Resume Work</span>
              </button>
            )}
          </div>
        </div>

        {/* Daily Timeline */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Activity</h2>
          
          {!todaySession || !todaySession.events || todaySession.events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Clock size={48} className="stroke-1 mb-3" />
              <p className="text-sm font-medium">No activity recorded for today yet.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l border-gray-150 space-y-6">
              {todaySession.events.map((ev, index) => (
                <div key={ev.id} className="relative">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm
                    ${ev.eventType === "CHECK_IN" ? "bg-green-500" : ""}
                    ${ev.eventType === "CHECK_OUT" ? "bg-red-500" : ""}
                    ${ev.eventType === "BREAK_START" ? "bg-yellow-500" : ""}
                    ${ev.eventType === "BREAK_END" ? "bg-indigo-500" : ""}
                  `}></span>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {ev.eventType === "CHECK_IN" && "Checked In"}
                        {ev.eventType === "CHECK_OUT" && "Checked Out"}
                        {ev.eventType === "BREAK_START" && "Started Break"}
                        {ev.eventType === "BREAK_END" && "Resumed Work"}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Recorded via Console
                      </p>
                    </div>
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-md px-2 py-1">
                      {formatTime(ev.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History Log */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <History size={20} className="text-indigo-600" />
            <span>Attendance History</span>
          </h2>
        </div>
        
        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No history logs available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Work Time</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Timeline Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {history.map((sess) => (
                  <tr key={sess.id} className="hover:bg-gray-50/50 transition duration-150">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                      {new Date(sess.workDate).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      {sess.status === "Present" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Present
                        </span>
                      )}
                      {sess.status === "Absent" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Absent
                        </span>
                      )}
                      {sess.status === "leave" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          On Leave
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {formatMinutes(sess.workMinutes)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2 items-center">
                        {sess.events && sess.events.length > 0 ? (
                          sess.events.map((ev, index) => (
                            <span key={ev.id} className="text-xs bg-gray-100 rounded-md border border-gray-200 px-2 py-0.5 flex items-center gap-1">
                              <span className={`h-1.5 w-1.5 rounded-full
                                ${ev.eventType === "CHECK_IN" ? "bg-green-500" : ""}
                                ${ev.eventType === "CHECK_OUT" ? "bg-red-500" : ""}
                                ${ev.eventType === "BREAK_START" ? "bg-yellow-500" : ""}
                                ${ev.eventType === "BREAK_END" ? "bg-indigo-500" : ""}
                              `}></span>
                              {ev.eventType.replace("_", " ")} ({formatTime(ev.createdAt)})
                              {index < sess.events.length - 1 && <ArrowRight size={10} className="text-gray-400 ml-1" />}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No events</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLogs;
