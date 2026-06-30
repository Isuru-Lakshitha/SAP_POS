import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole, AuthRequest } from './auth';

const router = Router();

// Get balances for all ledger accounts
router.get('/balances', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const balances = await prisma.ledgerAccount.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(balances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get transactions for all ledger accounts, with optional filter by account ID
router.get('/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.query;

    const whereClause = accountId ? { ledgerAccountId: parseInt(accountId as string) } : {};

    const transactions = await prisma.ledgerTransaction.findMany({
      where: whereClause,
      include: {
        ledgerAccount: true,
        invoice: {
          include: {
            customer: true,
            cashier: { select: { username: true } }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post a manual adjustment (Admin only)
router.post('/adjust', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, amount, type, description } = req.body;

    if (!accountId || !amount || !type || !description) {
      return res.status(400).json({ error: 'Account ID, amount, type (DEBIT/CREDIT), and description are required.' });
    }

    if (!['DEBIT', 'CREDIT'].includes(type)) {
      return res.status(400).json({ error: 'Type must be DEBIT (inflow) or CREDIT (outflow).' });
    }

    const account = await prisma.ledgerAccount.findUnique({
      where: { id: parseInt(accountId) }
    });

    if (!account) {
      return res.status(404).json({ error: 'Ledger account not found' });
    }

    const adjustAmt = parseFloat(amount);
    const multiplier = type === 'DEBIT' ? 1 : -1;

    const transaction = await prisma.$transaction(async (tx) => {
      // Update account balance
      const updatedAccount = await tx.ledgerAccount.update({
        where: { id: account.id },
        data: { balance: account.balance + (adjustAmt * multiplier) }
      });

      // Create ledger transaction record
      const txn = await tx.ledgerTransaction.create({
        data: {
          ledgerAccountId: account.id,
          amount: adjustAmt,
          type,
          description: `Adjustment: ${description}`
        },
        include: {
          ledgerAccount: true
        }
      });

      return txn;
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
