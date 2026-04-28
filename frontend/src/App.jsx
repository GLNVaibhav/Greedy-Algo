import React, {useState} from 'react'

export default function App(){
  const [patients, setPatients] = useState([{name:'Alice', emergency:90, req_time:30}])
  const [totalSlots, setTotalSlots] = useState(60)
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState('')

  function addPatient(){ setPatients(p=>[...p,{name:'',emergency:0,req_time:0}]) }
  function clearPatients(){ setPatients([]); setResult(null); setMsg('') }

  async function allocate(){
    setMsg('')
    const valid = patients.length>0 && Number(totalSlots)>0
    if(!valid){ setMsg('Please add patients and positive totalSlots'); return }
    try{
      const res = await fetch('/api/allocate', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patients,totalSlots: Number(totalSlots)})})
      if(!res.ok) throw new Error('Server error')
      const data = await res.json()
      setResult(data)
      setMsg('Allocation successful')
    }catch(e){ setMsg('Error: '+e.message) }
  }

  function updatePatient(i, key, val){ setPatients(p=>{const np=[...p]; np[i]={...np[i],[key]: key==='name'?val: Number(val)}; return np}) }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">HealthQueue — Frontend</h1>
      <label className="block mb-2">Total Slots: <input className="ml-2 p-1 border" type="number" value={totalSlots} onChange={e=>setTotalSlots(e.target.value)} /></label>
      <div className="space-y-2">
        {patients.map((p,i)=> (
          <div key={i} className="flex gap-2 items-center">
            <input className="p-1 border" placeholder="Name" value={p.name} onChange={e=>updatePatient(i,'name',e.target.value)} />
            <input className="p-1 border" type="number" placeholder="Emergency%" value={p.emergency} onChange={e=>updatePatient(i,'emergency',e.target.value)} />
            <input className="p-1 border" type="number" placeholder="Req time" value={p.req_time} onChange={e=>updatePatient(i,'req_time',e.target.value)} />
          </div>
        ))}
      </div>
      <div className="mt-3 space-x-2">
        <button onClick={addPatient} className="px-3 py-1 bg-gray-200">Add</button>
        <button onClick={clearPatients} className="px-3 py-1 bg-gray-200">Clear</button>
        <button onClick={allocate} className="px-3 py-1 bg-blue-500 text-white">Allocate</button>
      </div>
      <div className="mt-4 text-red-600">{msg}</div>
      {result && (
        <pre className="mt-4 bg-gray-100 p-2">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  )
}
