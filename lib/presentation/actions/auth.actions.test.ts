const hoisted = vi.hoisted(() => {
  const mockAccountGet = vi.fn();
  const mockCreateJWTClient = vi.fn(() => ({
    account: { get: mockAccountGet },
  }));
  const mockAuthService = {
    verifyBrother: vi.fn(),
    verifyRole: vi.fn(),
    syncUser: vi.fn(),
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

import { getProfileAction } from "./auth.actions";

describe("getProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockAccountGet.mockResolvedValue({ $id: "auth_user_1" });
    hoisted.mockAuthService.syncUser.mockResolvedValue({
      id: "profile_1",
      discord_id: "discord_1",
    });
  });

  it("does not create a profile for a user without the access role", async () => {
    hoisted.mockAuthService.verifyBrother.mockResolvedValue(false);

    const result = await getProfileAction("jwt-token");

    expect(hoisted.mockAuthService.verifyBrother).toHaveBeenCalledWith(
      "auth_user_1",
    );
    expect(hoisted.mockAuthService.syncUser).not.toHaveBeenCalled();
    expect(result).toEqual({ isAuthorized: false });
  });

  it("syncs and returns the profile for a user with the access role", async () => {
    hoisted.mockAuthService.verifyBrother.mockResolvedValue(true);

    const result = await getProfileAction("jwt-token");

    expect(hoisted.mockAuthService.syncUser).toHaveBeenCalledWith(
      "auth_user_1",
    );
    expect(result).toEqual({
      id: "profile_1",
      discord_id: "discord_1",
      isAuthorized: true,
    });
  });
});
