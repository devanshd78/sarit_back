require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { requireAuth } = require('./controllers/authController');

const app = express();
const server = http.createServer(app);

// -- Security Middlewares --
app.use(helmet()); // secure headers
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.'
}));

// -- CORS + body parsers --
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -- Mount Auth Routes --
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// -- Example Protected Route --
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ message: `Hello user ${req.userId}` });
});

// -- Connect to MongoDB & Start Server --
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
