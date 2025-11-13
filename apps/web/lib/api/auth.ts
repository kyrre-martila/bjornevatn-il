const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3333';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export class AuthError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

async function handleResponse(res: Response): Promise<AuthResponse> {
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let message = 'Unexpected error';
    if (isJson) {
      try {
        const data = await res.json();
        message = data.message || data.error || message;
      } catch {
        // ignore
      }
    }
    const err = new AuthError(message, res.status);
    throw err;
  }

  if (!isJson) {
    throw new AuthError('Invalid response from server', res.status);
  }

  const data = (await res.json()) as AuthResponse;
  if (!data || !data.accessToken || !data.user) {
    throw new AuthError('Malformed auth response', res.status);
  }

  return data;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return handleResponse(res);
}

export async function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return handleResponse(res);
}
