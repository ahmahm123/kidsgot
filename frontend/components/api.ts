export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
export const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
