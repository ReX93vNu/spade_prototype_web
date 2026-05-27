import axios from 'axios';

// This sets the base URL so you don't have to type it every time
const api = axios.create({
    baseURL: 'https://spade-prototype-web.onrender.com/api', 
});

// This automatically attaches the auth token to every request we send
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;