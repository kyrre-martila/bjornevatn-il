import { BadRequestException } from "@nestjs/common";

/**
 * Lightweight anti-bot extension point.
 * Integrators can wire CAPTCHA or custom challenge verification behind this hook
 * without changing public controllers.
 */
export function verifySubmissionChallenge(challengeToken?: string): void {
  const requiredStaticToken = process.env.PUBLIC_SUBMISSION_CHALLENGE_TOKEN;
  if (!requiredStaticToken) {
    return;
  }

  if (!challengeToken || challengeToken !== requiredStaticToken) {
    throw new BadRequestException("Submission challenge failed.");
  }
}
