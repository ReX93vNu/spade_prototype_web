import React, { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import myLogo from '../assets/logo.png';

const Dashboard = () => {
  const [logs, setLogs] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [activeView, setActiveView] = useState('dashboard');
  const [expandedLogId, setExpandedLogId] = useState(null);

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
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('accessToken'); 
    
    const wsUrl = `ws://localhost:8000/ws/updates/${userId}/?token=${token}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnectionStatus('Live - Connected to ESP32');
    };

    socket.onmessage = (event) => {
      const newReading = JSON.parse(event.data);
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
                <img src={myLogo} alt="Profile" className="w-full h-full object-cover opacity-80" />
              </div>
              <svg className={`w-4 h-4 text-[#D9CFC4] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-[#EFEBE4] py-2 z-50">
                <div className="px-5 py-3 border-b border-[#EFEBE4] bg-[#FDFBF7] rounded-t-xl">
                  <p className="text-xs text-[#7A6352] font-semibold uppercase tracking-wider">Signed in as</p>
                  <p className="text-sm font-bold text-[#4A3728] mt-1 truncate">amaro_admin</p>
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
            )}
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

                        {expandedLogId === log.id && (
                          <tr className="bg-[#FCFAF8] border-b border-[#EFEBE4]">
                            <td colSpan="7" className="p-6">
                              <div className="flex flex-col gap-4 max-w-4xl">
                                <h4 className="font-serif font-bold text-[#4A3728] text-lg">Test Report Details</h4>
                                
                                <div className={`p-4 rounded-xl border ${
                                  log.condition_status.toLowerCase() === 'optimal' 
                                    ? 'bg-[#F5FAF5] border-[#C5DDC8] text-[#3c7844]' 
                                    : 'bg-[#FEF2F2] border-[#F3C4C4] text-[#B93838]'
                                }`}>
                                  <span className="font-bold">Recommendation: </span>
                                  {log.condition_status.toLowerCase() === 'optimal' 
                                    ? "Soil is in good condition. Continue regular application. Consider a phosphorus boost for root crops."
                                    : "Action needed: Apply agricultural lime to raise pH. Retest after 2 weeks before using on crops."}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto mt-10 px-4">
          <button onClick={() => setActiveView('dashboard')} className="mb-4 text-[#7A6352] hover:text-[#4A3728] font-bold flex items-center gap-2">
            ← Back to Dashboard
          </button>
          <div className="bg-[#F5F2EC] rounded-2xl shadow-md p-8 border border-[#EFEBE4]">
            <h2 className="text-3xl font-serif font-bold text-[#4A3728] mb-6">Settings</h2>
            <p className="text-[#7A6352]">butangi sa ni</p>
          </div>
        </div>
      )}
    </div>
  );
}; 

export default Dashboard;