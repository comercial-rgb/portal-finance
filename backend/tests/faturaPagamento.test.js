const assert = require('node:assert/strict');
const { test } = require('node:test');
const Fatura = require('../models/Fatura');

test('preserva valor real de OP paga vinculada em fatura parcial', () => {
  const fatura = new Fatura({
    numeroFatura: 'FTEST-OP-PARCIAL',
    tipo: 'Fornecedor',
    fornecedor: '507f1f77bcf86cd799439011',
    periodoInicio: new Date('2026-04-16T00:00:00.000Z'),
    periodoFim: new Date('2026-04-17T00:00:00.000Z'),
    valorComDesconto: 71648.54,
    valorDevido: 59700.23,
    valorPagoRegistrado: 11000,
    ordensServico: [{
      ordemServico: '507f1f77bcf86cd799439012',
      statusPagamento: 'Paga',
      valorOS: 11000
    }]
  });

  fatura.recalcularPagamento();

  assert.equal(fatura.valorPago, 11000);
  assert.equal(fatura.valorRestante, 48700.23);
  assert.equal(fatura.statusFatura, 'Parcialmente paga');
});

test('mantem calculo proporcional quando pagamento vem apenas dos itens pagos', () => {
  const fatura = new Fatura({
    numeroFatura: 'FTEST-ITEM-PAGO',
    tipo: 'Fornecedor',
    fornecedor: '507f1f77bcf86cd799439011',
    periodoInicio: new Date('2026-04-16T00:00:00.000Z'),
    periodoFim: new Date('2026-04-17T00:00:00.000Z'),
    valorComDesconto: 71648.54,
    valorDevido: 59700.23,
    ordensServico: [{
      ordemServico: '507f1f77bcf86cd799439012',
      statusPagamento: 'Paga',
      valorOS: 11000
    }]
  });

  fatura.recalcularPagamento();

  assert.equal(fatura.valorPago, 9165.61);
  assert.equal(fatura.statusFatura, 'Parcialmente paga');
});
