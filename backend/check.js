const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Users:', await prisma.user.findMany());
}
main().finally(() => prisma.$disconnect());
