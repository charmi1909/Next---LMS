// Create this file: app/types/jwt.ts
export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Or add this to your existing types file