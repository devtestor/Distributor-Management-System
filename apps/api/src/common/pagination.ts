export type PaginationQuery = {
  page?: string | string[];
  limit?: string | string[];
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function paginationArgs(query?: PaginationQuery, defaultLimit = 100, maxLimit = 500) {
  const page = parsePositiveInt(firstValue(query?.page), 1);
  const requestedLimit = parsePositiveInt(firstValue(query?.limit), defaultLimit);
  const take = Math.min(requestedLimit, maxLimit);

  return {
    skip: (page - 1) * take,
    take
  };
}
