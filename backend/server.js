const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const entryRoutes = require('./routes/entryRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/entries', entryRoutes);

app.get('/', (req, res) => res.send('Sugar Diary API is running'));

// Error handler must be registered last, after all routes
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sugar-diary';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
