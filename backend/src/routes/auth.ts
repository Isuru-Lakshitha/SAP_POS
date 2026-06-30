import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sap-pos-super-secret-key-9876';

// Middleware to verify JWT token and attach user info
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded as { id: number; username: string; role: string };
    next();
  });
}

// Middleware to check roles
export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}

// Register user (Protected)
router.post('/register', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role, locationId } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const creatorRole = req.user?.role;
    if (!creatorRole || !['ADMIN', 'SUPERADMIN'].includes(creatorRole)) {
      return res.status(403).json({ error: 'Forbidden: Only administrators can register operators' });
    }

    // Default target role to 'USER' if not specified
    const targetRole = role || 'USER';

    // Guard: Admin can only create regular 'USER' operators, cannot create admins
    if (creatorRole === 'ADMIN' && targetRole !== 'USER') {
      return res.status(403).json({ error: 'Forbidden: Administrators can only register standard User/Cashier accounts' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: targetRole,
        status: 'ACTIVE',
        locationId: locationId ? parseInt(locationId) : null
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'PASSWORD_RESET_REQUESTED') {
      return res.status(403).json({
        error: 'Your password reset request is pending admin approval. You cannot login until it is approved.'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Request Password Reset (Public endpoint)
router.post('/reset-request', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'SUPERADMIN') {
      return res.status(400).json({ error: 'Superadmin password cannot be reset this way.' });
    }

    await prisma.user.update({
      where: { username },
      data: { status: 'PASSWORD_RESET_REQUESTED' }
    });

    res.json({ message: 'Password reset request submitted successfully. Please contact your admin for approval.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Pending password resets (Admins/Superadmins only)
router.get('/pending-resets', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { status: 'PASSWORD_RESET_REQUESTED' },
      select: { id: true, username: true, role: true, status: true }
    });
    res.json(pendingUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve Password Reset & set new password (Admins/Superadmins only)
router.post('/reset-approve', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'User ID and new password are required' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevents non-superadmin from modifying a superadmin or other admin if they don't have permission
    if (targetUser.role === 'SUPERADMIN') {
      return res.status(403).json({ error: 'Cannot modify Superadmin' });
    }
    if (targetUser.role === 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Only Superadmin can reset Admin passwords' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        status: 'ACTIVE'
      }
    });

    res.json({ message: `Password reset approved and updated for user ${targetUser.username}.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (Admins/Superadmins only)
router.get('/users', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    // Superadmin sees all. Admin sees everyone except Superadmin.
    const users = await prisma.user.findMany({
      where: req.user?.role === 'SUPERADMIN' ? {} : { role: { not: 'SUPERADMIN' } },
      select: { id: true, username: true, role: true, status: true }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role (Admins/Superadmins only)
router.put('/users/:id/role', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id as string);
    const { role } = req.body;

    if (!role || !['ADMIN', 'USER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be ADMIN or USER.' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'SUPERADMIN') {
      return res.status(403).json({ error: 'Cannot change Superadmin role' });
    }

    // Admins can only update regular users. Superadmins can update anyone.
    if (req.user?.role !== 'SUPERADMIN' && targetUser.role === 'ADMIN') {
      return res.status(403).json({ error: 'Only Superadmin can modify Admin roles' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, username: true, role: true }
    });

    res.json({ message: 'User role updated successfully', user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (Admins/Superadmins only)
router.delete('/users/:id', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id as string);

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'SUPERADMIN') {
      return res.status(403).json({ error: 'Cannot delete Superadmin' });
    }

    if (req.user?.role !== 'SUPERADMIN' && targetUser.role === 'ADMIN') {
      return res.status(403).json({ error: 'Only Superadmin can delete Admin accounts' });
    }

    await prisma.user.delete({
      where: { id: targetUserId }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
