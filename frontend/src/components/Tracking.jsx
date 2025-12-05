import React, {useState} from 'react'
import { fetchJSON } from '../services/api'

export default function Tracking(){
  const [trackingId, setTrackingId] = useState('')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)

  async function lookup(e){
    e.preventDefault()
    try{
      setError(null)
      const data = await fetchJSON(`/orders/${trackingId}`)
      setOrder(data)
    }catch(err){
      console.error(err)
      setError('Not found')
      setOrder(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Track Order</h1>
      <form onSubmit={lookup} className="flex gap-2 mb-4">
        <input value={trackingId} onChange={e=>setTrackingId(e.target.value)} placeholder="Order ID" className="p-2 border rounded" />
        <button className="px-3 py-2 bg-indigo-600 text-white rounded">Find</button>
      </form>

      {error && <div className="text-red-600">{error}</div>}
      {order && (
        <div className="bg-white p-4 rounded shadow">
          <div className="font-semibold">Status: {order.status}</div>
          <div>Pickup: {order.pickup}</div>
          <div>Drop: {order.drop}</div>
        </div>
      )}
    </div>
  )
}
