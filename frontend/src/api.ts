const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get headers with authentication token
function getHeaders(contentType = 'application/json') {
  const token = localStorage.getItem('sap_pos_token');
  const headers: Record<string, string> = {};
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Authentication & Users
  auth: {
    async login(username: string, password: String) {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      return handleResponse(res);
    },
    
    async register(username: string, password: String, role?: string, locationId?: number | null) {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password, role, locationId })
      });
      return handleResponse(res);
    },
    
    async requestReset(username: string) {
      const res = await fetch(`${API_BASE_URL}/auth/reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      return handleResponse(res);
    },
    
    async getPendingResets() {
      const res = await fetch(`${API_BASE_URL}/auth/pending-resets`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    
    async approveReset(userId: number, newPassword: String) {
      const res = await fetch(`${API_BASE_URL}/auth/reset-approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, newPassword })
      });
      return handleResponse(res);
    },
    
    async getUsers() {
      const res = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    
    async updateRole(userId: number, role: 'ADMIN' | 'USER') {
      const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ role })
      });
      return handleResponse(res);
    },
    
    async deleteUser(userId: number) {
      const res = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return handleResponse(res);
    }
  },
  
  // Customers
  customers: {
    async list() {
      const res = await fetch(`${API_BASE_URL}/pos/customers`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    
    async create(data: { name: string; telephone: string; address?: string; isCreditCorporate?: boolean }) {
      const res = await fetch(`${API_BASE_URL}/pos/customers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    
    async update(id: number, data: { name: string; telephone: string; address?: string | null; isCreditCorporate?: boolean; balance?: number }) {
      const res = await fetch(`${API_BASE_URL}/pos/customers/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  },
  
  // Inventory Items
  items: {
    async list() {
      const res = await fetch(`${API_BASE_URL}/pos/items`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    
    async create(data: { code: string; name: string; cost: number; wholesalePrice: number; retailPrice: number; warrantyPeriod: string; requiresSerial: boolean; type: string; stock: number; description?: string }) {
      const res = await fetch(`${API_BASE_URL}/pos/items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    
    async update(id: number, data: { code: string; name: string; cost: number; wholesalePrice: number; retailPrice: number; warrantyPeriod: string; requiresSerial: boolean; type: string; stock: number; description?: string | null }) {
      const res = await fetch(`${API_BASE_URL}/pos/items/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    
    async delete(id: number) {
      const res = await fetch(`${API_BASE_URL}/pos/items/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return handleResponse(res);
    }
  },
  
  // Invoices (Sales Checkout)
  invoices: {
    async list() {
      const res = await fetch(`${API_BASE_URL}/pos/invoices`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    
    async create(data: {
      customerId?: number | null;
      cartItems: {
        itemId: number;
        quantity: number;
        unitPrice: number;
        discount: number;
        serialNumber?: string;
        warrantyPeriod?: string;
        notes?: string;
      }[];
      totalAmount: number;
      discountAmount: number;
      finalAmount: number;
      paymentMethod: 'CASH' | 'CARD' | 'CHEQUE' | 'KOKO' | 'BANK_TRANSFER';
      paymentDetails?: string;
      notes?: string;
    }) {
      const res = await fetch(`${API_BASE_URL}/pos/invoices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  },
  
  // Ledger Accounts
  accounts: {
    async getBalances() {
      const res = await fetch(`${API_BASE_URL}/accounts/balances`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    
    async getTransactions(accountId?: number) {
      const query = accountId ? `?accountId=${accountId}` : '';
      const res = await fetch(`${API_BASE_URL}/accounts/transactions${query}`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    
    async adjust(data: { accountId: number; amount: number; type: 'DEBIT' | 'CREDIT'; description: string }) {
      const res = await fetch(`${API_BASE_URL}/accounts/adjust`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  }
};
