import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from './db';
import authRouter from './routes/auth';
import posRouter from './routes/pos';
import accountsRouter from './routes/accounts';
import reportsRouter from './routes/reports';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/pos', posRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/reports', reportsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Seed data function
async function seedDatabase() {
  try {
    console.log('Verifying system accounts...');

    // 1. Seed Ledger Accounts
    const accounts = [
      { name: 'CASH_ACCOUNT', type: 'CASH' },
      { name: 'CARD_ACCOUNT', type: 'CARD' },
      { name: 'CHEQUE_ACCOUNT', type: 'CHEQUE' },
      { name: 'KOKO_ACCOUNT', type: 'KOKO' },
      { name: 'BANK_TRANSFER_ACCOUNT', type: 'BANK_TRANSFER' }
    ];

    for (const acc of accounts) {
      await prisma.ledgerAccount.upsert({
        where: { name: acc.name },
        update: {},
        create: {
          name: acc.name,
          type: acc.type,
          balance: 0.0
        }
      });
    }

    // 2. Seed Locations
    console.log('Seeding branches & technicians...');
    const locations = [
      { name: 'Colombo Head Office', type: 'MAIN' },
      { name: 'Kandy Branch', type: 'MAIN' },
      { name: 'Technician Kamal', type: 'SUB_TECHNICIAN' },
      { name: 'Technician Nimal', type: 'SUB_TECHNICIAN' }
    ];

    const seededLocations: Record<string, any> = {};
    for (const loc of locations) {
      const dbLoc = await prisma.location.upsert({
        where: { name: loc.name },
        update: { type: loc.type },
        create: {
          name: loc.name,
          type: loc.type
        }
      });
      seededLocations[loc.name] = dbLoc;
    }

    // 3. Seed Users (Superadmin, Admin, Technician User)
    console.log('Seeding system accounts...');
    
    // Superadmin: superadmin / superadmin123
    const superadminUsername = process.env.SUPERADMIN_USERNAME || 'superadmin';
    const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
    const hashedSuper = await bcrypt.hash(superadminPassword, 10);
    
    await prisma.user.upsert({
      where: { username: superadminUsername },
      update: {},
      create: {
        username: superadminUsername,
        password: hashedSuper,
        role: 'SUPERADMIN',
        status: 'ACTIVE'
      }
    });

    // Admin: admin / admin123 (Added per user request)
    const adminUsername = 'admin';
    const adminPassword = 'admin123';
    const hashedAdmin = await bcrypt.hash(adminPassword, 10);

    await prisma.user.upsert({
      where: { username: adminUsername },
      update: {},
      create: {
        username: adminUsername,
        password: hashedAdmin,
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });

    // Technician Kamal User: kamal / kamal123
    const techUsername = 'kamal';
    const techPassword = 'kamal123';
    const hashedTech = await bcrypt.hash(techPassword, 10);

    await prisma.user.upsert({
      where: { username: techUsername },
      update: {
        locationId: seededLocations['Technician Kamal'].id
      },
      create: {
        username: techUsername,
        password: hashedTech,
        role: 'USER',
        status: 'ACTIVE',
        locationId: seededLocations['Technician Kamal'].id
      }
    });

    // 4. Seed Suppliers
    console.log('Seeding suppliers...');
    const suppliers = [
      { name: 'Apple Store Sri Lanka', telephone: '0115998811', email: 'sales@apple.lk', address: '78 Duplication Rd, Colombo 04' },
      { name: 'Dell Lanka Distributors', telephone: '0112345000', email: 'support@dell.lk', address: '12 Galle Rd, Colombo 03' },
      { name: 'Abans Corporate Supplier', telephone: '0114777555', email: 'info@abans.lk', address: '498 Union Place, Colombo 02' }
    ];

    const seededSuppliers: Record<string, any> = {};
    for (const sup of suppliers) {
      const dbSup = await prisma.supplier.upsert({
        where: { name: sup.name },
        update: {},
        create: sup
      });
      seededSuppliers[sup.name] = dbSup;
    }

    // 5. Seed Items (Products & Services)
    console.log('Seeding products catalog...');
    const demoItems = [
      { code: 'ITM001', name: 'Dell XPS 15 Laptop', cost: 1400.00, wholesalePrice: 1650.00, retailPrice: 1850.00, warrantyPeriod: '2 Years', requiresSerial: true, type: 'PRODUCT', description: 'Core i7, 16GB RAM, 512GB SSD' },
      { code: 'ITM002', name: 'iPhone 15 Pro Max', cost: 950.00, wholesalePrice: 1100.00, retailPrice: 1200.00, warrantyPeriod: '1 Year', requiresSerial: true, type: 'PRODUCT', description: '256GB, Titanium Black' },
      { code: 'ITM003', name: 'Logitech MX Master 3S', cost: 65.00, wholesalePrice: 85.00, retailPrice: 99.99, warrantyPeriod: '1 Year', requiresSerial: false, type: 'PRODUCT', description: 'Ergonomic Wireless Mouse' },
      { code: 'ITM004', name: 'Samsung 34" Curved Monitor', cost: 310.00, wholesalePrice: 390.00, retailPrice: 450.00, warrantyPeriod: '3 Years', requiresSerial: false, type: 'PRODUCT', description: 'WQHD 165Hz UltraWide' },
      { code: 'ITM005', name: 'Keyboard Cleaning Service', cost: 0.00, wholesalePrice: 10.00, retailPrice: 15.00, warrantyPeriod: 'No Warranty', requiresSerial: false, type: 'SERVICE', description: 'Deep clean of physical keycaps and board' }
    ];

    const seededItems: Record<string, any> = {};
    for (const item of demoItems) {
      const dbItem = await prisma.item.upsert({
        where: { code: item.code },
        update: {
          cost: item.cost,
          wholesalePrice: item.wholesalePrice,
          retailPrice: item.retailPrice,
          type: item.type
        },
        create: item
      });
      seededItems[item.code] = dbItem;
    }

    // 6. Seed Stock levels and Serial numbers (Initial quantities in Colombo Head Office)
    console.log('Seeding stock levels & serial counts...');
    const headOffice = seededLocations['Colombo Head Office'];
    
    // Seed Dell Laptop stock
    const dellLaptop = seededItems['ITM001'];
    await prisma.stock.upsert({
      where: { itemId_locationId: { itemId: dellLaptop.id, locationId: headOffice.id } },
      update: { quantity: 5 },
      create: { itemId: dellLaptop.id, locationId: headOffice.id, quantity: 5 }
    });

    const laptopSerials = ['DELL-XPS-98612', 'DELL-XPS-98613', 'DELL-XPS-98614', 'DELL-XPS-98615', 'DELL-XPS-98616'];
    for (const s of laptopSerials) {
      await prisma.serial.upsert({
        where: { serialNumber: s },
        update: {
          locationId: headOffice.id,
          status: 'IN_STOCK',
          supplierId: seededSuppliers['Dell Lanka Distributors'].id
        },
        create: {
          serialNumber: s,
          itemId: dellLaptop.id,
          locationId: headOffice.id,
          status: 'IN_STOCK',
          supplierId: seededSuppliers['Dell Lanka Distributors'].id,
          purchaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Purchased 30 days ago
        }
      });
    }

    // Seed iPhone stock
    const iphone = seededItems['ITM002'];
    await prisma.stock.upsert({
      where: { itemId_locationId: { itemId: iphone.id, locationId: headOffice.id } },
      update: { quantity: 3 },
      create: { itemId: iphone.id, locationId: headOffice.id, quantity: 3 }
    });

    const iphoneSerials = ['IP15-PM-7761A', 'IP15-PM-7762B', 'IP15-PM-7763C'];
    for (const s of iphoneSerials) {
      await prisma.serial.upsert({
        where: { serialNumber: s },
        update: {
          locationId: headOffice.id,
          status: 'IN_STOCK',
          supplierId: seededSuppliers['Apple Store Sri Lanka'].id
        },
        create: {
          serialNumber: s,
          itemId: iphone.id,
          locationId: headOffice.id,
          status: 'IN_STOCK',
          supplierId: seededSuppliers['Apple Store Sri Lanka'].id,
          purchaseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // Purchased 10 days ago
        }
      });
    }

    // Seed Logitech mouse (Non-serialized product)
    const mouse = seededItems['ITM003'];
    await prisma.stock.upsert({
      where: { itemId_locationId: { itemId: mouse.id, locationId: headOffice.id } },
      update: { quantity: 15 },
      create: { itemId: mouse.id, locationId: headOffice.id, quantity: 15 }
    });

    // 7. Seed demo customer John Doe
    await prisma.customer.upsert({
      where: { telephone: '0000000000' },
      update: {},
      create: { name: 'John Doe (Walk-in)', telephone: '0000000000', address: 'Walk-in Customer', isCreditCorporate: false }
    });

    console.log('Database verification and seeding complete.');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}

// Start Server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await seedDatabase();
});
