#!/usr/bin/env node

/**
 * Script para gerar chave JWT_SECRET segura
 * Uso: node scripts/generate-jwt-secret.js
 */

const crypto = require('crypto');

console.log('\n🔐 Gerando JWT_SECRET seguro...\n');

const secret = crypto.randomBytes(64).toString('hex');

console.log('───────────────────────────────────────────────────────');
console.log('JWT_SECRET gerado:');
console.log('───────────────────────────────────────────────────────');
console.log(secret);
console.log('───────────────────────────────────────────────────────\n');

console.log('✅ Copie e cole no arquivo .env:');
console.log(`JWT_SECRET=${secret}\n`);

console.log('⚠️  IMPORTANTE: Mantenha essa chave em segredo!\n');
