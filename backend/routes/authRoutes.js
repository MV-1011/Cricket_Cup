import express from 'express';
import {
  login,
  getCurrentUser,
  getAllUsers,
  updateUser
} from '../controllers/authController.js';

const router = express.Router();

// Login
router.post('/login', login);

// Get current user
router.get('/user/:userId', getCurrentUser);

// Get all users (for admin)
router.get('/users', getAllUsers);

// Update user
router.put('/user/:id', updateUser);

export default router;
