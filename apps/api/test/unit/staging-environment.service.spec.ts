import { InternalServerErrorException } from "@nestjs/common";

import { StagingEnvironmentService } from "../../src/modules/staging/staging-environment.service";

describe("StagingEnvironmentService", () => {
  it("fails fast when required staging environment configuration is missing", async () => {
    const service = new StagingEnvironmentService({
      get: jest.fn().mockReturnValue(undefined),
    } as any);

    await expect(service.resetStagingFromLive()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
