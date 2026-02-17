'use client';
import { useEffect, useState } from 'react'; import { API, token } from '../../../components/api';
export default function Task({ params }: any){ const [task,setTask]=useState<any>(); const [msg,setMsg]=useState('');
useEffect(()=>{fetch(`${API}/tasks/${params.id}`,{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(setTask)},[params.id]);
if(!task) return <div className='container'>Loading...</div>;
return <div className='container card'><h1>{task.title}</h1><p>{task.description}</p><button onClick={async()=>{await fetch(`${API}/tasks/${task.id}/accept`,{method:'POST',headers:{Authorization:`Bearer ${token()}`}});location.reload();}}>Accept</button>
<textarea value={msg} onChange={e=>setMsg(e.target.value)} /><button onClick={async()=>{await fetch(`${API}/tasks/${task.id}/messages`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify({content:msg})});setMsg('')}}>Send</button></div>; }
