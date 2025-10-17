// scripts/seedTestimonials.js
require('dotenv').config();
const mongoose = require('mongoose');

const Testimonial = require('../models/Testimonial'); // adjust path if needed

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zexa';

// Realistic Zexa testimonials with star ratings
const SEED = [
  {
    quote:
      "The Zexa Weekender looks even better in person—buttery zippers, solid stitching, zero loose threads. Worth every rupee.",
    author: "Riya M. — Mumbai",
    rating: 5,
  },
  {
    quote:
      "Finally a tote that fits my 14” laptop, lunch, and a water bottle without looking bulky. Daily carry solved.",
    author: "Ananya S. — Bengaluru",
    rating: 4,
  },
  {
    quote:
      "Took the Cabin Roller on a 4-day trip—glides like a dream and survived two layovers without a scuff.",
    author: "Arjun K. — Pune",
    rating: 5,
  },
  {
    quote:
      "The leather patina after 3 months is gorgeous. Straps are comfortable even when the bag’s loaded.",
    author: "Priya D. — Hyderabad",
    rating: 5,
  },
  {
    quote:
      "Zexa’s minimalist design goes with everything. Got stopped twice to ask where I bought it.",
    author: "Nikhil R. — New Delhi",
    rating: 4,
  },
  {
    quote:
      "Smart pockets for keys and earphones—no more digging. It’s the small things that make it premium.",
    author: "Meera G. — Chennai",
    rating: 5,
  },
  {
    quote:
      "Lightweight yet sturdy. My camera gear feels safe inside the padded insert.",
    author: "Kabir P. — Gurugram",
    rating: 4,
  },
  {
    quote:
      "Great customer support. They helped me swap a color before shipping with zero hassle.",
    author: "Sneha L. — Kolkata",
    rating: 5,
  },
];

async function main() {
  const purge = process.argv.includes('--purge');
  await mongoose.connect(MONGO_URI);

  if (purge) {
    const del = await Testimonial.deleteMany({});
    console.log(`Purged ${del.deletedCount} existing testimonials.`);
  }

  // Idempotent insert: skip if exact quote already exists
  let inserted = 0;
  for (const t of SEED) {
    const exists = await Testimonial.findOne({ quote: t.quote }).lean();
    if (!exists) {
      await Testimonial.create(t);
      inserted++;
    }
  }

  console.log(`Seed complete. Inserted ${inserted} new testimonial(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
