const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-finance');

    // Verificar se já existe um super admin
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });

    if (existingSuperAdmin) {
      console.log('⚠️  Super Admin já existe:', existingSuperAdmin.email);
      process.exit(0);
    }

    // Criar super admin
    const superAdmin = await User.create({
      nome: 'Super Administrador',
      email: 'admin@instasolutions.com',
      senha: 'admin123456',
      role: 'super_admin',
      ativo: true
    });

    console.log('✅ Super Admin criado com sucesso!');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Senha: admin123456');
    console.log('⚠️  Por favor, altere a senha após o primeiro login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar Super Admin:', error.message);
    process.exit(1);
  }
};

createSuperAdmin();
