// Validates the body of POST/PUT requests before they hit the DB.
const validateEntry = (req, res, next) => {
  const { date, time, glucoseLevel, insulinUnits } = req.body;
  const errors = [];

  if (!date) errors.push('Date is required');
  if (!time) errors.push('Time is required');

  if (glucoseLevel === undefined || glucoseLevel === null || glucoseLevel === '') {
    errors.push('Glucose level is required');
  } else if (Number(glucoseLevel) < 0) {
    errors.push('Glucose level cannot be negative');
  }

  if (insulinUnits === undefined || insulinUnits === null || insulinUnits === '') {
    errors.push('Insulin units are required');
  } else if (Number(insulinUnits) < 0) {
    errors.push('Insulin units cannot be negative');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

module.exports = validateEntry;
