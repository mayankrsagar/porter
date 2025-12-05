import React, {useState} from 'react'
import { API_BASE_URL } from '../services/api'

export default function Booking(){
  const [form, setForm] = useState({pickup:'', drop:'', name:'', phone:''})
  const [status, setStatus] = useState(null)

  async function submit(e){
    e.preventDefault()
    try{
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method:'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(form)
      })
      if(!res.ok) throw new Error('Error creating booking')
      const data = await res.json()
      setStatus({ok:true, msg:'Booking created', data})
      setForm({pickup:'', drop:'', name:'', phone:''})
    }catch(e){
      console.error(e)
      setStatus({ok:false, msg:e.message})
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Create Booking</h1>
      <form onSubmit={submit} className="space-y-3 max-w-md">
        <div>
          <label className="block text-sm">Pickup</label>
          <input value={form.pickup} onChange={e=>setForm({...form, pickup:e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm">Drop</label>
          <input value={form.drop} onChange={e=>setForm({...form, drop:e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm">Name</label>
          <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm">Phone</label>
          <input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Create</button>
        {status && <div className={'mt-2 ' + (status.ok ? 'text-green-700' : 'text-red-700')}>{status.msg}</div>}
      </form>
    </div>
  )
}
