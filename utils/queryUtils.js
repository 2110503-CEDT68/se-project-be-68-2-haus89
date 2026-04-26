// Turns an Express query object into a MongoDB filter.
// Drops pagination/sort fields, then rewrites gt/gte/lt/lte/in with $gt/$gte/etc.
const buildQueryFilter = (query, extraMatch = {}) => {
  const reqQuery = { ...query };
  const removeFields = ["select", "sort", "page", "limit"];
  removeFields.forEach((param) => delete reqQuery[param]);

  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);

  return { ...JSON.parse(queryStr), ...extraMatch };
};

// Returns { next, prev } page pointers based on current position in the result set.
const buildPagination = (page, limit, total) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const pagination = {};
  if (endIndex < total) pagination.next = { page: page + 1, limit };
  if (startIndex > 0) pagination.prev = { page: page - 1, limit };
  return pagination;
};

module.exports = { buildQueryFilter, buildPagination };
