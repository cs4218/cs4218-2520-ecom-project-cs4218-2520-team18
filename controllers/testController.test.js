// Loh Ze Qing Norbert, A0277473R

import { testController } from "./testController.js";

describe("testController Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    // Arrange - Setup common request and response objects
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe("Access Validation", () => {
    test("should return 200 and success message when accessed", () => {
      // Act
      testController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Protected route accessed successfully",
        })
      );
    });
  });

  describe("System Error Handling", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test("should handle unexpected failures during execution", () => {

      res.status.mockImplementationOnce(() => {
        throw new Error("Unexpected internal error");
      });

      // Act
      testController(req, res);

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Test",
        })
      );
    });
  });
});