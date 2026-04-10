// Loh Ze Qing Norbert, A0277473R

import JWT from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import userModel from '../models/userModel.js';
import { isAdmin, requireSignIn } from './authMiddleware.js';
import { updateProfileController } from '../controllers/userController.js';

jest.setTimeout(30000);

describe('authMiddleware - Integration Tests', () => {
  let mongoServer;
  const originalJwtSecret = process.env.JWT_SECRET;
  let userCounter = 0;

  const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  const seedUser = async (overrides = {}) => {
    userCounter += 1;
    return userModel.create({
      name: 'Middleware User',
      email: `auth.middleware.${userCounter}@example.com`,
      password: '$2b$10$abcdefghijklmnopqrstuv',
      phone: '+14155552671',
      address: '123 Integration Street',
      answer: 'blue',
      DOB: '2000-01-01',
      role: 0,
      ...overrides,
    });
  };

  const signToken = (payload) =>
    JWT.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

  beforeAll(async () => {
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: 'auth-middleware-integration-tests',
    });
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = originalJwtSecret;
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('The Happy Path (The Let-Me-In Tests)', () => {
    test('requireSignIn verifies token, mutates req.user, and calls next', async () => {
      const adminUser = await seedUser({ role: 1 });
      const token = signToken({ _id: adminUser._id.toString() });
      const req = {
        headers: { authorization: `Bearer ${token}` },
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.send).not.toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id).toBe(adminUser._id.toString());
    });

    test('isAdmin checks live DB role and calls next for role=1 user', async () => {
      const adminUser = await seedUser({ role: 1 });
      const req = {
        user: { _id: adminUser._id.toString() },
      };
      const res = createResponse();
      const next = jest.fn();
      const findByIdSpy = jest.spyOn(userModel, 'findById');

      await isAdmin(req, res, next);

      expect(findByIdSpy).toHaveBeenCalledWith(adminUser._id.toString());
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.send).not.toHaveBeenCalled();
    });

    test('requireSignIn attaches req.user that updateProfileController consumes for profile update', async () => {
      const user = await seedUser({
        name: 'Auth Chain User',
        address: 'Old Address',
        phone: '+14155552671',
        DOB: '2000-01-01',
      });
      const token = signToken({ _id: user._id.toString() });
      const req = {
        headers: { authorization: `Bearer ${token}` },
        body: { name: 'Updated Via Middleware', address: 'Updated Address' },
      };
      const middlewareRes = createResponse();

      const next = jest.fn();
      await requireSignIn(req, middlewareRes, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      expect(req.user._id).toBe(user._id.toString());

      const controllerRes = createResponse();
      await updateProfileController(req, controllerRes);

      expect(controllerRes.status).toHaveBeenCalledWith(200);
      expect(controllerRes.send).toHaveBeenCalledTimes(1);
      const controllerPayload = controllerRes.send.mock.calls[0][0];
      expect(controllerPayload).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Profile Updated Successfully',
        }),
      );
      expect(controllerPayload.updatedUser).toBeDefined();

      const updatedUser = await userModel.findById(user._id);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser.name).toBe('Updated Via Middleware');
      expect(updatedUser.address).toBe('Updated Address');
      expect(updatedUser.phone).toBe('+14155552671');
      expect(updatedUser.DOB).toBe('2000-01-01');
    });
  });

  describe('Validation / Negative Paths', () => {
    test.each([
      ['missing header', undefined],
      ['empty string', ''],
      ['just bearer', 'Bearer'],
    ])('requireSignIn returns 401 for %s', async (_label, headerValue) => {
      const req = {
        headers: { authorization: headerValue },
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('requireSignIn returns 401 for token signed with wrong secret', async () => {
      const wrongSecret = crypto.randomBytes(32).toString('hex');
      const wrongToken = JWT.sign(
        { _id: new mongoose.Types.ObjectId().toString() },
        wrongSecret,
        {
          expiresIn: '1h',
        },
      );
      const req = {
        headers: { authorization: `Bearer ${wrongToken}` },
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      const payload = res.send.mock.calls[0][0];
      expect(payload).toEqual({
        success: false,
        error: expect.anything(),
        message: 'Unauthorized Access',
      });
    });

    test('requireSignIn returns 401 for mathematically invalid token', async () => {
      const req = {
        headers: { authorization: 'Bearer this-is-not-a-valid-jwt' },
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      const payload = res.send.mock.calls[0][0];
      expect(payload).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Unauthorized Access',
          error: expect.anything(),
        }),
      );
    });

    test('isAdmin returns 401 when req.user is missing', async () => {
      const req = { user: undefined };
      const res = createResponse();
      const next = jest.fn();

      await isAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
    });

    test('isAdmin returns 403 for existing non-admin user', async () => {
      const standardUser = await seedUser({ role: 0 });
      const req = { user: { _id: standardUser._id.toString() } };
      const res = createResponse();
      const next = jest.fn();

      await isAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized Access',
      });
    });

    test('isAdmin returns 403 for ghost user id from token', async () => {
      const ghostUserId = new mongoose.Types.ObjectId().toString();
      const req = { user: { _id: ghostUserId } };
      const res = createResponse();
      const next = jest.fn();

      await isAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized Access',
      });
    });
  });

  describe('Sanitization Contract', () => {
    test.each(['Bearer', 'BEARER', 'bearer', ''])(
      "requireSignIn accepts header variant '%s <token>' and extracts same token",
      async (prefix) => {
        const user = await seedUser({ role: 1 });
        const token = signToken({ _id: user._id.toString() });
        const authorization = prefix ? `${prefix} ${token}` : token;
        const req = { headers: { authorization } };
        const res = createResponse();
        const next = jest.fn();

        await requireSignIn(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.send).not.toHaveBeenCalled();
        expect(req.user._id).toBe(user._id.toString());
      },
    );
  });

  describe('Security / Privacy Boundaries', () => {
    test.each([
      ['role 2', 2],
      ['role null', null],
      ['role undefined', undefined],
    ])('isAdmin enforces strict role==1 for %s', async (_label, roleValue) => {
      const user = await seedUser({ role: roleValue });
      const req = { user: { _id: user._id.toString() } };
      const res = createResponse();
      const next = jest.fn();

      await isAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('requireSignIn rejects expired token and does not leak raw error', async () => {
      const user = await seedUser({ role: 1 });
      const expiredToken = JWT.sign(
        { _id: user._id.toString() },
        process.env.JWT_SECRET,
        {
          // nosemgrep - env var for test
          expiresIn: -1,
        },
      );
      const req = {
        headers: { authorization: `Bearer ${expiredToken}` },
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      const payload = res.send.mock.calls[0][0];
      expect(payload).toEqual({
        success: false,
        error: expect.anything(),
        message: 'Unauthorized Access',
      });
    });

    test('isAdmin returns 500 on DB failure without leaking raw error', async () => {
      const user = await seedUser({ role: 1 });
      const req = { user: { _id: user._id.toString() } };
      const res = createResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const dbError = new Error('Database unavailable');

      jest.spyOn(userModel, 'findById').mockRejectedValue(dbError);

      await isAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: dbError,
        message: 'Error in Auth Middleware',
      });
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      consoleSpy.mockRestore();
    });
  });
});
