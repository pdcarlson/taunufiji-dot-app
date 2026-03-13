const hoisted = vi.hoisted(() => {
  const mockAccountGet = vi.fn();
  const mockCreateJWTClient = vi.fn(() => ({
    account: { get: mockAccountGet },
  }));
  const mockAuthService = {
    verifyBrother: vi.fn(),
    verifyRole: vi.fn(),
  };
  const mockContainer = {
    authService: mockAuthService,
  };

  return {
    mockAccountGet,
    mockCreateJWTClient,
    mockAuthService,
    mockContainer,
  };
});

vi.mock("@/lib/presentation/server/appwrite", () => ({
  createJWTClient: hoisted.mockCreateJWTClient,
}));

vi.mock("@/lib/infrastructure/container", () => ({
  getContainer: () => hoisted.mockContainer,
}));

import { actionWrapper } from "./action-handler";

describe("actionWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    hoisted.mockAccountGet.mockResolvedValue({ $id: "auth_user_1" });
    hoisted.mockAuthService.verifyBrother.mockResolvedValue(true);
    hoisted.mockAuthService.verifyRole.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns authentication error when JWT is missing", async () => {
    const result = await actionWrapper(async () => true, {
      actionName: "test.noJwt",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("returns insufficient role when brother check fails", async () => {
    hoisted.mockAuthService.verifyBrother.mockResolvedValue(false);

    const result = await actionWrapper(async () => true, {
      jwt: "jwt-token",
      actionName: "test.brotherCheck",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("INSUFFICIENT_ROLE");
    }
    expect(hoisted.mockAuthService.verifyRole).not.toHaveBeenCalled();
  });

  it("returns insufficient role when allowed role check fails", async () => {
    hoisted.mockAuthService.verifyRole.mockResolvedValue(false);

    const result = await actionWrapper(async () => true, {
      jwt: "jwt-token",
      allowedRoles: ["role-admin"],
      actionName: "test.allowedRoleCheck",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("INSUFFICIENT_ROLE");
    }
  });

  it("executes action successfully when auth and roles pass", async () => {
    const result = await actionWrapper(
      async ({ userId }) => ({
        ok: true,
        userId,
      }),
      {
        jwt: "jwt-token",
        allowedRoles: ["role-admin"],
        actionName: "test.successPath",
      },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ ok: true, userId: "auth_user_1" });
    }
    expect(hoisted.mockAuthService.verifyBrother).toHaveBeenCalledWith(
      "auth_user_1",
    );
    expect(hoisted.mockAuthService.verifyRole).toHaveBeenCalledWith(
      "auth_user_1",
      ["role-admin"],
    );
  });

  it("classifies database failures with DATABASE_ERROR", async () => {
    const result = await actionWrapper(
      async () => {
        throw new Error("Database operation failed: create");
      },
      {
        jwt: "jwt-token",
        actionName: "test.databaseFailure",
      },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("DATABASE_ERROR");
    }
  });

  it("classifies missing resource as VALIDATION_ERROR", async () => {
    const result = await actionWrapper(
      async () => {
        throw new Error("Task not found.");
      },
      {
        jwt: "jwt-token",
        actionName: "test.missingResource",
      },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("VALIDATION_ERROR");
    }
  });

  it("supports public actions without requiring JWT", async () => {
    const result = await actionWrapper(
      async ({ userId }) => ({
        publicCall: true,
        userId,
      }),
      {
        public: true,
        actionName: "test.publicAction",
      },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ publicCall: true, userId: "" });
    }
    expect(hoisted.mockAuthService.verifyBrother).not.toHaveBeenCalled();
  });

  it("classifies typed app errors using code metadata", async () => {
    const result = await actionWrapper(
      async () => {
        throw { code: "EXTERNAL_SERVICE_ERROR", message: "Discord failed" };
      },
      {
        jwt: "jwt-token",
        actionName: "test.codeBasedClassification",
      },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("EXTERNAL_SERVICE_ERROR");
    }
  });

  it("classifies database code metadata as DATABASE_ERROR", async () => {
    const result = await actionWrapper(
      async () => {
        throw { code: "DATABASE_ERROR", message: "create failed" };
      },
      {
        jwt: "jwt-token",
        actionName: "test.databaseCodeClassification",
      },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("DATABASE_ERROR");
    }
  });

  it("classifies external-service text failures from error messages", async () => {
    const result = await actionWrapper(
      async () => {
        throw new Error("Discord API request failed");
      },
      {
        jwt: "jwt-token",
        actionName: "test.externalMessageClassification",
      },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("EXTERNAL_SERVICE_ERROR");
    }
  });

  it("falls back to UNKNOWN_ERROR for uncategorized failures", async () => {
    const result = await actionWrapper(
      async () => {
        throw new Error("Totally unexpected panic");
      },
      {
        jwt: "jwt-token",
        actionName: "test.unknownClassification",
      },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("UNKNOWN_ERROR");
    }
  });
});
