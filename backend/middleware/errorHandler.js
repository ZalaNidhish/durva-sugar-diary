// Catches errors passed via next(err) or thrown inside asyncHandler-wrapped
// routes, and returns a consistent JSON error shape.
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error (e.g. schema-level "required" failures)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, errors: messages });
  }

  // Invalid ObjectId passed in a route param
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, errors: ['Invalid ID format'] });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    errors: [err.message || 'Server error'],
  });
};

module.exports = errorHandler;
