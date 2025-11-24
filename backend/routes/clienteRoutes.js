const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { protect } = require('../middleware/auth');
const { invalidateCache } = require('../middleware/cache');

// Todas as rotas requerem autenticação
router.use(protect);

// Rotas de clientes
router.get('/', clienteController.getClientes);
router.get('/:id', clienteController.getClienteById);
router.post('/', invalidateCache(['/clientes']), clienteController.createCliente);
router.put('/:id', invalidateCache(['/clientes']), clienteController.updateCliente);
router.delete('/:id', invalidateCache(['/clientes']), clienteController.deleteCliente);
router.patch('/:id/status', invalidateCache(['/clientes']), clienteController.toggleClienteStatus);

// Rotas de centros de custo
router.get('/:id/centros-custo', clienteController.getCentrosCusto);
router.post('/:id/centros-custo', invalidateCache(['/centros-custo', '/clientes']), clienteController.addCentroCusto);
router.delete('/:id/centros-custo/:ccId', invalidateCache(['/centros-custo', '/clientes']), clienteController.deleteCentroCusto);

// Rotas de subunidades
router.post('/:id/centros-custo/:ccId/subunidades', invalidateCache(['/centros-custo', '/clientes']), clienteController.addSubunidade);
router.delete('/:id/centros-custo/:ccId/subunidades/:subId', invalidateCache(['/centros-custo', '/clientes']), clienteController.deleteSubunidade);

// Rotas de contratos
router.get('/:id/contratos', clienteController.getContratos);
router.post('/:id/contratos', invalidateCache(['/contratos', '/clientes']), clienteController.addContrato);
router.put('/:id/contratos/:contratoId', invalidateCache(['/contratos', '/clientes']), clienteController.updateContrato);
router.delete('/:id/contratos/:contratoId', invalidateCache(['/contratos', '/clientes']), clienteController.deleteContrato);
router.patch('/:id/contratos/:contratoId/status', invalidateCache(['/contratos', '/clientes']), clienteController.toggleContratoStatus);

// Rotas de aditivos
router.post('/:id/contratos/:contratoId/aditivos', invalidateCache(['/contratos', '/clientes']), clienteController.addAditivo);
router.put('/:id/contratos/:contratoId/aditivos/:aditivoId', invalidateCache(['/contratos', '/clientes']), clienteController.updateAditivo);
router.delete('/:id/contratos/:contratoId/aditivos/:aditivoId', invalidateCache(['/contratos', '/clientes']), clienteController.deleteAditivo);
router.patch('/:id/contratos/:contratoId/aditivos/:aditivoId/status', invalidateCache(['/contratos', '/clientes']), clienteController.toggleAditivoStatus);

// Rotas de empenhos
router.get('/:id/contratos/:contratoId/empenhos', clienteController.getEmpenhos);
router.post('/:id/contratos/:contratoId/empenhos', invalidateCache(['/contratos', '/clientes']), clienteController.addEmpenho);
router.put('/:id/contratos/:contratoId/empenhos/:empenhoId', invalidateCache(['/contratos', '/clientes']), clienteController.updateEmpenho);
router.delete('/:id/contratos/:contratoId/empenhos/:empenhoId', invalidateCache(['/contratos', '/clientes']), clienteController.deleteEmpenho);
router.patch('/:id/contratos/:contratoId/empenhos/:empenhoId/status', invalidateCache(['/contratos', '/clientes']), clienteController.toggleEmpenhoStatus);

module.exports = router;
