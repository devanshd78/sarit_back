// controllers/bagCollectionController.js

const mongoose = require('mongoose');
const BagCollection = require('../models/Bag');

/**
 * GET /api/bag-collections?type=<1|2>&availability=<all|in-stock|out-of-stock>&priceSort=<low-high|high-low>
 */
exports.getAll = async (req, res) => {
  try {
    const { type, availability, priceSort } = req.query;
    const filter = {};

    // Type filter
    if (type !== undefined) {
      const t = parseInt(type, 10);
      if (![1, 2].includes(t)) {
        return res.status(400).json({ success: false, message: 'Invalid type; must be 1 or 2.' });
      }
      filter.type = t;
    }

    // Availability filter
    if (availability === 'in-stock') {
      filter.quantity = { $gt: 0 };
    } else if (availability === 'out-of-stock') {
      filter.quantity = 0;
    } else if (availability && availability !== 'all') {
      return res.status(400).json({ success: false, message: 'Invalid availability; must be all|in-stock|out-of-stock.' });
    }

    // Sorting
    let sortObj = { createdAt: 1 };
    if (priceSort === 'low-high') {
      sortObj = { price: 1 };
    } else if (priceSort === 'high-low') {
      sortObj = { price: -1 };
    } else if (priceSort) {
      return res.status(400).json({ success: false, message: 'Invalid priceSort; must be low-high|high-low.' });
    }

    const raw = await BagCollection.find(filter).sort(sortObj);
    const items = raw.map(doc => {
      const o = doc.toObject();
      return {
        _id: o._id,
        title: o.title,
        bagName: o.bagName,
        description: o.description,
        productDescription: o.productDescription,
        href: o.href,
        type: o.type,
        price: o.price,
        compareAt: o.compareAt || 0,
        onSale: Boolean(o.onSale),
        rating: o.rating,
        reviews: o.reviews || 0,
        deliveryCharge: o.deliveryCharge,
        quantity: o.quantity || 1,

        // new fields
        dimensions: o.dimensions || {},
        weight: o.weight || {},
        material: o.material,
        colors: o.colors || [],
        capacity: o.capacity,
        brand: o.brand,
        features: o.features || [],

        images: o.images.map(img =>
          `data:${img.contentType};base64,${img.data.toString('base64')}`
        ),
        createdAt: o.createdAt,
      };
    });

    res.json({ success: true, items });
  } catch (err) {
    console.error('Error in getAll:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving collections.' });
  }
};

/**
 * GET /api/bag-collections/:id
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }

    const doc = await BagCollection.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    const o = doc.toObject();
    const item = {
      _id: o._id,
      title: o.title,
      bagName: o.bagName,
      description: o.description,
      productDescription: o.productDescription,
      href: o.href,
      type: o.type,
      price: o.price,
      compareAt: o.compareAt || 0,
      onSale: Boolean(o.onSale),
      rating: o.rating,
      reviews: o.reviews || 0,
      deliveryCharge: o.deliveryCharge,
      quantity: o.quantity || 1,

      // new fields
      dimensions: o.dimensions || {},
      weight: o.weight || {},
      material: o.material,
      colors: o.colors || [],
      capacity: o.capacity,
      brand: o.brand,
      features: o.features || [],

      images: o.images.map(img =>
        `data:${img.contentType};base64,${img.data.toString('base64')}`
      ),
      createdAt: o.createdAt,
    };

    res.json({ success: true, item });
  } catch (err) {
    console.error('Error in getById:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving item.' });
  }
};

/**
 * POST /api/bag-collections
 * multipart/form-data
 */

exports.create = async (req, res) => {
  try {
    const {
      title,
      bagName,
      description,
      productDescription,
      href,
      type,
      price,
      deliveryCharge,
      rating,
      reviews,
      compareAt,
      onSale,
      quantity,
      dimensions,
      weight,
      material,
      colors,
      capacity,
      brand,
      features,
    } = req.body;

    // Basic validation
    if (!title?.trim() ||
        !bagName?.trim() ||
        !description?.trim() ||
        !href?.trim() ||
        !['1', '2'].includes(type)
    ) {
      return res.status(400).json({ success: false, message: 'Missing or invalid fields.' });
    }
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'At least one image file is required.' });
    }

    // Parse numeric fields
    const parsedPrice = parseFloat(price);
    const parsedDelivery = parseFloat(deliveryCharge);
    const parsedRating = parseFloat(rating);
    const parsedReviews = parseInt(reviews, 10);
    const parsedCompare = parseFloat(compareAt);
    const parsedOnSale = onSale === 'true' || onSale === true;

    if ([parsedPrice, parsedDelivery, parsedRating, parsedCompare].some(n => Number.isNaN(n)) ||
        Number.isNaN(parsedReviews)
    ) {
      return res.status(400).json({ success: false, message: 'Price, deliveryCharge, rating, reviews, and compareAt must be numbers.' });
    }
    if (parsedRating < 0 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 0 and 5.' });
    }

    // Parse JSON fields
    let dims = {};
    try { dims = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions; } catch {}
    let wt = {};
    try { wt = typeof weight === 'string' ? JSON.parse(weight) : weight; } catch {}
    const colorArr = Array.isArray(colors)
      ? colors
      : (typeof colors === 'string' ? colors.split(',').map(s => s.trim()) : []);
    const featureArr = Array.isArray(features)
      ? features
      : (typeof features === 'string' ? features.split(',').map(s => s.trim()) : []);

    // Build document
    const bc = new BagCollection({
      title: title.trim(),
      bagName: bagName.trim(),
      description: description.trim(),
      productDescription: productDescription?.trim(),
      href: href.trim(),
      type: parseInt(type, 10),
      price: parsedPrice,
      compareAt: parsedCompare,
      onSale: parsedOnSale,
      rating: parsedRating,
      reviews: parsedReviews,
      deliveryCharge: parsedDelivery,
      quantity: parseInt(quantity, 10) || 1,

      dimensions: {
        width: parseFloat(dims.width) || 0,
        height: parseFloat(dims.height) || 0,
        depth: parseFloat(dims.depth) || 0,
        unit: dims.unit || 'cm',
      },
      weight: {
        value: parseFloat(wt.value) || 0,
        unit: wt.unit || 'kg',
      },
      material: material?.trim(),
      colors: colorArr,
      capacity: capacity?.trim(),
      brand: brand?.trim(),
      features: featureArr,

      images: req.files.map(f => ({ data: f.buffer, contentType: f.mimetype })),
    });

    await bc.save();
    res.status(201).json({ success: true, item: bc });
  } catch (err) {
    console.error('Error in create:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error creating collection.' });
  }
};

/**
 * POST /api/bag-collections/update
 * multipart/form-data
 */
exports.update = async (req, res) => {
  try {
    const {
      id,
      title,
      bagName,
      description,
      productDescription,
      href,
      type,
      price,
      deliveryCharge,
      rating,
      reviews,
      compareAt,
      onSale,
      quantity,
      dimensions,
      weight,
      material,
      colors,
      capacity,
      brand,
      features,
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID is required.' });
    }
    if (!['1', '2'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be 1 or 2.' });
    }

    const bc = await BagCollection.findById(id);
    if (!bc) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    // Parse numeric fields
    const parsedPrice = parseFloat(price);
    const parsedDelivery = parseFloat(deliveryCharge);
    const parsedRating = parseFloat(rating);
    const parsedReviews = parseInt(reviews, 10);
    const parsedCompare = parseFloat(compareAt);
    const parsedOnSale = onSale === 'true' || onSale === true;

    if ([parsedPrice, parsedDelivery, parsedRating, parsedCompare].some(n => Number.isNaN(n)) ||
        Number.isNaN(parsedReviews)
    ) {
      return res.status(400).json({ success: false, message: 'Price, deliveryCharge, rating, reviews, and compareAt must be numbers.' });
    }
    if (parsedRating < 0 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 0 and 5.' });
    }

    // Parse JSON fields
    let dims = {};
    try { dims = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions; } catch {}
    let wt = {};
    try { wt = typeof weight === 'string' ? JSON.parse(weight) : weight; } catch {}
    const colorArr = Array.isArray(colors)
      ? colors
      : (typeof colors === 'string' ? colors.split(',').map(s => s.trim()) : []);
    const featureArr = Array.isArray(features)
      ? features
      : (typeof features === 'string' ? features.split(',').map(s => s.trim()) : []);

    // Apply updates
    bc.title = title.trim();
    bc.bagName = bagName.trim();
    bc.description = description.trim();
    bc.productDescription = productDescription?.trim();
    bc.href = href.trim();
    bc.type = parseInt(type, 10);
    bc.price = parsedPrice;
    bc.compareAt = parsedCompare;
    bc.onSale = parsedOnSale;
    bc.rating = parsedRating;
    bc.reviews = parsedReviews;
    bc.deliveryCharge = parsedDelivery;
    bc.quantity = parseInt(quantity, 10) || 1;

    bc.dimensions = {
      width: parseFloat(dims.width) || 0,
      height: parseFloat(dims.height) || 0,
      depth: parseFloat(dims.depth) || 0,
      unit: dims.unit || 'cm',
    };
    bc.weight = {
      value: parseFloat(wt.value) || 0,
      unit: wt.unit || 'kg',
    };
    bc.material = material?.trim();
    bc.colors = colorArr;
    bc.capacity = capacity?.trim();
    bc.brand = brand?.trim();
    bc.features = featureArr;

    if (req.files?.length) {
      bc.images = req.files.map(f => ({ data: f.buffer, contentType: f.mimetype }));
    }

    await bc.save();
    res.json({ success: true, item: bc });
  } catch (err) {
    console.error('Error in update:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Server error updating collection.' });
  }
};

/**
 * POST /api/bag-collections/delete
 * JSON { id }
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID is required.' });
    }

    const removed = await BagCollection.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    res.json({ success: true, message: 'Deleted successfully.' });
  } catch (err) {
    console.error('Error in delete:', err);
    res.status(500).json({ success: false, message: 'Server error deleting collection.' });
  }
};
