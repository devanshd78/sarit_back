require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const testimonialRoutes = require('./routes/home/testimonialRoutes');
const slideRoutes = require('./routes/home/slideRoutes');
const collectionRoutes = require('./routes/home/collectionRoutes');
const bagRoutes = require('./routes/bagRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes')
const shippingRoutes = require('./routes/shippingRoutes')


const adminRoutes = require('./routes/adminRoutes');

// Importing the requireAuth middleware for protected routes
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

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

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
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/slides', slideRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/bag-collections', bagRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/checkout', checkoutRoutes);


app.use('/api/admin', adminRoutes);

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
