import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthRequest } from './auth';

const router = Router();

// ================= CUSTOMERS =================

router.get('/customers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, telephone, address, isCreditCorporate } = req.body;
    if (!name || !telephone) {
      return res.status(400).json({ error: 'Name and telephone are required' });
    }
    const existing = await prisma.customer.findUnique({
      where: { telephone }
    });
    if (existing) {
      return res.status(400).json({ error: 'Customer with this telephone number already exists' });
    }
    const customer = await prisma.customer.create({
      data: {
        name,
        telephone,
        address,
        isCreditCorporate: !!isCreditCorporate,
        balance: 0.0
      }
    });
    res.status(201).json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/customers/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, telephone, address, isCreditCorporate, balance } = req.body;
    const id = parseInt(req.params.id as string);
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        telephone,
        address,
        isCreditCorporate,
        balance: balance !== undefined ? parseFloat(balance) : undefined
      }
    });
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ================= SUPPLIERS =================

// Get all suppliers
router.get('/suppliers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(suppliers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new supplier
router.post('/suppliers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, telephone, email, address } = req.body;
    if (!name || !telephone) {
      return res.status(400).json({ error: 'Supplier Name and Telephone are required.' });
    }
    const existing = await prisma.supplier.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Supplier name already registered.' });
    }
    const supplier = await prisma.supplier.create({
      data: { name, telephone, email, address }
    });
    res.status(201).json(supplier);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ================= ITEMS (PRODUCTS & SERVICES) =================

router.get('/items', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/items', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, cost, wholesalePrice, retailPrice, warrantyPeriod, requiresSerial, type, description } = req.body;
    if (!code || !name || retailPrice === undefined) {
      return res.status(400).json({ error: 'SKU Code, name, and retail price are required' });
    }
    const existing = await prisma.item.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Product with this SKU Code already exists' });
    }
    const item = await prisma.item.create({
      data: {
        code,
        name,
        cost: parseFloat(cost) || 0.0,
        wholesalePrice: parseFloat(wholesalePrice) || 0.0,
        retailPrice: parseFloat(retailPrice),
        warrantyPeriod: warrantyPeriod || 'No Warranty',
        requiresSerial: !!requiresSerial,
        type: type || 'PRODUCT',
        description
      }
    });
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/items/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, cost, wholesalePrice, retailPrice, warrantyPeriod, requiresSerial, type, description } = req.body;
    const id = parseInt(req.params.id as string);
    const item = await prisma.item.update({
      where: { id },
      data: {
        code,
        name,
        cost: cost !== undefined ? parseFloat(cost) : undefined,
        wholesalePrice: wholesalePrice !== undefined ? parseFloat(wholesalePrice) : undefined,
        retailPrice: retailPrice !== undefined ? parseFloat(retailPrice) : undefined,
        warrantyPeriod,
        requiresSerial,
        type,
        description
      }
    });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/items/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.item.delete({ where: { id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ================= LOCATIONS & STOCK INVENTORY =================

// Get all locations
router.get('/locations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(locations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new location (Branch or Technician)
router.post('/locations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required.' });
    }
    if (!['MAIN', 'SUB_TECHNICIAN'].includes(type)) {
      return res.status(400).json({ error: 'Type must be MAIN (Branch) or SUB_TECHNICIAN (Technician).' });
    }
    const existing = await prisma.location.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'A location with this name already exists.' });
    }
    const location = await prisma.location.create({ data: { name, type } });
    res.status(201).json(location);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a location (only if empty)
router.delete('/locations/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const stockCount = await prisma.stock.count({ where: { locationId: id } });
    if (stockCount > 0) {
      return res.status(400).json({ error: 'Cannot delete a location that has stock. Transfer all stock out first.' });
    }
    await prisma.location.delete({ where: { id } });
    res.json({ message: 'Location deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get stock details for a specific location
router.get('/locations/:id/stock', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const locationId = parseInt(req.params.id as string);
    const stocks = await prisma.stock.findMany({
      where: { locationId },
      include: { item: true }
    });

    const serials = await prisma.serial.findMany({
      where: { locationId, status: 'IN_STOCK' },
      include: { item: true }
    });

    res.json({ stocks, serials });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post a Stock Transfer
router.post('/transfers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { fromLocationId, toLocationId, reason, items } = req.body;
    // items: Array of { itemId, quantity, serials?: string[] }

    if (!fromLocationId || !toLocationId || !reason || !items || items.length === 0) {
      return res.status(400).json({ error: 'From Location, To Location, Transfer Reason, and items list are required.' });
    }

    const cashierId = req.user?.id;
    if (!cashierId) return res.status(401).json({ error: 'Cashier identity not found.' });

    const result = await prisma.$transaction(async (tx) => {
      // Create transfer record
      const transfer = await tx.stockTransfer.create({
        data: {
          fromLocationId,
          toLocationId,
          reason,
          cashierId
        }
      });

      for (const tItem of items) {
        // Validate fromLocationStock
        const sourceStock = await tx.stock.findUnique({
          where: { itemId_locationId: { itemId: tItem.itemId, locationId: fromLocationId } }
        });

        if (!sourceStock || sourceStock.quantity < tItem.quantity) {
          throw new Error(`Insufficient stock for transfer. Source location only has ${sourceStock?.quantity || 0} unit(s).`);
        }

        // Decrement source stock
        await tx.stock.update({
          where: { itemId_locationId: { itemId: tItem.itemId, locationId: fromLocationId } },
          data: { quantity: sourceStock.quantity - tItem.quantity }
        });

        // Increment target stock
        const targetStock = await tx.stock.findUnique({
          where: { itemId_locationId: { itemId: tItem.itemId, locationId: toLocationId } }
        });

        if (targetStock) {
          await tx.stock.update({
            where: { itemId_locationId: { itemId: tItem.itemId, locationId: toLocationId } },
            data: { quantity: targetStock.quantity + tItem.quantity }
          });
        } else {
          await tx.stock.create({
            data: { itemId: tItem.itemId, locationId: toLocationId, quantity: tItem.quantity }
          });
        }

        // If serial numbers are transferred, update their locations
        if (tItem.serials && tItem.serials.length > 0) {
          for (const sNo of tItem.serials) {
            const dbSerial = await tx.serial.findUnique({ where: { serialNumber: sNo } });
            if (!dbSerial || dbSerial.locationId !== fromLocationId || dbSerial.status !== 'IN_STOCK') {
              throw new Error(`Serial number "${sNo}" is not in stock at source location.`);
            }

            await tx.serial.update({
              where: { serialNumber: sNo },
              data: { locationId: toLocationId }
            });
          }
        }

        // Create transfer item log
        await tx.stockTransferItem.create({
          data: {
            transferId: transfer.id,
            itemId: tItem.itemId,
            quantity: tItem.quantity,
            serialNumbers: tItem.serials ? tItem.serials.join(',') : null
          }
        });
      }

      return transfer;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ================= GOODS RECEIVED NOTE (GRN) =================

// Create Goods Received Note (Purchase Stock Add)
router.post('/grn', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { supplierId, locationId, receivedDate, billDate, notes, grnItems } = req.body;
    // grnItems: Array of { itemId, quantity, costPrice, wholesalePrice, retailPrice, serials?: string[], warrantyPeriod }

    if (!supplierId || !locationId || !grnItems || grnItems.length === 0) {
      return res.status(400).json({ error: 'Supplier, target location, and item list are required for GRN.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate GRN Number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const count = await tx.gRN.count();
      const grnNumber = `GRN-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

      // Calculate total GRN cost value
      let totalAmount = 0;
      grnItems.forEach((item: any) => {
        totalAmount += (item.costPrice * item.quantity);
      });

      // Create GRN record
      const grn = await tx.gRN.create({
        data: {
          grnNumber,
          receivedDate: new Date(receivedDate || Date.now()),
          billDate: new Date(billDate || Date.now()),
          supplierId: parseInt(supplierId),
          locationId: parseInt(locationId),
          totalAmount,
          notes
        }
      });

      for (const gItem of grnItems) {
        // Create GRNItem records
        await tx.gRNItem.create({
          data: {
            grnId: grn.id,
            itemId: gItem.itemId,
            quantity: gItem.quantity,
            costPrice: parseFloat(gItem.costPrice),
            wholesalePrice: parseFloat(gItem.wholesalePrice),
            retailPrice: parseFloat(gItem.retailPrice)
          }
        });

        // Update Item master price cards (cost, retail, wholesale, warranty)
        await tx.item.update({
          where: { id: gItem.itemId },
          data: {
            cost: parseFloat(gItem.costPrice),
            wholesalePrice: parseFloat(gItem.wholesalePrice),
            retailPrice: parseFloat(gItem.retailPrice),
            warrantyPeriod: gItem.warrantyPeriod || 'No Warranty'
          }
        });

        // Update location inventory stock
        const currentStock = await tx.stock.findUnique({
          where: { itemId_locationId: { itemId: gItem.itemId, locationId: parseInt(locationId) } }
        });

        if (currentStock) {
          await tx.stock.update({
            where: { itemId_locationId: { itemId: gItem.itemId, locationId: parseInt(locationId) } },
            data: { quantity: currentStock.quantity + parseInt(gItem.quantity) }
          });
        } else {
          await tx.stock.create({
            data: { itemId: gItem.itemId, locationId: parseInt(locationId), quantity: parseInt(gItem.quantity) }
          });
        }

        // Seed Serials if items require serialization
        if (gItem.serials && gItem.serials.length > 0) {
          for (const sNo of gItem.serials) {
            await tx.serial.create({
              data: {
                serialNumber: sNo,
                itemId: gItem.itemId,
                locationId: parseInt(locationId),
                status: 'IN_STOCK',
                purchaseDate: new Date(receivedDate || Date.now()),
                supplierId: parseInt(supplierId)
              }
            });
          }
        }
      }

      return grn;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});


// ================= BILLING / INVOICES =================

router.get('/invoices', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        location: true,
        cashier: { select: { username: true } },
        cartItems: { include: { item: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Checkout Sale (Invoicing)
router.post('/invoices', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerId,
      cartItems,
      totalAmount,
      discountAmount,
      finalAmount,
      paymentMethod,
      paymentDetails,
      notes
    } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required.' });
    }

    const cashierId = req.user?.id;
    if (!cashierId) return res.status(401).json({ error: 'Cashier identity not found.' });

    // Fetch cashier user data to resolve their assigned location
    const dbCashier = await prisma.user.findUnique({
      where: { id: cashierId }
    });

    if (!dbCashier) return res.status(404).json({ error: 'Cashier user record not found.' });

    // If the operator is a Technician (role USER), they MUST have an associated locationId
    // And they can ONLY checkout from their technician location stock.
    // Also, customer Name and Phone is MANDATORY for technician outdoor jobs.
    let checkoutLocationId = dbCashier.locationId;

    if (dbCashier.role === 'USER') {
      if (!checkoutLocationId) {
        return res.status(400).json({ error: 'Technician accounts must be assigned to a location before billing.' });
      }

      // Check customer details
      if (!customerId) {
        return res.status(400).json({ error: 'Technician Outdoor Jobs require a registered customer. Customer Name and Telephone are mandatory.' });
      }

      const client = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!client || client.name.toLowerCase().includes('walk-in') || client.telephone === '0000000000') {
        return res.status(400).json({ error: 'Outdoor Job Customer cannot be a generic Walk-in customer. Real name and phone are mandatory.' });
      }
    } else {
      // If Admin/Superadmin checkout, default to Colombo Head Office (or they pass a locationId)
      const inputLocId = req.body.locationId;
      if (inputLocId) {
        checkoutLocationId = parseInt(inputLocId);
      } else {
        // Fallback to Colombo Head Office
        const headOffice = await prisma.location.findFirst({ where: { type: 'MAIN' } });
        checkoutLocationId = headOffice ? headOffice.id : 1;
      }
    }

    // Start checkout db transaction
    const result = await prisma.$transaction(async (tx) => {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const count = await tx.invoice.count();
      const invoiceNumber = `INV-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

      // Process each item in cart
      for (const cartItem of cartItems) {
        const itemInfo = await tx.item.findUnique({ where: { id: cartItem.itemId } });
        if (!itemInfo) throw new Error(`Product ID ${cartItem.itemId} not found.`);

        if (itemInfo.type === 'PRODUCT') {
          // Verify stock at this specific location
          const localStock = await tx.stock.findUnique({
            where: { itemId_locationId: { itemId: cartItem.itemId, locationId: checkoutLocationId! } }
          });

          if (!localStock || localStock.quantity < cartItem.quantity) {
            const locName = (await tx.location.findUnique({ where: { id: checkoutLocationId! } }))?.name;
            throw new Error(`Insufficient stock for "${itemInfo.name}" at location "${locName}". Available: ${localStock?.quantity || 0}, Requested: ${cartItem.quantity}`);
          }

          // Decrement stock at this location
          await tx.stock.update({
            where: { itemId_locationId: { itemId: cartItem.itemId, locationId: checkoutLocationId! } },
            data: { quantity: localStock.quantity - cartItem.quantity }
          });

          // Mark serial number as sold if serialized item
          if (itemInfo.requiresSerial) {
            if (!cartItem.serialNumber) {
              throw new Error(`Serial number is required for product: ${itemInfo.name}`);
            }

            const dbSerial = await tx.serial.findUnique({
              where: { serialNumber: cartItem.serialNumber }
            });

            if (!dbSerial || dbSerial.locationId !== checkoutLocationId || dbSerial.status !== 'IN_STOCK') {
              throw new Error(`Serial number "${cartItem.serialNumber}" is not in stock at your billing location.`);
            }

            // Update serial
            await tx.serial.update({
              where: { serialNumber: cartItem.serialNumber },
              data: {
                status: 'SOLD',
                soldDate: new Date(),
                invoiceId: 999999 // We will link actual invoice ID below
              }
            });
          }
        }
      }

      // Update customer credit balance if applicable
      if (customerId) {
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (customer && customer.isCreditCorporate) {
          await tx.customer.update({
            where: { id: customerId },
            data: { balance: customer.balance + finalAmount }
          });
        }
      }

      // Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: customerId || null,
          cashierId,
          locationId: checkoutLocationId!,
          totalAmount,
          discountAmount: discountAmount || 0,
          finalAmount,
          paymentMethod,
          paymentDetails,
          notes,
          cartItems: {
            create: cartItems.map((c: any) => ({
              itemId: c.itemId,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              discount: c.discount || 0,
              serialNumber: c.serialNumber || null,
              warrantyPeriod: c.warrantyPeriod || 'No Warranty',
              notes: c.notes || null
            }))
          }
        },
        include: {
          customer: true,
          cashier: { select: { username: true } },
          cartItems: { include: { item: true } }
        }
      });

      // Update sold serial records with exact invoice ID
      for (const cartItem of cartItems) {
        if (cartItem.serialNumber) {
          await tx.serial.update({
            where: { serialNumber: cartItem.serialNumber },
            data: { invoiceId: invoice.id }
          });
        }
      }

      // Post to the appropriate Ledger Account
      const accountName = `${paymentMethod}_ACCOUNT`;
      const ledgerAccount = await tx.ledgerAccount.findUnique({
        where: { name: accountName }
      });

      if (!ledgerAccount) throw new Error(`System Account ${accountName} not found.`);

      await tx.ledgerAccount.update({
        where: { name: accountName },
        data: { balance: ledgerAccount.balance + finalAmount }
      });

      await tx.ledgerTransaction.create({
        data: {
          ledgerAccountId: ledgerAccount.id,
          amount: finalAmount,
          type: 'DEBIT',
          description: `Sale Receipt - ${invoiceNumber}`,
          invoiceId: invoice.id
        }
      });

      return invoice;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
