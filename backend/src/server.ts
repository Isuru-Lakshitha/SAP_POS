import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from './db';
import authRouter from './routes/auth';
import posRouter from './routes/pos';
import accountsRouter from './routes/accounts';
import reportsRouter from './routes/reports';
import systemRouter from './routes/system';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/pos', posRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/system', systemRouter);

// Health check
app.get('/api/health', (req, res) => {
  console.log('Health check called');
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

    // 2. Seed Default Location
    console.log('Seeding default Main Branch...');
    await prisma.location.upsert({
      where: { name: 'Gampaha Head Office' },
      update: {},
      create: {
        name: 'Gampaha Head Office',
        type: 'MAIN'
      }
    });

    // 3. Seed Users (Superadmin, Admin)
    console.log('Seeding system accounts...');
    
    // Superadmin
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

    // Admin
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

    // 4. Seed default walk-in customer
    await prisma.customer.upsert({
      where: { telephone: '0000000000' },
      update: {},
      create: { name: 'Walk-in Customer', telephone: '0000000000', address: '-', isCreditCorporate: false }
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
