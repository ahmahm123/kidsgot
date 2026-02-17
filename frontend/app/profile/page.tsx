'use client';
import { useState } from 'react'; import { API, token } from '../../components/api';
export default function Profile(){ const [form,setForm]=useState<any>({name:'',skills:['delivery'],languages:['en'],availability:true});
return <div className='container card'><h1>Profile</h1><textarea placeholder='Name' onChange={e=>setForm({...form,name:e.target.value})}/><textarea placeholder='Bio' onChange={e=>setForm({...form,bio:e.target.value})}/><button onClick={async()=>{await fetch(`${API}/me/profile`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`},body:JSON.stringify(form)});alert('Saved')}}>Save</button></div>; }
