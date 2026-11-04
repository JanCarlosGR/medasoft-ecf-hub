/**
 * ============================================================================
 * MEDASOFT e-CF HUB - AUTOMATED INTEGRATION TEST SUITE
 * ============================================================================
 * Author: Vector (Senior QA Automation Engineer)
 * Scope: End-to-End API contracts, DGII e-NCF validation rules, tax calculations,
 *        duplicate detection, and lifecycle status tracking.
 * ============================================================================
 */

import assert from 'node:assert/strict';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  process.stdout.write(`  [TEST] ${name} ... `);
  try {
    await fn();
    console.log('\x1b[32mPASSED\x1b[0m');
    passedTests++;
  } catch (err) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error(`         \x1b[31mError: ${err.message}\x1b[0m`);
    failedTests++;
  }
}

async function main() {
  console.log('\n===============================================================');
  console.log(' VECTOR QA AUTOMATION SUITE: Medasoft e-CF Hub (DGII Engine)');
  console.log(` Target Server: ${BASE_URL}`);
  console.log('===============================================================\n');

  // Test 1: Healthcheck
  await runTest('GET /health returns HTTP 200 with status UP', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.equal(res.status, 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.status, 'UP');
    assert.equal(data.compliance, 'DGII Ley 32-23 República Dominicana');
  });

  // Test 2: DGII WebService Connectivity
  await runTest('GET /api/dgii/status returns OPERATIONAL status for all microservices', async () => {
    const res = await fetch(`${BASE_URL}/api/dgii/status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.connected, true);
    assert.equal(data.services.recepcionECF, 'OPERATIONAL');
    assert.equal(data.services.timbradoDigital, 'OPERATIONAL');
  });

  // Test 3: List Invoices Seed Check
  await runTest('GET /api/invoices returns initial seed list of invoices', async () => {
    const res = await fetch(`${BASE_URL}/api/invoices`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.count >= 2, `Expected at least 2 seeded invoices, got ${data.count}`);
  });

  // Test 4: Validate e-NCF Endpoint (Positive cases)
  await runTest('POST /api/invoices/validate-ncf accepts compliant E31 format', async () => {
    const res = await fetch(`${BASE_URL}/api/invoices/validate-ncf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ncf: 'E310000000099' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.valid, true);
    assert.equal(data.type, 'E31');
  });

  // Test 5: Validate e-NCF Endpoint (Negative cases)
  await runTest('POST /api/invoices/validate-ncf rejects invalid NCF structure', async () => {
    const res = await fetch(`${BASE_URL}/api/invoices/validate-ncf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ncf: 'B310000000001' }) // 13 chars pero con prefijo B no electrónico
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.valid, false);
    assert.ok(data.error.includes('Debe iniciar con la letra \'E\''));
  });

  // Test 6: Emission with exact ITBIS 18% calculation
  const uniqueNcf = `E31${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  await runTest('POST /api/invoices calculates exact 18% ITBIS and returns TrackID', async () => {
    const payload = {
      ncf: uniqueNcf,
      emisorRnc: '131456789',
      compradorRnc: '101234567',
      compradorNombre: 'BANCO MULTIPLE DEL CARIBE SA',
      fechaEmision: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'Licencia Software Medasoft Facturación',
          quantity: 2,
          unitPrice: 20000,
          isTaxable: true
        }
      ]
    };

    const res = await fetch(`${BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201, `Failed to create invoice: ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.ncf, uniqueNcf);
    assert.equal(data.data.subtotal, 40000.00);
    assert.equal(data.data.itbisTotal, 7200.00); // 40,000 * 0.18
    assert.equal(data.data.montoTotal, 47200.00);
    assert.equal(data.data.status, 'ACCEPTED');
    assert.ok(data.data.trackId && data.data.trackId.length > 20, 'Missing or short trackId');
  });

  // Test 7: Duplicate NCF prevention
  await runTest('POST /api/invoices prevents duplicate e-NCF emission with HTTP 409', async () => {
    const payload = {
      ncf: uniqueNcf, // Same NCF as test 6
      emisorRnc: '131456789',
      compradorRnc: '101234567',
      compradorNombre: 'DUPLICATE ATTEMPT INC',
      items: [{ description: 'Test', quantity: 1, unitPrice: 100 }]
    };

    const res = await fetch(`${BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 409, `Expected 409 Conflict, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.message.includes('ya fue emitido previamente'));
  });

  // Test 8: Rejection on invalid payload (Negative price)
  await runTest('POST /api/invoices rejects invalid item prices (negative amount)', async () => {
    const payload = {
      ncf: `E31${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      emisorRnc: '131456789',
      compradorRnc: '101234567',
      compradorNombre: 'INVALID TEST CLIENT',
      items: [{ description: 'Test Line', quantity: 1, unitPrice: -500 }]
    };

    const res = await fetch(`${BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.errors.some(e => e.includes('no puede ser negativo')));
  });

  // Summary
  console.log('\n---------------------------------------------------------------');
  console.log(` RESULTS: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('---------------------------------------------------------------\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed completely:', err);
  process.exit(1);
});
