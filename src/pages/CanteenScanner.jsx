import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, Utensils, RefreshCw, User } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const CanteenScanner = () => {
  const navigate = useNavigate();
  const [meals, setMeals] = useState([]);
  const [selectedMealId, setSelectedMealId] = useState("");
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success result popup state
  const [scanResult, setScanResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  
  const qrCodeReaderRef = useRef(null);
  const scannerContainerId = "qr-reader-container";

  // Load meals
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const mealsRes = await api.get("/canteen/meals");
        setMeals(mealsRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load initial canteen details");
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Audio beep synthesis using Web Audio API
  const playBeepSound = (frequency = 900, duration = 0.15) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Beep audio play failed", e);
    }
  };

  // Vibrate phone
  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  // Submit scan to backend
  const handleScanLogged = async (empCode) => {
    if (!selectedMealId) {
      toast.error("Please select a meal first");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await api.post("/canteen/scan", {
        employeeCode: empCode,
        mealId: Number(selectedMealId)
      });
      
      if (res.success && res.data) {
        const loggedData = res.data;
        
        // Play beep and vibrate
        playBeepSound(950, 0.18);
        triggerHaptic();
        
        // Show overlay popup
        setScanResult(loggedData);
        
        // Add to recent scans list
        setRecentScans(prev => [loggedData, ...prev.slice(0, 4)]);
      }
    } catch (err) {
      playBeepSound(300, 0.4); // lower error beep
      toast.error(err.message || "Failed to log canteen meal");
      // Restart camera scanner on error if a meal is selected
      if (selectedMealId) {
        startCamera();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Camera QR Code Scanner
  const startCamera = async () => {
    if (cameraActive) return;
    setCameraActive(true);
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        qrCodeReaderRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Stop scanner temporarily to prevent duplicate logs while processing
            stopCamera();
            // Process the scanned text (expecting employeeCode)
            handleScanLogged(decodedText.trim());
          },
          (errorMessage) => {
            // Silence debug scan errors
          }
        );
      } catch (err) {
        console.error("Camera scanner start failed:", err);
        toast.error("Failed to start device camera. Please check permissions.");
        setCameraActive(false);
      }
    }, 100);
  };

  const stopCamera = async () => {
    if (qrCodeReaderRef.current && qrCodeReaderRef.current.isScanning) {
      try {
        await qrCodeReaderRef.current.stop();
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
    }
    setCameraActive(false);
  };

  // Start/stop camera based on meal selection
  useEffect(() => {
    if (selectedMealId) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [selectedMealId]);

  // Restart camera after dismissing scan popup
  const dismissResultPopup = () => {
    setScanResult(null);
    if (selectedMealId) {
      startCamera();
    }
  };

  // Auto dismiss popup after 2.5 seconds
  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => {
        dismissResultPopup();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans select-none relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500 rounded-full blur-[140px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500 rounded-full blur-[140px] opacity-10 pointer-events-none"></div>

      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <Utensils size={20} />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Canteen Scanner</h1>
            <p className="text-xs text-slate-400">Mobile Manager Portal</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigate("/")}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold flex items-center transition-colors"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4 z-10">
        
        {/* 1. Meal Selection Dropdown (Selection-Based, No Default) */}
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Select Active Meal
          </label>
          {loading ? (
            <div className="h-10 flex items-center justify-center">
              <RefreshCw size={16} className="animate-spin text-slate-400 mr-2" />
              <span className="text-slate-400 text-xs">Loading meals...</span>
            </div>
          ) : (
            <select
              value={selectedMealId}
              onChange={(e) => setSelectedMealId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white font-semibold"
            >
              <option value="">-- Choose Meal Option --</option>
              {meals.map((meal) => (
                <option key={meal.id} value={meal.id}>
                  {meal.name} (₹{Number(meal.price).toFixed(2)})
                </option>
              ))}
            </select>
          )}
        </section>

        {/* 2. Primary Camera Scanner Window */}
        <section className="flex-1 min-h-[280px] bg-slate-950 rounded-3xl border border-slate-800 flex flex-col overflow-hidden relative shadow-inner">
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            
            {/* QR Scanner Frame & Viewport */}
            <div className="relative w-full max-w-[260px] aspect-square rounded-2xl border border-slate-700 overflow-hidden bg-slate-900 flex items-center justify-center shadow-lg">
              
              {/* HTML5 QR viewport target */}
              <div id={scannerContainerId} className="w-full h-full object-cover"></div>
              
              {/* Scanning overlay guidelines */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                  {/* Corner Borders */}
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-md"></div>
                    <div className="w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-md"></div>
                  </div>
                  {/* Laser scan line */}
                  <div className="w-full h-0.5 bg-indigo-500/80 blur-[1px] animate-pulse relative" style={{ animation: "scanLine 2.5s infinite linear" }}>
                    <div className="absolute inset-0 bg-indigo-400 shadow-[0_0_15px_#6366f1]"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-md"></div>
                    <div className="w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-md"></div>
                  </div>
                </div>
              )}
              
              {!cameraActive && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center">
                  {!selectedMealId ? (
                    <>
                      <Utensils size={36} className="text-indigo-500/80 mb-2 animate-pulse" />
                      <span className="text-xs font-semibold text-slate-300">Scanner Locked</span>
                      <span className="text-[11px] text-slate-500 mt-1.5 max-w-[200px]">
                        Please select an active meal option from the dropdown above to unlock the camera.
                      </span>
                    </>
                  ) : (
                    <>
                      <Camera size={36} className="text-slate-600 mb-2 animate-bounce" />
                      <span className="text-xs text-slate-400">Camera offline</span>
                      <button 
                        onClick={startCamera}
                        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        Start Camera
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {cameraActive && (
              <button
                onClick={stopCamera}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 font-semibold border border-slate-700 transition-colors"
              >
                Turn Off Camera
              </button>
            )}
            
          </div>

          {/* Overlay Pop-up Notification (Success Scan Screen) */}
          {scanResult && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 animate-scale-up">
                <CheckCircle size={32} />
              </div>
              
              <h3 className="text-lg font-bold text-emerald-400">Meal Logged!</h3>
              <p className="text-xs text-slate-400 mt-1">Canteen record created</p>

              {/* Employee ID Card Layout */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 my-5 w-full max-w-[280px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {scanResult.candidatePhoto ? (
                      <img src={scanResult.candidatePhoto} alt="Employee" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-slate-500" />
                    )}
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-sm text-white truncate max-w-[170px]">{scanResult.employeeName}</h4>
                    <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold mt-0.5">{scanResult.employeeCode}</p>
                  </div>
                </div>
                
                <div className="mt-3 border-t border-slate-800/80 pt-3 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Meal Served:</span>
                  <span className="font-bold text-slate-200">{scanResult.mealName}</span>
                </div>
                <div className="mt-1 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Charge:</span>
                  <span className="font-bold text-emerald-400">₹{Number(scanResult.price).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={dismissResultPopup}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Scan Next Meal
              </button>
            </div>
          )}
        </section>

        {/* 3. Session Scan History (Last 5 scans) */}
        <section className="bg-slate-800/40 rounded-2xl border border-slate-700 p-4 shrink-0">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Recent Scans (Current Session)
          </h2>
          {recentScans.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500">
              No scans recorded in this session.
            </div>
          ) : (
            <div className="space-y-2">
              {recentScans.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-800/60 rounded-xl border border-slate-800 px-3 py-2.5 flex justify-between items-center text-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                      {log.candidatePhoto ? (
                        <img src={log.candidatePhoto} alt="Emp" className="w-full h-full object-cover" />
                      ) : (
                        <User size={14} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate max-w-[120px]">{log.employeeName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{log.employeeCode} &bull; {log.mealName}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-emerald-400">₹{Number(log.price).toFixed(2)}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {new Date(log.servedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Inline styles for scanning laser animation */}
      <style>{`
        @keyframes scanLine {
          0% { transform: translateY(0); }
          50% { transform: translateY(226px); }
          100% { transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scale-up {
          animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CanteenScanner;
