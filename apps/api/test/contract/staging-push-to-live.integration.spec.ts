jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AuthService } from "../../src/modules/auth/auth.service";
import { StagingController } from "../../src/modules/staging/staging.controller";
import { StagingAdminService } from "../../src/modules/staging/staging.service";

describe("Staging push-to-live integration", () => {
  let app: INestApplication;

  const authService = {
    validateUser: jest.fn(async (token: string) => {
      if (token === "superadmin-token") {
        return {
          id: "user-super",
          email: "superadmin@example.com",
          name: "Super Admin",
          role: "super_admin",
        };
      }

      if (token === "admin-token") {
        return {
          id: "user-admin",
          email: "admin@example.com",
          name: "Admin",
          role: "admin",
        };
      }

      if (token === "editor-token") {
        return {
          id: "user-editor",
          email: "editor@example.com",
          name: "Editor",
          role: "editor",
        };
      }

      return {
        id: "user-unknown",
        email: "unknown@example.com",
        name: "Unknown",
        role: "editor",
      };
    }),
  } as Partial<AuthService>;

  const stagingService = {
    pushToLive: jest.fn(async () => ({ ok: true })),
  } as Partial<StagingAdminService>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StagingController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: StagingAdminService,
          useValue: stagingService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: [] });
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("allows superadmin push-to-live when confirmation payload is present", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/admin/staging/push-to-live")
      .set("Authorization", "Bearer superadmin-token")
      .send({ confirmPushToLive: true });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ok: true });
    expect(stagingService.pushToLive).toHaveBeenCalledTimes(1);
  });

  it("rejects push-to-live when confirmation payload is missing", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/admin/staging/push-to-live")
      .set("Authorization", "Bearer superadmin-token")
      .send({});

    expect(response.status).toBe(400);
    expect(stagingService.pushToLive).not.toHaveBeenCalled();
  });

  it("rejects push-to-live for admin/editor roles", async () => {
    const adminResponse = await request(app.getHttpServer())
      .post("/api/v1/admin/staging/push-to-live")
      .set("Authorization", "Bearer admin-token")
      .send({ confirmPushToLive: true });

    const editorResponse = await request(app.getHttpServer())
      .post("/api/v1/admin/staging/push-to-live")
      .set("Authorization", "Bearer editor-token")
      .send({ confirmPushToLive: true });

    expect(adminResponse.status).toBe(403);
    expect(editorResponse.status).toBe(403);
    expect(stagingService.pushToLive).not.toHaveBeenCalled();
  });
});
