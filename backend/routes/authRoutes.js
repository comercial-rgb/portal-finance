const express = require('express');
const router = express.Router();
const {
  register,
  login,
  esqueciSenha,
  redefinirSenha,
  getMe,
  updateProfile,
  alterarSenha
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { rateLimitPresets } = require('../middleware/rateLimit');

router.post('/register', protect, authorize('admin', 'super_admin'), register);
router.post('/login', rateLimitPresets.auth, login);
router.post('/esqueci-senha', rateLimitPresets.auth, esqueciSenha);
router.put('/redefinir-senha/:resetToken', rateLimitPresets.auth, redefinirSenha);
router.get('/me', protect, rateLimitPresets.profile, getMe);
router.put('/profile', protect, rateLimitPresets.write, updateProfile);
router.put('/alterar-senha', protect, rateLimitPresets.write, alterarSenha);

module.exports = router;
