'use client';
import { useState } from 'react'; import { API, token } from '../../components/api';
export default function Admin(){ const [name,setName]=useState('Demo Agent'); const [result,setResult]=useState<any>(null);
return <div className='container card'><h1>Admin</h1><input value={name} onChange={e=>setName(e.target.value)} /><button onClick={async()=>{const r=await fetch(`${API}/admin/agent-clients`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify({name})});setResult(await r.json())}}>Create Agent API Key</button>{result && <pre>{JSON.stringify(result,null,2)}</pre>}</div>; }
