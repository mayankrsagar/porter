import React, {useEffect, useState} from 'react'
import { fetchJSON } from '../services/api'

export default function Fleet(){
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{ load(); },[])

  async function load(){
    try{
      setLoading(true)
      const v = await fetchJSON('/vehicles')
      setVehicles(v)
    }catch(e){
      console.error(e)
    }finally{
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Fleet</h1>
      {loading ? <div>Loading...</div> :
        <div className="grid grid-cols-1 gap-3">
          {vehicles.map(v=>(
            <div key={v._id || v.id} className="bg-white p-3 rounded shadow">
              <div className="font-semibold">{v.driverName || 'Driver'}</div>
              <div className="text-sm">{v.vehicleNumber || v.plate}</div>
            </div>
          ))}
        </div>
      }
    </div>
  )
}
