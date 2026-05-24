import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

const Dashboard = () => {
    // State to hold our list of fertilizer readings
    const [logs, setLogs] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');

// 1. Fetch historical data when the page first loads
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // Hitting the exact endpoint defined in your urls.py
                const response = await api.get('ingest-reading/'); 
                
                // Your backend sends { status, total_records, data: [...] }
                // So we need to drill down into response.data.data to get the array
                setLogs(response.data.data);
            } catch (error) {
                console.error("Failed to fetch fertilizer logs", error);
            }
        };

        fetchLogs();
    }, []);

// 2. Set up the real-time WebSocket connection
    useEffect(() => {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('accessToken'); 
        
        // Appending the token to the URL so the backend can verify it
        const wsUrl = `ws://localhost:8000/ws/updates/${userId}/?token=${token}`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            setConnectionStatus('Live - Connected to ESP32');
        };

        socket.onmessage = (event) => {
            const newReading = JSON.parse(event.data);
            // newReading directly matches the payload from consumers.py
            setLogs((prevLogs) => [newReading, ...prevLogs]);
        };

        socket.onclose = () => {
            setConnectionStatus('Disconnected');
        };

        return () => socket.close();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>SPADE Fertilizer Dashboard</h1>
            <p>Status: <strong>{connectionStatus}</strong></p>

            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid black' }}>
                        <th>Time</th>
                        <th>Type</th>
                        <th>pH</th>
                        <th>Nitrogen (N)</th>
                        <th>Phosphorus (P)</th>
                        <th>Potassium (K)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid gray' }}>
                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                            <td>{log.fertilizer_type}</td>
                            <td>{log.ph_level}</td>
                            <td>{log.nitrogen_val}</td>
                            <td>{log.phosphorus_val}</td>
                            <td>{log.potassium_val}</td>
                            <td style={{ 
                                color: log.condition_status === 'Optimal' ? 'green' : 'red',
                                fontWeight: 'bold'
                            }}>
                                {log.condition_status}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Dashboard;