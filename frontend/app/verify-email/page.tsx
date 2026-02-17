'use client';
import { useState } from 'react'; import { API } from '../../components/api';
export default function Verify(){ const [token,setToken]=useState('');
return <div className='container card'><h1>Verify Email</h1><input value={token} onChange={e=>setToken(e.target.value)}/><button onClick={async()=>{await fetch(`${API}/auth/verify-email`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});alert('Verified')}}>Verify</button></div>; }
