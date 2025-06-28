// controllers/collectionController.js
const Collection = require('../../models/Collection');

/**
 * GET /api/collections
 * Returns all collections, each with its image as a data URI.
 */
exports.getAllCollections = async (req, res) => {
  try {
    const rawItems = await Collection.find().sort({ createdAt: 1 });
    const items = rawItems.map((col) => {
      const obj = col.toObject();
      const { data, contentType } = obj.image;
      const image = `data:${contentType};base64,${data.toString('base64')}`;
      return {
        _id:       obj._id,
        title:     obj.title,
        subtitle:  obj.subtitle,
        href:      obj.href,
        image,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
      };
    });
    res.json({ success: true, items });
  } catch (err) {
    console.error('Error fetching collections:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/collections/:id/image
 * Streams just the raw image binary for a collection.
 */
exports.getCollectionImage = async (req, res) => {
  try {
    const col = await Collection.findById(req.params.id).select('image');
    if (!col || !col.image?.data) {
      return res.status(404).send('Not found');
    }
    res.contentType(col.image.contentType);
    res.send(col.image.data);
  } catch (err) {
    console.error('Error fetching collection image:', err);
    res.status(500).send('Server error');
  }
};

/**
 * POST /api/collections
 * Creates a new collection with an uploaded image.
 */
exports.createCollection = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: 'Image file is required.' });
  }
  const { title, subtitle, href } = req.body;
  try {
    const col = new Collection({ title, subtitle, href, image: { data: req.file.buffer, contentType: req.file.mimetype } });
    await col.save();
    res.status(201).json({ success: true, item: col });
  } catch (err) {
    console.error('Error creating collection:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/collections/update
 * Body: multipart/form-data including id, title, subtitle, href, optional image
 */
exports.updateCollection = async (req, res) => {
  const { id, title, subtitle, href } = req.body;
  if (!id || !title?.trim() || !subtitle?.trim() || !href?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: 'id, title, subtitle and href are required.' });
  }
  try {
    const col = await Collection.findById(id);
    if (!col) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }
    col.title    = title;
    col.subtitle = subtitle;
    col.href     = href;
    if (req.file) {
      col.image.data        = req.file.buffer;
      col.image.contentType = req.file.mimetype;
    }
    await col.save();
    res.json({ success: true, item: col });
  } catch (err) {
    console.error('Error updating collection:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/collections/delete
 * Body: { id }
 */
exports.deleteCollection = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: 'Collection ID is required.' });
  }
  try {
    const deleted = await Collection.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }
    res.json({ success: true, message: 'Collection deleted.', item: deleted });
  } catch (err) {
    console.error('Error deleting collection:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
