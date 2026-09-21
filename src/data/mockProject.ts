import { ProjectFile } from '../types/ide';

export const INITIAL_FILES: ProjectFile[] = [
  {
    id: 'payment-service',
    name: 'paymentService.ts',
    path: 'src/services/paymentService.ts',
    language: 'typescript',
    impactLevel: 'modified',
    isModified: true,
    symbols: [
      { id: 'sym-processPayment', name: 'processPayment', kind: 'function', line: 14, exported: true, calls: ['validateCard', 'stripeGateway.charge'], calledBy: ['CheckoutPage', 'OrderService'] },
      { id: 'sym-refundTransaction', name: 'refundTransaction', kind: 'function', line: 36, exported: true, calls: ['stripeGateway.refund'], calledBy: ['AdminOrderManager'] },
      { id: 'sym-validateCard', name: 'validateCard', kind: 'function', line: 52, exported: false, calls: ['luhnCheck'], calledBy: ['processPayment'] },
      { id: 'sym-PaymentPayload', name: 'PaymentPayload', kind: 'interface', line: 5, exported: true }
    ],
    content: `// IntelliCode Knowledge Graph Node: src/services/paymentService.ts
// AST Status: Synchronized (AST v2.4.1)
// CIA Note: Modified signature in processPayment affects [Checkout, Cart, Order]

export interface PaymentPayload {
  orderId: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'INR';
  paymentMethod: 'card' | 'apple_pay' | 'upi';
  token: string;
}

export interface PaymentReceipt {
  transactionId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  processedAt: string;
  authCode: string;
}

/**
 * Core payment processing pipeline
 * Traced by IntelliCode CIA: Blast radius = HIGH
 */
export async function processPayment(payload: PaymentPayload): Promise<PaymentReceipt> {
  console.log('[PaymentService] Initiating transaction for order:', payload.orderId);
  
  if (!validateCard(payload.token)) {
    throw new Error('Invalid payment credential signature');
  }

  // Simulated gateway interaction via MCP Stripe Integration
  const response = await fetch('/api/v2/gateway/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: payload.orderId,
      amount: payload.amount,
      token: payload.token,
      method: payload.paymentMethod
    })
  });

  if (!response.ok) {
    throw new Error('Payment gateway declined transaction');
  }

  return {
    transactionId: 'tx_' + Math.random().toString(36).substring(2, 9),
    status: 'SUCCESS',
    processedAt: new Date().toISOString(),
    authCode: 'AUTH_OK_889'
  };
}

export async function refundTransaction(transactionId: string, amount: number) {
  // Admin refund logic connected to orderService
  return { status: 'REFUNDED', transactionId, amount };
}

function validateCard(token: string): boolean {
  return token.length > 8 && token.startsWith('tok_');
}
`
  },
  {
    id: 'auth-service',
    name: 'authService.ts',
    path: 'src/services/authService.ts',
    language: 'typescript',
    impactLevel: 'none',
    symbols: [
      { id: 'sym-authenticateUser', name: 'authenticateUser', kind: 'function', line: 12, exported: true, calls: ['hashPassword', 'jwt.sign'], calledBy: ['LoginPage', 'UserService'] },
      { id: 'sym-validateSession', name: 'validateSession', kind: 'function', line: 28, exported: true, calls: ['jwt.verify'], calledBy: ['SessionManager', 'ProtectedRoute'] },
      { id: 'sym-revokeToken', name: 'revokeToken', kind: 'function', line: 40, exported: true, calls: ['redis.del'], calledBy: ['SessionManager'] }
    ],
    content: `// IntelliCode AST Index: src/services/authService.ts
// Persistent Knowledge Graph Symbol ID: #auth_service_v1

import { SessionManager } from '../auth/sessionManager';

export interface UserCredentials {
  email: string;
  hash: string;
}

export async function authenticateUser(credentials: UserCredentials) {
  // Central authentication pipeline
  const user = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
  return user.json();
}

export function validateSession(token: string): boolean {
  return SessionManager.isTokenActive(token);
}

export function revokeToken(token: string): void {
  SessionManager.destroy(token);
}
`
  },
  {
    id: 'checkout-page',
    name: 'CheckoutPage.tsx',
    path: 'src/components/CheckoutPage.tsx',
    language: 'tsx',
    impactLevel: 'direct',
    symbols: [
      { id: 'sym-CheckoutPage', name: 'CheckoutPage', kind: 'function', line: 10, exported: true, calls: ['processPayment', 'useCartStore'], calledBy: ['AppRouter'] }
    ],
    content: `// Downstream Component impacted by paymentService.ts
import React, { useState } from 'react';
import { processPayment } from '../services/paymentService';
import { useCartStore } from '../store/cartStore';

export const CheckoutPage: React.FC = () => {
  const { items, totalAmount, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Direct call to modified paymentService
      const receipt = await processPayment({
        orderId: 'ORD-9021',
        amount: totalAmount,
        currency: 'USD',
        paymentMethod: 'card',
        token: 'tok_live_demo'
      });
      alert('Order Confirmed: ' + receipt.transactionId);
      clearCart();
    } catch (err) {
      console.error('Checkout failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 rounded-xl">
      <h2 className="text-xl font-bold">Checkout Summary</h2>
      <p>Cart Total: \${totalAmount}</p>
      <button onClick={handleCheckout} disabled={loading} className="mt-4 px-4 py-2 bg-ide-focus rounded">
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  );
};
`
  },
  {
    id: 'cart-controller',
    name: 'cartStore.ts',
    path: 'src/store/cartStore.ts',
    language: 'typescript',
    impactLevel: 'direct',
    symbols: [
      { id: 'sym-useCartStore', name: 'useCartStore', kind: 'function', line: 8, exported: true, calls: ['zustand.create'], calledBy: ['CartDrawer', 'CheckoutPage'] }
    ],
    content: `// State management for Cart Items
export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export const useCartStore = () => {
  return {
    items: [{ id: '1', name: 'Pro AI License', price: 49, qty: 1 }],
    totalAmount: 49,
    clearCart: () => console.log('Cart emptied')
  };
};
`
  },
  {
    id: 'order-service',
    name: 'orderService.ts',
    path: 'src/services/orderService.ts',
    language: 'typescript',
    impactLevel: 'direct',
    symbols: [
      { id: 'sym-createOrder', name: 'createOrder', kind: 'function', line: 7, exported: true, calls: ['processPayment', 'db.orders.insert'], calledBy: ['CheckoutPage'] }
    ],
    content: `// Order fulfillment pipeline
import { processPayment } from './paymentService';

export async function createOrder(cartItems: any[], customerId: string) {
  // Traced by CIA: depends on processPayment return structure
  console.log('Generating order records for:', customerId);
  return { orderId: 'ORD-9021', status: 'CONFIRMED' };
}
`
  },
  {
    id: 'session-manager',
    name: 'sessionManager.ts',
    path: 'src/auth/sessionManager.ts',
    language: 'typescript',
    impactLevel: 'none',
    symbols: [
      { id: 'sym-SessionManager', name: 'SessionManager', kind: 'class', line: 4, exported: true }
    ],
    content: `export class SessionManager {
  private static activeSessions = new Set<string>();

  static isTokenActive(token: string): boolean {
    return this.activeSessions.has(token);
  }

  static destroy(token: string): void {
    this.activeSessions.delete(token);
  }
}
`
  },
  {
    id: 'user-service',
    name: 'userService.ts',
    path: 'src/services/userService.ts',
    language: 'typescript',
    impactLevel: 'none',
    symbols: [
      { id: 'sym-getUserProfile', name: 'getUserProfile', kind: 'function', line: 5, exported: true, calls: ['authService.validateSession'], calledBy: ['ProfileView'] }
    ],
    content: `import { validateSession } from './authService';

export async function getUserProfile(userId: string, token: string) {
  if (!validateSession(token)) {
    throw new Error('Unauthorized');
  }
  return { id: userId, username: 'octocat', plan: 'Enterprise' };
}
`
  },
  {
    id: 'payment-test',
    name: 'payment.test.ts',
    path: 'tests/unit/payment.test.ts',
    language: 'typescript',
    impactLevel: 'indirect',
    content: `// IntelliCode Automated Impact Test Suite
import { describe, it, expect } from 'vitest';
import { processPayment } from '../../src/services/paymentService';

describe('PaymentService Unit Tests', () => {
  it('successfully charges valid payment method', async () => {
    const res = await processPayment({
      orderId: 'T-100',
      amount: 120,
      currency: 'USD',
      paymentMethod: 'card',
      token: 'tok_valid_test'
    });
    expect(res.status).toBe('SUCCESS');
    expect(res.transactionId).toBeDefined();
  });

  it('rejects malformed token payloads', async () => {
    await expect(processPayment({
      orderId: 'T-101',
      amount: 50,
      currency: 'USD',
      paymentMethod: 'card',
      token: 'invalid'
    })).rejects.toThrow();
  });
});
`
  },
  {
    id: 'checkout-e2e-test',
    name: 'checkout.e2e.ts',
    path: 'tests/e2e/checkout.e2e.ts',
    language: 'typescript',
    impactLevel: 'indirect',
    content: `// E2E Test Suite recommended by CIA for processPayment() changes
describe('Checkout Flow E2E Regression', () => {
  it('completes checkout cart to confirmation', () => {
    // Verifies processPayment integration with CheckoutPage
    expect(true).toBe(true);
  });
});
`
  }
];
