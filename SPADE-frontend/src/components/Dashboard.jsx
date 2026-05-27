import React, { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import myLogo from '../assets/logo.png';
import myPFP from '../assets/pfp.png';

const Dashboard = () => {
  const [logs, setLogs] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [activeView, setActiveView] = useState('dashboard');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [username, setUsername] = useState('Loading...');

  const generateDiagnosticSummary = (log) => {
    if (log.condition_status.toLowerCase() === 'optimal') {
      return "All readings are within optimal ranges for general crop application.";
    }

    const issues = [];
    
    if (log.ph_level < 6.0) issues.push("pH is too low (acidic)");
    if (log.ph_level > 7.0) issues.push("pH is too high (alkaline)");

    if (log.nitrogen_val < 50) issues.push("Nitrogen is deficient");
    if (log.nitrogen_val > 200) issues.push("Nitrogen is excessive");
    
    if (log.phosphorus_val < 30) issues.push("Phosphorus is deficient");
    if (log.phosphorus_val > 100) issues.push("Phosphorus is excessive");
    
    if (log.potassium_val < 40) issues.push("Potassium is deficient");
    if (log.potassium_val > 150) issues.push("Potassium is excessive");

    if (issues.length === 0) {
      return "Suboptimal condition detected, but specific nutrient thresholds were not breached.";
    }

    return `Analysis: ${issues.join(", ")}.`;
  };

  const handleAccountSettings = () => {
    setActiveView('settings');
    setIsProfileOpen(false);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = "Date,Fertilizer Type,pH Level,Nitrogen (N),Phosphorus (P),Potassium (K),Condition\n";
    
    const csvRows = logs.map(log => {
      const date = new Date(log.timestamp).toLocaleString();
      return `"${date}","${log.fertilizer_type}",${log.ph_level},${log.nitrogen_val},${log.phosphorus_val},${log.potassium_val},"${log.condition_status}"`;
    });

    const csvContent = headers + csvRows.join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SPADE_Fertilizer_Logs.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    setIsProfileOpen(false);
  };

  const handleLogOut = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('accessToken');
    window.location.href = '/'; 
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('ingest-reading/'); 
        setLogs(response.data.data);
      } catch (error) {
        console.error("Failed to fetch fertilizer logs", error);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem('username');
    if (storedName) {
      setUsername(storedName);
    } else {
      setUsername('SPADE User');
    }
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('accessToken'); 
    
    console.log("DEBUG WEBSOCKET CONNECTION:", { userId, token });

    const wsUrl = `wss://spade-prototype-web.onrender.com/ws/updates/${userId}/?token=${token}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnectionStatus('Live - Connected to ESP32');
    };

    socket.onmessage = (event) => {
      const rawData = JSON.parse(event.data);
      const newReading = rawData.data ? rawData.data : rawData;
      console.log("LIVE WEBSOCKET PAYLOAD RECEIVED:", newReading);
      setLogs((prevLogs) => [newReading, ...prevLogs]);
    };

    socket.onclose = () => {
      setConnectionStatus('Disconnected');
    };

    return () => socket.close();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#4A3728] font-sans pb-12">
      <header className="sticky top-0 z-50 bg-[#4A3728] px-8 py-6 shadow-md flex flex-col md:flex-row md:items-center justify-between border-b-4 border-[#528246]">
        <div>
          <div className="flex items-center gap-3">
            <img src={myLogo} alt="SPADE Logo" className="w-10 h-10 rounded-full" />
            <h1 className="text-3xl font-serif font-bold text-[#FCFAF8] tracking-widest">
              SPADE
            </h1>
          </div>
          <p className="text-[#D9CFC4] text-sm mt-1 font-medium tracking-wide">
            Organic Fertilizer Data & Evaluation
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-6">
          <div className="flex items-center gap-3 bg-[#38291D] px-4 py-2 rounded-full border border-[#5A4535]">
            <span className="text-[#D9CFC4] text-sm font-semibold">Sensor Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border shadow-inner ${
                connectionStatus === 'Disconnected' 
                ? 'bg-[#38291D] text-[#F87171] border-[#F87171]/30' 
                : 'bg-[#Edf3eb] text-[#3c7844] border-[#C5DDC8]'
              }`}
            >
              {connectionStatus}
            </span>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 focus:outline-none hover:opacity-80 transition-opacity"
            >
              <div className="w-11 h-11 rounded-full bg-[#FCFAF8] border-2 border-[#528246] flex items-center justify-center text-[#4A3728] font-bold shadow-md overflow-hidden">
                <img src={myPFP} alt="Profile" className="w-full h-full object-cover opacity-80" />
              </div>
              <svg className={`w-4 h-4 text-[#D9CFC4] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            <div className={`absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-[#EFEBE4] py-2 z-50 transition-all duration-200 ease-in-out origin-top-right ${isProfileOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
              <div className="px-5 py-3 border-b border-[#EFEBE4] bg-[#FDFBF7] rounded-t-xl">
                <p className="text-xs text-[#7A6352] font-semibold uppercase tracking-wider">Signed in as</p>
                <p className="text-sm font-bold text-[#4A3728] mt-1 truncate">{username}</p>
              </div>          
              
              <div className="py-2">
                <button 
                  onClick={handleAccountSettings}
                  className="w-full text-left px-5 py-2.5 text-sm text-[#4A3728] hover:bg-[#F9F7F3] transition-colors font-medium"
                >
                  Account Settings
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="w-full text-left px-5 py-2.5 text-sm text-[#4A3728] hover:bg-[#F9F7F3] transition-colors font-medium flex justify-between items-center"
                >
                  Export Data (CSV)
                  <svg className="w-4 h-4 text-[#A49487]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </button>
              </div>
              
              <div className="border-t border-[#EFEBE4] pt-2">
                <button 
                  onClick={handleLogOut}
                  className="w-full text-left px-5 py-2.5 text-sm text-[#B93838] hover:bg-[#Fce8e8] transition-colors font-bold"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {activeView === 'dashboard' ? (
        <div className="max-w-7xl mx-auto mt-10 px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-serif font-bold text-[#4A3728]">
              Historical Test Records
            </h2>
            <p className="text-[#7A6352] text-sm mt-1">
              View past NPK and pH readings from your device.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(74,55,40,0.08)] border border-[#EFEBE4] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F5F2EC] text-[#7A6352] uppercase text-xs font-bold tracking-wider">
                  <tr>
                    <th className="py-5 px-6 border-b border-[#EFEBE4]">Date & Time</th>
                    <th className="py-5 px-6 border-b border-[#EFEBE4]">Fertilizer Type</th>
                    <th className="py-5 px-6 border-b border-[#EFEBE4]">pH Level</th>
                    <th className="py-5 px-6 border-b border-[#EFEBE4]">Nitrogen (N)</th>
                    <th className="py-5 px-6 border-b border-[#EFEBE4]">Phosphorus (P)</th>
                    <th className="py-5 px-6 border-b border-[#EFEBE4]">Potassium (K)</th>
                    <th className="py-5 px-6 border-b border-[#EFEBE4]">Condition</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EFEBE4]">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-[#7A6352] italic bg-[#FCFAF8]">
                        No fertilizer logs available yet. Connect your device to begin.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr 
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          className="hover:bg-[#F9F7F3] transition-colors duration-150 ease-in-out bg-white cursor-pointer"
                        >
                          <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-[#7A6352]">
                            {new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="py-4 px-6 text-sm font-bold text-[#4A3728]">{log.fertilizer_type}</td>
                          <td className="py-4 px-6 text-sm font-semibold text-[#4A3728]">{log.ph_level}</td>
                          <td className="py-4 px-6 text-sm font-semibold text-[#4A3728]">{log.nitrogen_val} <span className="text-xs text-[#A49487]">ppm</span></td>
                          <td className="py-4 px-6 text-sm font-semibold text-[#4A3728]">{log.phosphorus_val} <span className="text-xs text-[#A49487]">ppm</span></td>
                          <td className="py-4 px-6 text-sm font-semibold text-[#4A3728]">{log.potassium_val} <span className="text-xs text-[#A49487]">ppm</span></td>
                          <td className="py-4 px-6 text-sm">
                            <span className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide flex inline-flex items-center gap-1.5
                              ${log.condition_status.toLowerCase() === 'optimal' 
                                ? 'bg-[#Edf3eb] text-[#3c7844] border border-[#C5DDC8]' 
                                : 'bg-[#Fce8e8] text-[#B93838] border border-[#F3C4C4]'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${log.condition_status.toLowerCase() === 'optimal' ? 'bg-[#3c7844]' : 'bg-[#B93838]'}`}></span>
                              {log.condition_status}
                            </span>
                          </td>
                        </tr>

                        <tr className="bg-[#FCFAF8]">
                          <td colSpan="7" className="p-0 border-none"> 
                            <div className={`expandable-row-content ${expandedLogId === log.id ? 'expanded' : ''}`}>
                              <div className={`border-[#EFEBE4] ${expandedLogId === log.id ? 'p-6 border-b' : 'p-0 border-0'}`}>
                                <div className="flex flex-col gap-4 max-w-4xl">
                                  <h4 className="font-serif font-bold text-[#4A3728] text-lg">Test Report Details</h4>
                                  <div className={`p-4 rounded-xl border ${
                                  log.condition_status.toLowerCase() === 'optimal' 
                                      ? 'bg-[#F5FAF5] border-[#C5DDC8] text-[#3c7844]' 
                                      : 'bg-[#FEF2F2] border-[#F3C4C4] text-[#B93838]'
                                  }`}>
                                    <span className="font-bold">Diagnostic Summary: </span>
                                    {generateDiagnosticSummary(log)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto mt-6 px-4 pb-12">
          <button onClick={() => setActiveView('dashboard')} className="mb-6 text-[#7A6352] hover:text-[#4A3728] font-bold flex items-center gap-2 transition-colors">
            ← Back to Dashboard
          </button>
        
          <h2 className="text-3xl font-serif font-bold text-[#4A3728] mb-8">Settings</h2>

          <div className="mb-8">
            <h3 className="text-xs font-bold text-[#8C7A6B] tracking-widest uppercase mb-3">Cloud Sync</h3>
            <div className="flex flex-col gap-3">
              <div className="bg-[#F5F2EC] p-4 rounded-xl flex items-center justify-between border border-[#EFEBE4]">
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6 text-[#5A4535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
                  <div>
                    <p className="font-bold text-[#4A3728] text-sm">Auto Sync</p>
                    <p className="text-xs text-[#7A6352]">Upload records when online</p>
                  </div>
                </div>
                <div className="w-12 h-6 bg-[#528246] rounded-full relative cursor-pointer opacity-90 hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                </div>
              </div>

              <div className="bg-[#F5F2EC] p-4 rounded-xl flex items-center justify-between border border-[#EFEBE4]">
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6 text-[#5A4535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  <div>
                    <p className="font-bold text-[#4A3728] text-sm">Last Synced</p>
                    <p className="text-xs text-[#7A6352]">Today, 7:33 PM</p>
                  </div>
                </div>
                <span className="bg-[#Edf3eb] text-[#3c7844] px-3 py-1 rounded-md text-xs font-bold tracking-wide">Done</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xs font-bold text-[#8C7A6B] tracking-widest uppercase mb-3">Data Management</h3>
            <div className="flex flex-col gap-3">
              <button onClick={() => alert("Local records viewer coming soon.")} className="w-full text-left bg-[#F5F2EC] p-4 rounded-xl flex items-center justify-between border border-[#EFEBE4] hover:bg-[#EFEBE4] transition-colors">
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6 text-[#5A4535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                  <div>
                    <p className="font-bold text-[#4A3728] text-sm">Local Records</p>
                    <p className="text-xs text-[#7A6352]">{logs.length} tests saved on device</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-[#7A6352]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>

              <button onClick={() => { if(window.confirm("Are you sure you want to clear local logs? (This is a prototype simulation)")) setLogs([]); }} className="w-full text-left bg-[#F5F2EC] p-4 rounded-xl flex items-center justify-between border border-[#EFEBE4] hover:bg-[#FEF2F2] hover:border-[#F3C4C4] transition-colors group">
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6 text-[#5A4535] group-hover:text-[#B93838] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  <div>
                    <p className="font-bold text-[#4A3728] text-sm group-hover:text-[#B93838] transition-colors">Clear All Data</p>
                    <p className="text-xs text-[#7A6352] group-hover:text-[#B93838]/70">Remove all local records</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-[#B93838]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xs font-bold text-[#8C7A6B] tracking-widest uppercase mb-3">App Info</h3>
            <div className="flex flex-col gap-3">
              <div className="bg-[#F5F2EC] p-4 rounded-xl flex items-center gap-4 border border-[#EFEBE4]">
                <svg className="w-6 h-6 text-[#5A4535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                  <p className="font-bold text-[#4A3728] text-sm">SPADE v1.0.0</p>
                  <p className="text-xs text-[#7A6352]">Developed at USTP • May 2026</p>
                </div>
              </div>

              <button onClick={() => alert("Opening Help Guide...")} className="w-full text-left bg-[#F5F2EC] p-4 rounded-xl flex items-center justify-between border border-[#EFEBE4] hover:bg-[#EFEBE4] transition-colors">
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6 text-[#5A4535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                  <div>
                    <p className="font-bold text-[#4A3728] text-sm">Help & Guide</p>
                    <p className="text-xs text-[#7A6352]">How to use the device</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-[#528246]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 

export default Dashboard;