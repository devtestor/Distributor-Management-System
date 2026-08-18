export const publicUserSelect = {
  id: true,
  companyId: true,
  fullName: true,
  phone: true,
  email: true,
  preferredLocale: true,
  isActive: true,
  createdAt: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true
    }
  }
} as const;
