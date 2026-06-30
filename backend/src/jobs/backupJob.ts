import cron from 'node-cron';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import prisma from '../db';

export function initBackupJob() {
  // Run every night at 11:59 PM
  cron.schedule('59 23 * * *', async () => {
    try {
      console.log('[Cron] Starting automated nightly backup...');
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SAP POS System Automated Backup';
      workbook.created = new Date();

      // 1. Items
      const items = await prisma.item.findMany();
      const wsItems = workbook.addWorksheet('Products');
      wsItems.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Code', key: 'code', width: 20 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Cost', key: 'cost', width: 15 },
        { header: 'Wholesale', key: 'wholesalePrice', width: 15 },
        { header: 'Retail', key: 'retailPrice', width: 15 },
        { header: 'Min Stock', key: 'minStock', width: 15 }
      ];
      items.forEach(i => wsItems.addRow(i));

      // 2. Customers
      const customers = await prisma.customer.findMany();
      const wsCustomers = workbook.addWorksheet('Customers');
      wsCustomers.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Telephone', key: 'telephone', width: 20 },
        { header: 'Points', key: 'loyaltyPoints', width: 15 },
        { header: 'Balance', key: 'balance', width: 15 }
      ];
      customers.forEach(c => wsCustomers.addRow(c));

      // 3. Stock
      const stocks = await prisma.stock.findMany({ include: { item: true, location: true } });
      const wsStock = workbook.addWorksheet('Stock');
      wsStock.columns = [
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Item Code', key: 'code', width: 20 },
        { header: 'Item Name', key: 'name', width: 30 },
        { header: 'Quantity', key: 'quantity', width: 15 }
      ];
      stocks.forEach(s => wsStock.addRow({ location: s.location.name, code: s.item.code, name: s.item.name, quantity: s.quantity }));

      // Write to buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Setup email
      const backupEmail = process.env.BACKUP_EMAIL;
      if (!backupEmail) {
        console.warn('[Cron] Automated backup completed, but BACKUP_EMAIL is not set. Saving skipped.');
        return;
      }

      // We'll assume they'll configure SMTP via SENDGRID or normal SMTP in env later
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Verify connection config
      if (!process.env.SMTP_USER) {
         console.warn('[Cron] SMTP_USER is not set. Cannot send backup email.');
         return;
      }

      await transporter.sendMail({
        from: `"SAP POS Backup" <${process.env.SMTP_USER}>`,
        to: backupEmail,
        subject: `Automated Database Backup - ${new Date().toISOString().split('T')[0]}`,
        text: 'Please find attached the automated database backup for SAP POS.',
        attachments: [
          {
            filename: `sappos_backup_${new Date().toISOString().split('T')[0]}.xlsx`,
            content: buffer as any
          }
        ]
      });

      console.log('[Cron] Automated backup successfully sent to', backupEmail);

    } catch (error) {
      console.error('[Cron] Failed to run automated backup:', error);
    }
  });
}
