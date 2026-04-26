const MONGO_OPERATORS = ["gt", "gte", "lt", "lte", "in"];
const RESERVED_FIELDS = ["select", "sort", "page", "limit"];

/**
 * Converts an Express query object into a MongoDB filter object.
 * Strips pagination/sorting fields and replaces comparison keywords
 * (gt, gte, lt, lte, in) with their $ prefixed MongoDB equivalents.
 */
const buildQueryFilter = (query, extraMatch = {}) => {
  const reqQuery = { ...query };
  RESERVED_FIELDS.forEach((field) => delete reqQuery[field]);

  const queryStr = JSON.stringify(reqQuery).replace(
    new RegExp(`\\b(${MONGO_OPERATORS.join("|")})\\b`, "g"),
    (match) => `$${match}`
  );

  return { ...JSON.parse(queryStr), ...extraMatch };
};

/**
 * Builds a pagination metadata object from page/limit/total.
 * Includes a `next` key when more pages follow, and a `prev` key
 * when the caller is not on the first page.
 */
const buildPagination = (page, limit, total) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const pagination = {};
  if (endIndex < total) pagination.next = { page: page + 1, limit };
  if (startIndex > 0) pagination.prev = { page: page - 1, limit };
  return pagination;
};

module.exports = { buildQueryFilter, buildPagination };
