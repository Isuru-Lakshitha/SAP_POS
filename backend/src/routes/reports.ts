import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, requireRole, AuthRequest } from './auth';

const router = Router();

// 1. Current stock in hand report (Cost, Quantity, Wholesale, Retail)
router.get('/stock-in-hand', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { locationId } = req.query;

    const whereClause = locationId ? { locationId: parseInt(locationId as string) } : {};

    // Get all stock entries grouped by Item and Location
    const stocks = await prisma.stock.findMany({
      where: whereClause,
      include: {
        item: true,
        location: true
      },
      orderBy: [
        { location: { name: 'asc' } },
        { item: { name: 'asc' } }
      ]
    });

    // Calculate report summaries
    let totalQuantity = 0;
    let totalCostVal = 0;
    let totalWholesaleVal = 0;
    let totalRetailVal = 0;

    const records = stocks.map(s => {
      const costVal = s.item.cost * s.quantity;
      const wholesaleVal = s.item.wholesalePrice * s.quantity;
      const retailVal = s.item.retailPrice * s.quantity;

      totalQuantity += s.quantity;
      totalCostVal += costVal;
      totalWholesaleVal += wholesaleVal;
      totalRetailVal += retailVal;

      return {
        stockId: s.id,
        location: s.location.name,
        locationType: s.location.type,
        itemId: s.item.id,
        itemCode: s.item.code,
        itemName: s.item.name,
        quantity: s.quantity,
        cost: s.item.cost,
        wholesalePrice: s.item.wholesalePrice,
        retailPrice: s.item.retailPrice,
        totalCostValue: costVal,
        totalWholesaleValue: wholesaleVal,
        totalRetailValue: retailVal
      };
    });

    res.json({
      summary: {
        totalQuantity,
        totalCostVal,
        totalWholesaleVal,
        totalRetailVal
      },
      records
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to determine if a warranty period is still active
function isWarrantyActive(startDateStr: string | Date, durationStr: string): { active: boolean; expiryDate: Date | null } {
  const startDate = new Date(startDateStr);
  if (isNaN(startDate.getTime())) return { active: false, expiryDate: null };

  const duration = durationStr.toLowerCase().trim();
  const expiryDate = new Date(startDate);

  if (duration.includes('year')) {
    const num = parseInt(duration) || 1;
    expiryDate.setFullYear(startDate.getFullYear() + num);
  } else if (duration.includes('month')) {
    const num = parseInt(duration) || 6;
    expiryDate.setMonth(startDate.getMonth() + num);
  } else if (duration.includes('day')) {
    const num = parseInt(duration) || 30;
    expiryDate.setDate(startDate.getDate() + num);
  } else {
    // If "No Warranty" or unrecognizable
    return { active: false, expiryDate: null };
  }

  const active = expiryDate.getTime() > Date.now();
  return { active, expiryDate };
}

// 2. Warranty Search by Serial Number
router.get('/warranty-search', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { serial } = req.query;

    if (!serial) {
      return res.status(400).json({ error: 'Serial number query parameter is required.' });
    }

    const dbSerial = await prisma.serial.findUnique({
      where: { serialNumber: serial as string },
      include: {
        item: true,
        supplier: true,
        location: true
      }
    });

    if (!dbSerial) {
      return res.status(404).json({ error: `Serial number "${serial}" not found in system.` });
    }

    // Check if it was sold to find purchase invoice
    let saleDetails = null;
    let warrantyAvailability = 'Inactive';
    let expiryDate: Date | null = null;

    if (dbSerial.status === 'SOLD' && dbSerial.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: dbSerial.invoiceId },
        include: {
          customer: true,
          cashier: { select: { username: true } },
          cartItems: {
            where: { itemId: dbSerial.itemId }
          }
        }
      });

      if (invoice) {
        // Use custom checkout warranty period if available, otherwise fallback to item's default
        const invoiceWarranty = invoice.cartItems[0]?.warrantyPeriod || dbSerial.item.warrantyPeriod;
        const wCheck = isWarrantyActive(invoice.date, invoiceWarranty);

        warrantyAvailability = wCheck.active ? 'Active' : 'Expired';
        expiryDate = wCheck.expiryDate;

        saleDetails = {
          invoiceNumber: invoice.invoiceNumber,
          soldDate: invoice.date,
          customerName: invoice.customer?.name || 'Walk-in',
          customerPhone: invoice.customer?.telephone || '—',
          cashier: invoice.cashier.username,
          warrantyPeriod: invoiceWarranty
        };
      }
    } else {
      // Still in stock, checking warranty relative to purchase date
      const wCheck = isWarrantyActive(dbSerial.purchaseDate, dbSerial.item.warrantyPeriod);
      warrantyAvailability = wCheck.active ? 'Active (Unsold)' : 'Expired (Unsold)';
      expiryDate = wCheck.expiryDate;
    }

    res.json({
      serialNumber: dbSerial.serialNumber,
      itemCode: dbSerial.item.code,
      itemName: dbSerial.item.name,
      status: dbSerial.status,
      purchaseDate: dbSerial.purchaseDate,
      supplierName: dbSerial.supplier?.name || 'Unknown / Manual Seed',
      location: dbSerial.location.name,
      warrantyAvailability,
      warrantyExpiry: expiryDate,
      saleDetails
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Stock Transfer logs report
router.get('/transfers', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, fromLoc, toLoc } = req.query;

    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate as string);
      if (endDate) whereClause.date.lte = new Date(endDate as string);
    }

    if (fromLoc) whereClause.fromLocationId = parseInt(fromLoc as string);
    if (toLoc) whereClause.toLocationId = parseInt(toLoc as string);

    const transfers = await prisma.stockTransfer.findMany({
      where: whereClause,
      include: {
        fromLocation: true,
        toLocation: true,
        cashier: { select: { username: true } },
        transferItems: {
          include: {
            item: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json(transfers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Profit Viewer (Date range filter)
router.get('/profit-viewer', authenticateToken, requireRole(['ADMIN', 'SUPERADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate as string);
      if (endDate) whereClause.date.lte = new Date(endDate as string);
    }

    // Fetch invoices in date range including cart items and their original cost
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true,
        cashier: { select: { username: true } },
        location: true,
        cartItems: {
          include: {
            item: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalProfit = 0;

    const invoiceProfits = invoices.map(inv => {
      // Calculate Cost of Goods Sold for this invoice
      let invoiceCogs = 0;
      inv.cartItems.forEach(cartItem => {
        // Use cost of product at that time (fallback to current item cost)
        const costPrice = cartItem.item.cost || 0;
        invoiceCogs += (costPrice * cartItem.quantity);
      });

      const invoiceProfit = inv.finalAmount - invoiceCogs;

      totalRevenue += inv.finalAmount;
      totalCogs += invoiceCogs;
      totalProfit += invoiceProfit;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        location: inv.location.name,
        customer: inv.customer?.name || 'Walk-in',
        cashier: inv.cashier.username,
        revenue: inv.finalAmount,
        cogs: invoiceCogs,
        profit: invoiceProfit
      };
    });

    res.json({
      summary: {
        totalRevenue,
        totalCogs,
        totalProfit
      },
      records: invoiceProfits
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
