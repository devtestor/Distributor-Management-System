export type AuthenticatedRequest = {
  user: {
    id: string;
    email: string | null;
    role: string;
  };
};
