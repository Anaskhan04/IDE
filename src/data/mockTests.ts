import { TestSuite } from '../types/ide';

export const INITIAL_TEST_SUITES: TestSuite[] = [
  {
    id: 'test-payment-unit',
    name: 'payment.test.ts',
    file: 'tests/unit/payment.test.ts',
    category: 'unit',
    status: 'idle',
    duration: '142ms',
    testsCount: 5,
    passedCount: 5,
    failedCount: 0,
    impactScore: 98,
    coverage: 94
  },
  {
    id: 'test-checkout-e2e',
    name: 'checkout.e2e.ts',
    file: 'tests/e2e/checkout.e2e.ts',
    category: 'e2e',
    status: 'idle',
    duration: '2.4s',
    testsCount: 4,
    passedCount: 4,
    failedCount: 0,
    impactScore: 92,
    coverage: 88
  },
  {
    id: 'test-cart-unit',
    name: 'cartStore.test.ts',
    file: 'tests/unit/cartStore.test.ts',
    category: 'unit',
    status: 'idle',
    duration: '65ms',
    testsCount: 6,
    passedCount: 6,
    failedCount: 0,
    impactScore: 85,
    coverage: 91
  },
  {
    id: 'test-order-integration',
    name: 'orderService.test.ts',
    file: 'tests/integration/orderService.test.ts',
    category: 'integration',
    status: 'idle',
    duration: '410ms',
    testsCount: 3,
    passedCount: 3,
    failedCount: 0,
    impactScore: 89,
    coverage: 86
  },
  {
    id: 'test-auth-unit',
    name: 'auth.test.ts',
    file: 'tests/unit/auth.test.ts',
    category: 'unit',
    status: 'idle',
    duration: '98ms',
    testsCount: 8,
    passedCount: 8,
    failedCount: 0,
    impactScore: 12,
    coverage: 96
  }
];
