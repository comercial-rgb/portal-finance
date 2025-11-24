#!/usr/bin/env node

/**
 * Script para resetar Rate Limiting durante desenvolvimento
 * Uso: node backend/scripts/resetRateLimit.js
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/dev/reset-rate-limit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🔄 Resetando rate limiting...');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅', response.message);
      console.log('📊 Estatísticas:');
      console.log('   Antes:', JSON.stringify(response.before, null, 2));
      console.log('   Depois:', JSON.stringify(response.after, null, 2));
    } catch (error) {
      console.log('Resposta:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro ao resetar:', error.message);
  console.log('💡 Certifique-se de que o backend está rodando na porta 5000');
});

req.end();
