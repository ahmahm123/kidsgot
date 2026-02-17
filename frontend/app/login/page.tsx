'use client';
import { useState } from 'react'; import { API } from '../../components/api';
export default function Login(){ const [email,setEmail]=useState('anna@demo.com'); const [password,setPassword]=useState('worker123');
async function submit(){ const r=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}); const j=await r.json(); localStorage.setItem('token',j.accessToken); alert('Logged in'); }
return <div className='container card'><h1>Login</h1><input value={email} onChange={e=>setEmail(e.target.value)}/><input type='password' value={password} onChange={e=>setPassword(e.target.value)}/><button onClick={submit}>Login</button></div>; }
