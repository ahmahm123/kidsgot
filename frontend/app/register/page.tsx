'use client';
import { useState } from 'react'; import { API } from '../../components/api';
export default function Register(){ const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
async function submit(){ await fetch(`${API}/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}); alert('Registered, check backend console for token'); }
return <div className='container card'><h1>Register</h1><input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)}/><input type='password' value={password} onChange={e=>setPassword(e.target.value)}/><button onClick={submit}>Create account</button></div>; }
