declare global {
  namespace Express {
    interface AuthContext {
      userId: string;
      organizationId: string;
    }

    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
