// ─────────────────────────────────────────────────────────────
//  RESPONSE HELPERS — consistent API response format
// ─────────────────────────────────────────────────────────────

export const successResponse = (res, statusCode = 200, message, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res, statusCode = 500, message, errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) response.errors = errors;

  return res.status(statusCode).json(response);
};

// Common error shortcuts
export const badRequest = (res, message, errors = null) =>
  errorResponse(res, 400, message, errors);

export const unauthorized = (res, message = "Unauthorized access") =>
  errorResponse(res, 401, message);

export const forbidden = (res, message = "Access forbidden") =>
  errorResponse(res, 403, message);

export const notFound = (res, message = "Resource not found") =>
  errorResponse(res, 404, message);

export const conflict = (res, message) =>
  errorResponse(res, 409, message);

export const serverError = (res, message = "Internal server error") =>
  errorResponse(res, 500, message);
