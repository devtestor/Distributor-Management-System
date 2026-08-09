export type AuthenticatedRequest = {
  user: {
    id: string;
    companyId: string;
    email: string | null;
    role: string;
  };
};
