'use client';
import { useEffect, useState } from 'react'; import { API, token } from '../../components/api';
export default function Wallet(){ const [data,setData]=useState<any>({payouts:[]}); useEffect(()=>{fetch(`${API}/me/wallet`,{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(setData)},[]);
return <div className='container card'><h1>Wallet</h1>{data.payouts.map((p:any)=><div key={p.id}>{p.amount} - {p.status}</div>)}<button>Request Withdrawal (mock)</button></div>; }
