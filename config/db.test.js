import mongoose from 'mongoose';
import connectDB from './db';

jest.mock('mongoose', () => ({
  connect: jest.fn(),
}));

jest.mock('node:dns/promises', () => ({
  setServers: jest.fn(),
}));

describe('connectDB', () => {
  let consoleSpy;
  let processExitSpy;

  beforeEach(() => {
    process.env.MONGO_URL = 'mongodb://testurl';
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('connects to MongoDB successfully', async () => {
    mongoose.connect.mockResolvedValue({
      connection: { host: 'localhost' },
    });

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://testurl');
    expect(console.log).toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  test('logs error when MongoDB connection fails', async () => {
    mongoose.connect.mockRejectedValue(new Error('Connection failed'));

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://testurl');
    expect(console.log).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
