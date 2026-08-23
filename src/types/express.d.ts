declare global {
  namespace Express {
    interface AuthContext {
      userId: string;
      organizationId: string;
    }

    interface Request {
      requestId: string;
      auth?: AuthContext;
    }
  }
}

export {};
