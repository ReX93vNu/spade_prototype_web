import React, { useState } from 'react';
import api from '../api/axiosConfig';
import myLogo from '../assets/logo.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (username.trim() === '' || password.trim() === '') {
      setError('Please enter both a username and password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('token/', { 
        username: username,
        password: password
      });

      const accessToken = response.data.access;
      const decodedToken = parseJwt(accessToken);
      const userId = decodedToken ? decodedToken.user_id : null;

      if (!userId) {
        throw new Error("Could not extract User ID from token.");
      }

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('userId', userId.toString());
      localStorage.setItem('username', username);
      
      window.location.href = '/dashboard';

    } catch (err) {
      console.error("Login failed:", err);
      if (err.response && err.response.status === 401) {
          setError('Invalid username or password. Please try again.');
      } else {
          setError('Server connection failed. Is the backend running?');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full h-2 bg-[#528246]"></div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(74,55,40,0.08)] border border-[#EFEBE4] p-8 sm:p-12 relative z-10">
        
        <div className="text-center mb-8">
          <div className="inline-block p-2 rounded-full bg-[#FDFBF7] border-4 border-[#528246] mb-4 shadow-sm">
            <img src={myLogo} alt="SPADE Logo" className="w-16 h-16 rounded-full object-cover" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#4A3728] tracking-wide mb-2">
            SPADE
          </h1>
          <p className="text-[#7A6352] text-sm font-medium">
            Organic Fertilizer Data & Evaluation
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-[#FEF2F2] border border-[#F3C4C4] rounded-xl text-[#B93838] text-sm font-bold text-center animate-[fadeIn_0.3s_ease-in-out]">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          
          <div>
            <label className="block text-xs font-bold text-[#8C7A6B] tracking-widest uppercase mb-2">
              Username
            </label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-5 py-3.5 bg-[#FDFBF7] border border-[#EFEBE4] rounded-xl text-[#4A3728] placeholder-[#A49487] focus:outline-none focus:ring-2 focus:ring-[#528246]/50 focus:border-[#528246] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#8C7A6B] tracking-widest uppercase mb-2">
              Password
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-3.5 bg-[#FDFBF7] border border-[#EFEBE4] rounded-xl text-[#4A3728] placeholder-[#A49487] focus:outline-none focus:ring-2 focus:ring-[#528246]/50 focus:border-[#528246] transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full mt-2 font-bold py-4 rounded-xl shadow-md transition-all active:scale-[0.98] ${
              isLoading 
              ? 'bg-[#8C7A6B] text-[#D9CFC4] cursor-not-allowed' 
              : 'bg-[#528246] text-white hover:bg-[#3c7844] hover:shadow-lg'
            }`}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
          
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-[#A49487]">
            FAAC Prototype Build v1.0.0
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;