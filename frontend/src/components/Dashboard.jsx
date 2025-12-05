import React, {useEffect, useState} from 'react'
import { fetchJSON } from '../services/api'

export default function Dashboard(){
  const [stats, setStats] = useState({totalOrders:0, activeDrivers:0, vehicles:0})
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    const id = setInterval(load, 30000) // refresh
    return ()=>clearInterval(id)
  }, [])

  async function load(){
    setLoading(true)
    try {
      const s = await fetchJSON('/analytics')
      setStats({
        totalOrders: s.totalOrders || 0,
        activeDrivers: s.activeDrivers || 0,
        vehicles: s.vehicles || 0
      })
      const o = await fetchJSON('/orders')
      setOrders(o.slice(0,10))
    } catch (e){
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm">Total Orders</div>
          <div className="text-3xl font-semibold">{stats.totalOrders}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm">Active Drivers</div>
          <div className="text-3xl font-semibold">{stats.activeDrivers}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm">Vehicles</div>
          <div className="text-3xl font-semibold">{stats.vehicles}</div>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-2">Recent Orders</h2>
        {loading ? <div>Loading...</div> :
          <div className="space-y-2">
            {orders.map(o=>(
              <div key={o._id || o.id} className="bg-white p-3 rounded shadow flex justify-between">
                <div>
                  <div className="font-medium">{o.pickup || o.from || 'Unknown'}</div>
                  <div className="text-sm text-slate-500">{o.drop || o.to || ''}</div>
                </div>
                <div className="text-sm">{o.status || 'pending'}</div>
              </div>
            ))}
          </div>
        }
      </section>
    </div>
  )
}
