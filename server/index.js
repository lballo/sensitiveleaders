const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/swipes', require('./routes/swipes'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/events', require('./routes/events'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/inspirations', require('./routes/inspirations'));

// Initialize database
const db = require('./config/database');
db.init();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

