import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database and wiping all data to create a brand new system...');

  // Use transaction to ensure everything is deleted cleanly
  await prisma.$transaction(async (tx) => {
    console.log('Deleting LedgerTransactions...');
    await tx.ledgerTransaction.deleteMany();
    
    console.log('Deleting CartItems...');
    await tx.cartItem.deleteMany();
    
    console.log('Deleting StockTransferItems...');
    await tx.stockTransferItem.deleteMany();
    
    console.log('Deleting StockTransfers...');
    await tx.stockTransfer.deleteMany();
    
    console.log('Deleting Invoices...');
    await tx.invoice.deleteMany();
    
    console.log('Deleting GRNItems...');
    await tx.gRNItem.deleteMany();
    
    console.log('Deleting GRNs...');
    await tx.gRN.deleteMany();
    
    console.log('Deleting Serials...');
    await tx.serial.deleteMany();
    
    console.log('Deleting Stocks...');
    await tx.stock.deleteMany();
    
    console.log('Deleting Items...');
    await tx.item.deleteMany();
    
    console.log('Deleting Suppliers...');
    await tx.supplier.deleteMany();
    
    console.log('Deleting Customers...');
    await tx.customer.deleteMany();
    
    console.log('Deleting LedgerAccounts...');
    await tx.ledgerAccount.deleteMany();
    
    console.log('Deleting Users...');
    await tx.user.deleteMany();
    
    console.log('Deleting Locations...');
    await tx.location.deleteMany();
  });

  console.log('All data deleted successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
