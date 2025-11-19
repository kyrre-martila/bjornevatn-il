import { proxyAuthRequest } from "../utils";

export async function POST(req: Request): Promise<Response> {
  return proxyAuthRequest(req, "/auth/logout");
}
