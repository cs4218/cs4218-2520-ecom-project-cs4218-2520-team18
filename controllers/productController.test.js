import { jest } from '@jest/globals';

jest.mock('braintree', () => {
  const mockGatewayInstance = {
    clientToken: {
      generate: jest.fn(),
    },
    transaction: {
      sale: jest.fn(),
    },
  };
  return {
    BraintreeGateway: jest.fn(() => mockGatewayInstance),
    Environment: { Sandbox: 'Sandbox' },
  };
});

jest.mock('../models/orderModel.js', () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(true),
  }));
});

import {
  braintreeTokenController,
  brainTreePaymentController,
} from './productController';
import orderModel from '../models/orderModel.js';
import braintree from 'braintree';

describe('Braintree Controller Unit Tests', () => {
  let req, res, mockGateway;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGateway = new braintree.BraintreeGateway();

    req = {
      body: {},
      user: { _id: 'user123' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  describe('braintreeTokenController', () => {
    test('should generate and send client token', async () => {
      const mockResponse = { clientToken: 'fake-token' };

      mockGateway.clientToken.generate.mockImplementation((obj, cb) => {
        cb(null, mockResponse);
      });

      await braintreeTokenController(req, res);
      expect(res.send).toHaveBeenCalledWith(mockResponse);
    });

    test('should send 500 error if token generation fails', async () => {
      const mockError = new Error('Generation Failed');

      mockGateway.clientToken.generate.mockImplementation((obj, cb) => {
        cb(mockError, null);
      });

      await braintreeTokenController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(mockError);
    });

    test('braintreeTokenController catches unexpected errors', async () => {
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      mockGateway.clientToken.generate.mockImplementation(() => {
        throw new Error('Unexpected token error');
      });

      await braintreeTokenController(req, res);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(consoleSpy.mock.calls[0][0].message).toBe(
        'Unexpected token error',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('brainTreePaymentController', () => {
    test('should calculate total and process payment successfully', async () => {
      req.body = {
        nonce: 'fake-nonce',
        cart: [{ price: 100 }, { price: 200 }],
      };

      const mockResult = { success: true, transaction: { id: 'tx123' } };

      mockGateway.transaction.sale.mockImplementation((obj, cb) => {
        cb(null, mockResult);
      });

      await brainTreePaymentController(req, res);

      expect(mockGateway.transaction.sale).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 300 }),
        expect.any(Function),
      );
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test('should send 500 error if transaction fails', async () => {
      req.body = {
        nonce: 'fake-nonce',
        cart: [{ price: 50 }],
      };

      const mockError = new Error('Transaction Failed');
      mockGateway.transaction.sale.mockImplementation((obj, cb) => {
        cb(mockError, null);
      });

      await brainTreePaymentController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(mockError);
    });

    test('brainTreePaymentController catches unexpected error', async () => {
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      req.body = {
        nonce: 'fake-nonce',
        cart: [{ price: 100 }],
      };

      mockGateway.transaction.sale.mockImplementation(() => {
        throw new Error('Unexpected payment error');
      });

      await brainTreePaymentController(req, res);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(consoleSpy.mock.calls[0][0].message).toBe(
        'Unexpected payment error',
      );

      consoleSpy.mockRestore();
    });
  });
});
