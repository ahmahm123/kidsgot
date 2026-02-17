'use client';
import { useEffect, useState } from 'react'; import { API, token } from '../../components/api'; import Link from 'next/link';
export default function Tasks(){ const [tasks,setTasks]=useState<any[]>([]); useEffect(()=>{fetch(`${API}/me/tasks`,{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(setTasks)},[]);
return <div className='container'><h1 className='text-xl mb-3'>My Tasks</h1>{tasks.map(t=><div key={t.id} className='card mb-2'><Link href={`/tasks/${t.id}`}>{t.title} - {t.status}</Link></div>)}</div>; }
