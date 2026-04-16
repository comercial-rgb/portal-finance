const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
console.log('Connecting to:', MONGODB_URI?.substring(0, 30) + '...');

mongoose.connect(MONGODB_URI, { family: 4 }).then(async () => {
  console.log('Connected!');
  
  const OS = mongoose.connection.db.collection('ordemservicos');
  
  // Count total
  const total = await OS.countDocuments({});
  console.log('Total OS:', total);
  
  // Count by status
  const statuses = await OS.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray();
  console.log('By status:', statuses);
  
  // Count faturadoFornecedor values
  const fatForn = await OS.aggregate([
    { $group: { _id: { $type: '$faturadoFornecedor' }, val: { $first: '$faturadoFornecedor' }, count: { $sum: 1 } } }
  ]).toArray();
  console.log('faturadoFornecedor types:', fatForn);
  
  // Test the exact query the backend runs
  const queryResult = await OS.countDocuments({
    status: { $in: ['Autorizada', 'Aguardando pagamento', 'Paga'] },
    faturadoFornecedor: { $ne: true }
  });
  console.log('Query with $ne true result:', queryResult);
  
  // Test with just status filter
  const statusOnly = await OS.countDocuments({
    status: { $in: ['Autorizada', 'Aguardando pagamento', 'Paga'] }
  });
  console.log('Query status only:', statusOnly);
  
  // Test with faturadoFornecedor=false exact
  const exactFalse = await OS.countDocuments({ faturadoFornecedor: false });
  console.log('Exact faturadoFornecedor=false:', exactFalse);
  
  // Test $ne true
  const neTrue = await OS.countDocuments({ faturadoFornecedor: { $ne: true } });
  console.log('faturadoFornecedor $ne true:', neTrue);
  
  // Check OP counter
  const counters = mongoose.connection.db.collection('counters');
  const opCounter = await counters.findOne({ _id: 'ordemPagamento' });
  console.log('OP Counter:', opCounter);
  
  // Check max OP code
  const maxOP = await mongoose.connection.db.collection('ordempagamentos').find({ codigo: { $regex: /^OP-\d+$/ } }).sort({ codigo: -1 }).limit(5).toArray();
  console.log('Top 5 OP codes:', maxOP.map(o => o.codigo));
  
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
