'use client';

import axios, { AxiosRequestHeaders } from 'axios';
import { useToast } from '../components/ui/toast';

console.log("process.env.NEXT_PUBLIC_API_BASE_URL==", process.env.NEXT_PUBLIC_API_BASE_URL)
export const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:5000/api';

if (!process.env.NEXT_PUBLIC_API_BASE_URL && typeof window !== 'undefined') {
  console.warn(
    'NEXT_PUBLIC_API_BASE_URL is not set. Using default ' + process.env.NEXT_PUBLIC_API_BASE_URL,
  );
}
console.log('API baseURL =', baseURL);
export const api = axios.create({
  baseURL,
});
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const headers: AxiosRequestHeaders = (config.headers ||
        {}) as AxiosRequestHeaders;
      headers.Authorization = `Bearer ${token}`;
      config.headers = headers;
    }
  }
  return config;
});

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     const status = error?.response?.status;
//     //  silence permission errors
//     if (status === 403) {
//       // do NOT toast do NOT retry
//       return Promise.reject(error);
//     }
//     // Optional: auto logout on token expiry
//     if (status === 401 && typeof window !== 'undefined') {
//       localStorage.removeItem('accessToken');
//       localStorage.removeItem('refreshToken');
//       window.location.href = '/login';
//     }

//     return Promise.reject(error);
//   },
// );


api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? '';

    // allow UI to handle auth errors on login-related APIs
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/mfa/login') ||
      url.includes('/auth/activate')
    //url.includes('/auth/me');
    //const { showToast } = useToast();
    if (status === 403) {
      //return Promise.reject(error);

      // showToast({
      //   type: 'error',
      //   title: 'Access denied',
      //   message: 'You do not have permission to view this page.',
      // });
      // return;

    }
    console.log("status===", status)
    //if (status === 401 && typeof window !== 'undefined' && !isAuthEndpoint) {
    //localStorage.removeItem('accessToken'); //Moved this code to auth provider
    //localStorage.removeItem('refreshToken');
    //window.location.href = '/login';
    //}

    if (status === 401 && typeof window !== 'undefined' && !isAuthEndpoint) {
      if (!sessionStorage.getItem('isLoggingOut')) {
        sessionStorage.setItem('isLoggingOut', 'true');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
