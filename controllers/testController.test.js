import { testController } from "./testController.js";

jest.mock("../models/userModel.js");
jest.mock("./../helpers/authHelper.js");
jest.mock("jsonwebtoken");

describe('testController', () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('should return "Protected Routes" message', () => {
    testController(req, res);

    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Protected route accessed successfully",
    }));
  });

  it('should handle errors gracefully', () => {
    const error = new Error('Unexpected error');
    res.send.mockImplementationOnce(() => {
      throw error;
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    testController(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Test",
      })
    );

    consoleErrorSpy.mockRestore();
  });
});
