// controllers/slideController.js
const Slide = require('../../models/Slide');

/**
 * GET /api/slides
 * Returns all slides metadata (no image buffer).
 */
exports.getAllSlides = async (req, res) => {
  try {
    // include the image buffer in the query
    const rawItems = await Slide.find().sort({ createdAt: 1 });

    // map to JSON‐safe objects with a data URI for the image
    const items = rawItems.map((slide) => {
      const obj = slide.toObject();
      const { data, contentType } = obj.image;
      // convert buffer to base64 data URI
      const image = `data:${contentType};base64,${data.toString('base64')}`;
      return {
        _id:       obj._id,
        title:     obj.title,
        subtitle:  obj.subtitle,
        ctaHref:   obj.ctaHref,
        ctaText:   obj.ctaText,
        image,     // now a string data URI
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
      };
    });

    res.json({ success: true, items });
  } catch (err) {
    console.error('Error fetching slides:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSlideImage = async (req, res) => {
  const slide = await Slide.findById(req.params.id).select('image');
  if (!slide || !slide.image.data) {
    return res.status(404).send('Not found');
  }
  res.contentType(slide.image.contentType);
  res.send(slide.image.data);
};

exports.createSlide = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Image file is required.' });
  }
  const { title, subtitle, ctaHref, ctaText } = req.body;
  try {
    const slide = new Slide({
      title,
      subtitle,
      ctaHref,
      ctaText,
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });
    await slide.save();
    res.status(201).json({ success: true, item: slide });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/slides/update
 * Body: multipart/form-data including:
 *   - id (string)
 *   - title, subtitle, ctaHref, ctaText (strings)
 *   - optional image file (field name "image")
 */
exports.updateSlide = async (req, res) => {
  const { id, title, subtitle, ctaHref, ctaText } = req.body;
  if (!id || !title?.trim() || !subtitle?.trim() || !ctaHref?.trim() || !ctaText?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: 'All fields (id, title, subtitle, ctaHref, ctaText) are required.' });
  }

  try {
    const slide = await Slide.findById(id);
    if (!slide) {
      return res
        .status(404)
        .json({ success: false, message: 'Slide not found.' });
    }

    // Update text fields
    slide.title    = title;
    slide.subtitle = subtitle;
    slide.ctaHref  = ctaHref;
    slide.ctaText  = ctaText;

    // If a new image file was uploaded, replace it
    if (req.file) {
      slide.image.data        = req.file.buffer;
      slide.image.contentType = req.file.mimetype;
    }

    await slide.save();
    res.json({ success: true, item: slide });
  } catch (err) {
    console.error('Error updating slide:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/slides/delete
 * Body: { id }
 */
exports.deleteSlide = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: 'Slide ID is required.' });
  }

  try {
    const deleted = await Slide.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: 'Slide not found.' });
    }
    res.json({ success: true, message: 'Slide deleted.', item: deleted });
  } catch (err) {
    console.error('Error deleting slide:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
