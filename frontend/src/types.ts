export interface User {
  id: number;
  username: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'PASSWORD_RESET_REQUESTED';
  locationId?: number | null;
}

export interface Customer {
  id: number;
  name: string;
  telephone: string;
  address?: string | null;
  isCreditCorporate: boolean;
  balance: number;
}

export interface Item {
  id: number;
  code: string;
  name: string;
  cost: number;
  wholesalePrice: number;
  retailPrice: number;
  price: number; // legacy pricing support
  warrantyPeriod: string;
  requiresSerial: boolean;
  stock: number;
  type: 'PRODUCT' | 'SERVICE';
  description?: string | null;
}

export interface CartItem {
  itemId: number;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  serialNumber?: string;
  warrantyPeriod: string;
  notes?: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  date: string;
  customerId?: number | null;
  customer?: Customer | null;
  cashierId: number;
  cashier: { username: string };
  locationId: number;
  location?: { name: string; type: string } | null;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'CHEQUE' | 'KOKO' | 'BANK_TRANSFER';
  paymentDetails?: string | null;
  notes?: string | null;
  cartItems: {
    id: number;
    itemId: number;
    item: Item;
    quantity: number;
    unitPrice: number;
    discount: number;
    serialNumber?: string | null;
    warrantyPeriod?: string | null;
    notes?: string | null;
  }[];
}

export interface LedgerAccount {
  id: number;
  name: string;
  type: 'CASH' | 'CARD' | 'CHEQUE' | 'KOKO' | 'BANK_TRANSFER';
  balance: number;
}

export interface LedgerTransaction {
  id: number;
  date: string;
  ledgerAccountId: number;
  ledgerAccount: LedgerAccount;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  description: string;
  invoiceId?: number | null;
  invoice?: Invoice | null;
}
