import express, { Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole, AuthRequest } from './auth';

const router = express.Router();

// 1. Full Database JSON Backup
router.get('/backup', authenticateToken, requireRole(['SUPERADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const backup = {
      timestamp: new Date(),
      users: await prisma.user.findMany(),
      locations: await prisma.location.findMany(),
      suppliers: await prisma.supplier.findMany(),
      items: await prisma.item.findMany(),
      stocks: await prisma.stock.findMany(),
      serials: await prisma.serial.findMany(),
      grns: await prisma.gRN.findMany(),
      grnItems: await prisma.gRNItem.findMany(),
      customers: await prisma.customer.findMany(),
      invoices: await prisma.invoice.findMany(),
      cartItems: await prisma.cartItem.findMany(),
      stockTransfers: await prisma.stockTransfer.findMany(),
      stockTransferItems: await prisma.stockTransferItem.findMany(),
      ledgerAccounts: await prisma.ledgerAccount.findMany(),
      ledgerTransactions: await prisma.ledgerTransaction.findMany()
    };

    res.json(backup);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Full Database JSON Restore
router.post('/restore', authenticateToken, requireRole(['SUPERADMIN', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    if (!data.timestamp || !data.users || !data.locations) {
      return res.status(400).json({ error: 'Invalid backup file structure' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing data in reverse order
      await tx.ledgerTransaction.deleteMany();
      await tx.cartItem.deleteMany();
      await tx.stockTransferItem.deleteMany();
      await tx.stockTransfer.deleteMany();
      await tx.invoice.deleteMany();
      await tx.gRNItem.deleteMany();
      await tx.gRN.deleteMany();
      await tx.serial.deleteMany();
      await tx.stock.deleteMany();
      await tx.item.deleteMany();
      await tx.supplier.deleteMany();
      await tx.customer.deleteMany();
      await tx.ledgerAccount.deleteMany();
      await tx.user.deleteMany();
      await tx.location.deleteMany();

      // 2. Insert data in forward order
      if (data.locations.length) await tx.location.createMany({ data: data.locations });
      if (data.users.length) await tx.user.createMany({ data: data.users });
      if (data.ledgerAccounts.length) await tx.ledgerAccount.createMany({ data: data.ledgerAccounts });
      if (data.customers.length) await tx.customer.createMany({ data: data.customers });
      if (data.suppliers?.length) await tx.supplier.createMany({ data: data.suppliers });
      if (data.items.length) await tx.item.createMany({ data: data.items });
      if (data.stocks.length) await tx.stock.createMany({ data: data.stocks });
      if (data.serials.length) await tx.serial.createMany({ data: data.serials });
      if (data.grns.length) await tx.gRN.createMany({ data: data.grns });
      if (data.grnItems.length) await tx.gRNItem.createMany({ data: data.grnItems });
      if (data.invoices.length) await tx.invoice.createMany({ data: data.invoices });
      if (data.cartItems.length) await tx.cartItem.createMany({ data: data.cartItems });
      if (data.stockTransfers?.length) await tx.stockTransfer.createMany({ data: data.stockTransfers });
      if (data.stockTransferItems?.length) await tx.stockTransferItem.createMany({ data: data.stockTransferItems });
      if (data.ledgerTransactions.length) await tx.ledgerTransaction.createMany({ data: data.ledgerTransactions });

      // 3. Reset sequences in PostgreSQL using raw query
      const tables = ['Location', 'User', 'LedgerAccount', 'Customer', 'Supplier', 'Item', 'Stock', 'Serial', 'GRN', 'GRNItem', 'Invoice', 'CartItem', 'StockTransfer', 'StockTransferItem', 'LedgerTransaction'];
      for (const table of tables) {
        try {
            await tx.$executeRawUnsafe(`SELECT setval('"${table}_id_seq"', COALESCE((SELECT MAX(id)+1 FROM "${table}"), 1), false);`);
        } catch(e) {
            console.log("Could not reset sequence for " + table, e);
        }
      }
    });

    res.json({ message: 'Database restored successfully' });
  } catch (error: any) {
    console.error('Restore Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
