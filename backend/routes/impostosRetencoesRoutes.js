const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getImpostos, updateImpostos } = require('../controllers/impostosRetencoesController');

router.get('/', protect, getImpostos);
router.put('/', protect, authorize('admin', 'super_admin'), updateImpostos);

module.exports = router;
