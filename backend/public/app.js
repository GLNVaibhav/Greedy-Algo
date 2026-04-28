function createPatientRow(name = '', emergency = 0, req_time = 0) {
  const container = document.createElement('div');
  container.className = 'patientRow';

  const nameInput = document.createElement('input');
  nameInput.placeholder = 'Name';
  nameInput.value = name;

  const emergencyInput = document.createElement('input');
  emergencyInput.type = 'number';
  emergencyInput.step = '0.1';
  emergencyInput.placeholder = 'Emergency %';
  emergencyInput.value = emergency;

  const reqInput = document.createElement('input');
  reqInput.type = 'number';
  reqInput.step = '0.1';
  reqInput.placeholder = 'Req. Time';
  reqInput.value = req_time;

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '✖';
  removeBtn.title = 'Remove';
  removeBtn.addEventListener('click', () => container.remove());

  container.appendChild(nameInput);
  container.appendChild(emergencyInput);
  container.appendChild(reqInput);
  container.appendChild(removeBtn);
  return container;
}

const patientsEl = document.getElementById('patients');
const addPatientBtn = document.getElementById('addPatient');
const clearBtn = document.getElementById('clearPatients');
const runBtn = document.getElementById('run');
const totalSlotsEl = document.getElementById('totalSlots');
const jsonOut = document.getElementById('jsonOut');
const resultTableBody = document.querySelector('#resultTable tbody');

addPatientBtn.addEventListener('click', () => {
  patientsEl.appendChild(createPatientRow());
});

clearBtn.addEventListener('click', () => {
  patientsEl.innerHTML = '';
});

// seed example
patientsEl.appendChild(createPatientRow('Alice', 90, 30));
patientsEl.appendChild(createPatientRow('Bob', 50, 30));

const formMessage = document.getElementById('formMessage');

function validateForm(patients, totalSlots) {
  if (!Array.isArray(patients) || patients.length === 0) return 'Add at least one patient with a name.';
  if (typeof totalSlots !== 'number' || Number.isNaN(totalSlots) || totalSlots <= 0) return 'Total slots must be a positive number.';
  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    if (!p.name || String(p.name).trim() === '') return `Patient #${i + 1}: name required.`;
    if (typeof p.emergency !== 'number' || p.emergency < 0 || p.emergency > 100) return `Patient ${p.name}: emergency must be 0-100.`;
    if (typeof p.req_time !== 'number' || p.req_time <= 0) return `Patient ${p.name}: req_time must be > 0.`;
  }
  return null;
}

async function doAllocate() {
  runBtn.disabled = true;
  runBtn.textContent = 'Allocating...';
  formMessage.textContent = '';

  const rows = Array.from(document.querySelectorAll('.patientRow'));
  const patients = rows.map(r => {
    const inputs = r.querySelectorAll('input');
    return {
      name: (inputs[0].value || '').trim(),
      emergency: Number(inputs[1].value) || 0,
      req_time: Number(inputs[2].value) || 0
    };
  }).filter(p => p.name !== '');

  const totalSlots = Number(totalSlotsEl.value);
  const validationError = validateForm(patients, totalSlots);
  if (validationError) {
    formMessage.textContent = validationError;
    runBtn.disabled = false;
    runBtn.textContent = 'Allocate';
    return;
  }

  try {
    const res = await fetch('/api/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patients, totalSlots })
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const data = await res.json();
    jsonOut.textContent = JSON.stringify(data, null, 2);

    // populate table
    resultTableBody.innerHTML = '';
    data.patients.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(p.name)}</td><td>${Number(p.emergency).toFixed(2)}</td><td>${Number(p.req_time).toFixed(2)}</td><td>${Number(p.allocated).toFixed(2)}</td>`;
      resultTableBody.appendChild(tr);
    });
    formMessage.textContent = 'Allocation successful.';
  } catch (err) {
    formMessage.textContent = 'Error: ' + err.message;
    jsonOut.textContent = '';
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = 'Allocate';
  }
}

runBtn.addEventListener('click', doAllocate);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}
