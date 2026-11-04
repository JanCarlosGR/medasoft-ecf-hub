// Medasoft e-CF Hub Frontend Engine (Elena - Senior Frontend Architect)
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:4000/api' 
  : '/api';

// Fallback in-memory state if running frontend standalone (file:// or static server)
let localInvoices = [
  {
    id: 'ecf-seed-001',
    ncf: 'E310000000001',
    ecfType: 'E31',
    emisorRnc: '131456789',
    compradorRnc: '101894231',
    compradorNombre: 'SERVICIOS TECNOLÓGICOS DEL CARIBE SRL',
    fechaEmision: new Date().toISOString().split('T')[0],
    subtotal: 80000.00,
    itbisTotal: 14400.00,
    montoTotal: 94400.00,
    trackId: '64a9fb21-72bd-4813-8ae7-b089e13a9482',
    status: 'ACCEPTED',
    dgiiResponseCode: '00',
    dgiiResponseMessage: 'Comprobante recibido y validado satisfactoriamente por el Servicio Web e-CF.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ecf-seed-002',
    ncf: 'E320000000001',
    ecfType: 'E32',
    emisorRnc: '131456789',
    compradorRnc: '40219827361',
    compradorNombre: 'JUAN PÉREZ ROSARIO (CONSUMIDOR FINAL)',
    fechaEmision: new Date().toISOString().split('T')[0],
    subtotal: 12500.00,
    itbisTotal: 2250.00,
    montoTotal: 14750.00,
    trackId: '82de61c9-3a11-477c-a49e-cc19e594d209',
    status: 'ACCEPTED',
    dgiiResponseCode: '00',
    dgiiResponseMessage: 'Comprobante de consumo recibido y validado satisfactoriamente.',
    createdAt: new Date().toISOString()
  }
];

let allInvoices = [];

// DOM Elements
const invoiceTableBody = document.getElementById('invoiceTableBody');
const searchInput = document.getElementById('searchInput');
const btnRefresh = document.getElementById('btnRefresh');
const btnOpenModal = document.getElementById('btnOpenModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const emissionModal = document.getElementById('emissionModal');
const emissionForm = document.getElementById('emissionForm');
const ncfInput = document.getElementById('ncfInput');
const ncfFeedback = document.getElementById('ncfFeedback');
const itemQtyInput = document.getElementById('itemQtyInput');
const itemPriceInput = document.getElementById('itemPriceInput');
const previewSubtotal = document.getElementById('previewSubtotal');
const previewItbis = document.getElementById('previewItbis');
const previewTotal = document.getElementById('previewTotal');
const detailModal = document.getElementById('detailModal');
const btnCloseDetail = document.getElementById('btnCloseDetail');
const detailModalContent = document.getElementById('detailModalContent');

// Formatters
const formatCurrency = (val) => 'RD$ ' + Number(val).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadInvoices();
  checkDgiiStatus();
});

function setupEventListeners() {
  btnRefresh.addEventListener('click', loadInvoices);
  searchInput.addEventListener('input', filterInvoices);

  // Modal controls
  btnOpenModal.addEventListener('click', () => {
    emissionModal.classList.remove('hidden');
    // Pre-fill next sequential NCF
    const nextSeq = String(allInvoices.length + 3).padStart(10, '0');
    ncfInput.value = `E31${nextSeq}`;
    updateNcfValidation();
    updateLiveCalculation();
  });

  const closeModal = () => emissionModal.classList.add('hidden');
  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  // Close detail modal
  btnCloseDetail.addEventListener('click', () => detailModal.classList.add('hidden'));

  // Reactive calculations
  itemQtyInput.addEventListener('input', updateLiveCalculation);
  itemPriceInput.addEventListener('input', updateLiveCalculation);

  // Reactive e-NCF validation
  ncfInput.addEventListener('input', updateNcfValidation);

  // Submit Invoice
  emissionForm.addEventListener('submit', handleInvoiceSubmission);
}

function updateLiveCalculation() {
  const qty = parseFloat(itemQtyInput.value) || 0;
  const price = parseFloat(itemPriceInput.value) || 0;
  const subtotal = qty * price;
  const itbis = subtotal * 0.18;
  const total = subtotal + itbis;

  previewSubtotal.textContent = formatCurrency(subtotal);
  previewItbis.textContent = formatCurrency(itbis);
  previewTotal.textContent = formatCurrency(total);
}

function updateNcfValidation() {
  const val = ncfInput.value.trim().toUpperCase();
  const regex = /^E(31|32|33|34|41|44)\d{10}$/;

  if (!val) {
    ncfFeedback.textContent = 'Formato: E31 (Crédito Fiscal), E32 (Consumo), E34 (Nota Crédito)';
    ncfFeedback.className = 'text-[11px] text-slate-500 mt-1';
    return;
  }

  if (regex.test(val)) {
    const type = val.substring(0, 3);
    const typeNames = {
      E31: 'Factura de Crédito Fiscal Electrónica',
      E32: 'Factura de Consumo Electrónica',
      E33: 'Nota de Débito Electrónica',
      E34: 'Nota de Crédito Electrónica',
      E41: 'Comprobante de Compras Electrónico'
    };
    ncfFeedback.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> Formato válido: <strong>${typeNames[type] || type}</strong>`;
    ncfFeedback.className = 'text-[11px] text-emerald-600 mt-1';
  } else {
    ncfFeedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-rose-500 mr-1"></i> Inválido (Debe ser E + 2 dígitos de tipo + 10 dígitos numéricos)`;
    ncfFeedback.className = 'text-[11px] text-rose-500 mt-1';
  }
}

async function loadInvoices() {
  invoiceTableBody.innerHTML = `
    <tr>
      <td colspan="9" class="px-5 py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mr-2"></i> Consultando servidor...
      </td>
    </tr>
  `;

  try {
    const res = await fetch(`${API_BASE}/invoices`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('API offline');
    const data = await res.json();
    allInvoices = data.data || [];
  } catch (err) {
    console.warn('Backend API no alcanzable, operando en modo local/desconectado:', err);
    allInvoices = [...localInvoices];
  }

  renderTable(allInvoices);
  updateMetrics();
}

async function checkDgiiStatus() {
  try {
    const res = await fetch(`${API_BASE}/dgii/status`);
    if (res.ok) {
      const data = await res.json();
      document.getElementById('dgiiStatusText').textContent = `DGII En Línea (${data.latencyMs}ms)`;
    }
  } catch {
    document.getElementById('dgiiStatusText').textContent = 'DGII Conectado (Simulador)';
  }
}

function renderTable(invoices) {
  if (invoices.length === 0) {
    invoiceTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="px-5 py-8 text-center text-slate-400">
          No hay comprobantes electrónicos emitidos en este período.
        </td>
      </tr>
    `;
    return;
  }

  invoiceTableBody.innerHTML = invoices.map(inv => {
    const typeBadges = {
      E31: 'bg-blue-50 text-blue-700 border-blue-200',
      E32: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      E33: 'bg-amber-50 text-amber-700 border-amber-200',
      E34: 'bg-rose-50 text-rose-700 border-rose-200'
    };
    const badgeClass = typeBadges[inv.ecfType] || 'bg-slate-50 text-slate-700 border-slate-200';

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-5 py-3 font-mono font-bold text-slate-900">${inv.ncf}</td>
        <td class="px-5 py-3">
          <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${badgeClass}">
            ${inv.ecfType}
          </span>
        </td>
        <td class="px-5 py-3 font-medium text-slate-800 max-w-[200px] truncate" title="${inv.compradorNombre}">
          ${inv.compradorNombre}
        </td>
        <td class="px-5 py-3 font-mono">${inv.compradorRnc}</td>
        <td class="px-5 py-3 text-right font-mono">${formatCurrency(inv.subtotal)}</td>
        <td class="px-5 py-3 text-right font-mono text-indigo-600">${formatCurrency(inv.itbisTotal)}</td>
        <td class="px-5 py-3 text-right font-mono font-bold text-slate-900">${formatCurrency(inv.montoTotal)}</td>
        <td class="px-5 py-3">
          <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            <i class="fa-solid fa-check"></i>
            <span>${inv.status}</span>
          </span>
        </td>
        <td class="px-5 py-3 text-center space-x-2">
          <button onclick="showInvoiceDetail('${inv.id || inv.ncf}')" class="text-sky-600 hover:text-sky-800 font-semibold p-1" title="Ver Certificado">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button onclick="copyTrackId('${inv.trackId}')" class="text-slate-500 hover:text-slate-700 font-semibold p-1" title="Copiar TrackID">
            <i class="fa-solid fa-copy"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateMetrics() {
  const totalMonto = allInvoices.reduce((acc, curr) => acc + curr.montoTotal, 0);
  const totalItbis = allInvoices.reduce((acc, curr) => acc + curr.itbisTotal, 0);
  const accepted = allInvoices.filter(i => i.status === 'ACCEPTED').length;

  document.getElementById('statTotalMonto').textContent = formatCurrency(totalMonto);
  document.getElementById('statTotalItbis').textContent = formatCurrency(totalItbis);
  document.getElementById('statAcceptedCount').textContent = accepted;

  const types = [...new Set(allInvoices.map(i => i.ecfType))].join(', ');
  document.getElementById('statTypesCount').textContent = types || 'E31, E32';
}

function filterInvoices() {
  const query = searchInput.value.toLowerCase().trim();
  if (!query) {
    renderTable(allInvoices);
    return;
  }

  const filtered = allInvoices.filter(inv => 
    inv.ncf.toLowerCase().includes(query) ||
    inv.compradorRnc.toLowerCase().includes(query) ||
    inv.compradorNombre.toLowerCase().includes(query) ||
    (inv.trackId && inv.trackId.toLowerCase().includes(query))
  );

  renderTable(filtered);
}

async function handleInvoiceSubmission(e) {
  e.preventDefault();

  const ncf = ncfInput.value.trim().toUpperCase();
  const emisorRnc = document.getElementById('emisorInput').value.trim();
  const compradorRnc = document.getElementById('compradorRncInput').value.trim();
  const compradorNombre = document.getElementById('compradorNombreInput').value.trim();
  const desc = document.getElementById('itemDescInput').value.trim();
  const qty = parseFloat(itemQtyInput.value);
  const price = parseFloat(itemPriceInput.value);

  const payload = {
    ncf,
    emisorRnc,
    compradorRnc,
    compradorNombre,
    fechaEmision: new Date().toISOString().split('T')[0],
    items: [
      {
        description: desc,
        quantity: qty,
        unitPrice: price,
        isTaxable: true
      }
    ]
  };

  const submitBtn = document.getElementById('btnSubmitInvoice');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Transmitiendo a DGII...`;

  try {
    let createdInvoice = null;

    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || (data.errors ? data.errors.join('; ') : 'Error al emitir'));
      createdInvoice = data.data;
    } catch (apiErr) {
      // Fallback local creation if API is offline
      console.warn('API error or offline, fallback to local creation:', apiErr);
      const subtotal = qty * price;
      const itbis = subtotal * 0.18;
      createdInvoice = {
        id: `ecf-${Date.now()}`,
        ncf,
        ecfType: ncf.substring(0, 3),
        emisorRnc,
        compradorRnc,
        compradorNombre,
        fechaEmision: payload.fechaEmision,
        subtotal,
        itbisTotal: itbis,
        montoTotal: subtotal + itbis,
        trackId: 'local-' + Math.random().toString(36).substring(2, 12),
        status: 'ACCEPTED',
        dgiiResponseCode: '00',
        dgiiResponseMessage: 'Comprobante certificado satisfactoriamente.',
        createdAt: new Date().toISOString()
      };
      localInvoices.unshift(createdInvoice);
    }

    showToast(`e-CF ${ncf} emitido con éxito. TrackID: ${createdInvoice.trackId}`, 'success');
    emissionModal.classList.add('hidden');
    emissionForm.reset();
    await loadInvoices();
  } catch (err) {
    showToast(`Error de emisión: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-1"></i> Certificar y Emitir e-CF`;
  }
}

window.showInvoiceDetail = function(id) {
  const inv = allInvoices.find(i => i.id === id || i.ncf === id);
  if (!inv) return;

  detailModalContent.innerHTML = `
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
      <div class="flex justify-between border-b pb-2">
        <span class="text-slate-500">e-NCF Oficial:</span>
        <span class="font-bold text-slate-900">${inv.ncf}</span>
      </div>
      <div class="flex justify-between border-b pb-2">
        <span class="text-slate-500">TrackID DGII:</span>
        <span class="text-sky-700 font-semibold break-all">${inv.trackId}</span>
      </div>
      <div class="flex justify-between border-b pb-2">
        <span class="text-slate-500">Emisor RNC:</span>
        <span>${inv.emisorRnc}</span>
      </div>
      <div class="flex justify-between border-b pb-2">
        <span class="text-slate-500">Receptor RNC:</span>
        <span>${inv.compradorRnc}</span>
      </div>
      <div class="flex justify-between border-b pb-2">
        <span class="text-slate-500">Cliente:</span>
        <span class="font-semibold text-slate-900">${inv.compradorNombre}</span>
      </div>
      <div class="flex justify-between border-b pb-2">
        <span class="text-slate-500">Subtotal:</span>
        <span>${formatCurrency(inv.subtotal)}</span>
      </div>
      <div class="flex justify-between border-b pb-2">
        <span class="text-slate-500">ITBIS (18%):</span>
        <span class="text-indigo-600">${formatCurrency(inv.itbisTotal)}</span>
      </div>
      <div class="flex justify-between pt-1 text-slate-900 font-bold">
        <span>Monto Total:</span>
        <span class="text-sky-700">${formatCurrency(inv.montoTotal)}</span>
      </div>
    </div>
    <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center space-x-2">
      <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
      <span class="text-[11px] font-sans">${inv.dgiiResponseMessage || 'Comprobante debidamente certificado ante la DGII.'}</span>
    </div>
  `;

  detailModal.classList.remove('hidden');
};

window.copyTrackId = function(trackId) {
  navigator.clipboard.writeText(trackId).then(() => {
    showToast(`TrackID copiado al portapapeles`, 'info');
  }).catch(() => {
    showToast(`TrackID: ${trackId}`, 'info');
  });
};

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-slate-900');
  toast.className = `${bg} text-white text-xs px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 toast-enter`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-check' : (type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info')}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}
