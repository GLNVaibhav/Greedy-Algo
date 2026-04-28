function allocate(patients, totalSlots) {
  const arr = patients.map(p => ({
    name: String(p.name || ''),
    emergency: Number(p.emergency) || 0,
    req_time: Number(p.req_time) || 0,
    allocated: 0
  }));

  arr.sort((a, b) => b.emergency - a.emergency);

  let remaining = Number(totalSlots) || 0;
  for (let i = 0; i < arr.length; i++) {
    if (remaining <= 0) break;
    if (arr[i].req_time <= remaining) {
      arr[i].allocated = arr[i].req_time;
      remaining -= arr[i].req_time;
    } else {
      arr[i].allocated = remaining;
      remaining = 0;
    }
  }

  return { totalSlots: Number(totalSlots), patients: arr };
}

module.exports = { allocate };
