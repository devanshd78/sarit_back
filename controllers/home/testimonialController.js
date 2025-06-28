// controllers/testimonialController.js
const Testimonial = require('../../models/Testimonial');

exports.getAllTestimonials = async (req, res) => {
  try {
    const items = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (err) {
    console.error('Error fetching testimonials:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createTestimonial = async (req, res) => {
  const { quote, author } = req.body;
  if (!quote?.trim() || !author?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: 'Quote and author are required.' });
  }

  try {
    const newItem = await Testimonial.create({ quote, author });
    res.status(201).json({ success: true, item: newItem });
  } catch (err) {
    console.error('Error creating testimonial:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /admin/testimonials/delete
 * Body: { id }
 * Deletes the testimonial with the given ID.
 */
exports.deleteTestimonial = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: 'Testimonial ID is required.' });
  }

  try {
    const deleted = await Testimonial.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: 'Testimonial not found.' });
    }
    res.json({ success: true, message: 'Testimonial deleted.', item: deleted });
  } catch (err) {
    console.error('Error deleting testimonial:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
