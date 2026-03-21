// Sherwyn Ng, A0255132N

import mongoose from 'mongoose';
import connectDB from './db';

describe('Database Integration', () => {
  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('connects to in-memory MongoDB when USE_IN_MEMORY_MONGO is true', async () => {
    process.env.USE_IN_MEMORY_MONGO = 'true';
    process.env.MONGO_URL = '';

    jest.spyOn(console, 'log').mockImplementation(() => {});

    await expect(connectDB()).resolves.not.toThrow();

    expect(mongoose.connection.readyState).toBe(1);

    await mongoose.disconnect();
    jest.restoreAllMocks();
  });

  test('fails gracefully with invalid MONGO_URL', async () => {
    process.env.USE_IN_MEMORY_MONGO = 'false';
    process.env.MONGO_URL = 'mongodb://invalid:27017/test';

    const connectSpy = jest
      .spyOn(mongoose, 'connect')
      .mockImplementation(() => {
        throw new Error('Mocked connection error');
      });

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await connectDB();

    expect(exitSpy).toHaveBeenCalled();

    connectSpy.mockRestore();
    jest.restoreAllMocks();
  });
});
