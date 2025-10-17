// controllers/recommendationController.js
const mongoose = require('mongoose');
const BagCollection = require('../models/Bag');

// helper: transform doc -> DTO (same as your getAll)
function toDTO(o) {
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
    onSale: !!o.onSale,
    rating: o.rating,
    reviews: o.reviews || 0,
    deliveryCharge: o.deliveryCharge,
    quantity: o.quantity || 1,
    isBestSeller: !!o.isBestSeller,

    // new fields
    dimensions: o.dimensions || {},
    weight: o.weight || {},
    material: o.material,
    colors: o.colors || [],
    capacity: o.capacity,
    brand: o.brand,
    features: o.features || [],

    images: (o.images || []).map(
      (img) => `data:${img.contentType};base64,${img.data.toString('base64')}`
    ),
    createdAt: o.createdAt,
  };
}

exports.browse = async (req, res) => {
  try {
    const {
      limit = 6,
      exclude = '',        // comma-separated ids to exclude
      type,                // 1 | 2 | 3
      priceMin,            // number
      priceMax,            // number
      inStock = 'true',    // 'true' | 'false'
      seedIds = '',        // comma-separated ids used as similarity seeds
    } = req.query;

    // ---- Parse filters
    const filter = {};
    const lim = Math.max(1, Math.min(24, parseInt(String(limit), 10) || 6));

    const excludeIds = exclude
      .split(',')
      .map((s) => s.trim())
      .filter((s) => mongoose.isValidObjectId(s))
      .map((s) => new mongoose.Types.ObjectId(s));

    if (excludeIds.length) filter._id = { $nin: excludeIds };

    if (type !== undefined) {
      const t = parseInt(String(type), 10);
      if (![1, 2, 3].includes(t)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid type; must be 1, 2, or 3.' });
      }
      filter.type = t;
    }

    if (inStock === 'true') filter.quantity = { $gt: 0 };

    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = parseFloat(String(priceMin));
      if (priceMax) filter.price.$lte = parseFloat(String(priceMax));
    }

    // ---- Load seeds (for content-based scoring)
    let seeds = [];
    const seedArr = seedIds
      .split(',')
      .map((s) => s.trim())
      .filter((s) => mongoose.isValidObjectId(s));

    if (seedArr.length) {
      seeds = await BagCollection.find({ _id: { $in: seedArr } }).lean();
    }

    // ---- Load candidate pool
    let candidates = await BagCollection.find(filter).sort({ updatedAt: -1 }).lean();

    // ---- Score & sort (if seeds provided)
    if (seeds.length) {
      const seedBrands = new Set(
        seeds.map((s) => (s.brand || '').toLowerCase()).filter(Boolean)
      );
      const seedTypes = new Set(seeds.map((s) => s.type));
      const seedMaterials = new Set(
        seeds.map((s) => (s.material || '').toLowerCase()).filter(Boolean)
      );
      const seedColors = new Set(
        seeds.flatMap((s) => (s.colors || []).map((c) => c.toLowerCase()))
      );
      const seedFeatures = new Set(
        seeds.flatMap((s) => (s.features || []).map((f) => f.toLowerCase()))
      );
      const seedAvgPrice =
        seeds.reduce((acc, s) => acc + (s.price || 0), 0) / (seeds.length || 1);

      const score = (c) => {
        let s = 0;
        if (seedTypes.has(c.type)) s += 4;
        if (seedBrands.has((c.brand || '').toLowerCase())) s += 3;
        if (seedMaterials.has((c.material || '').toLowerCase())) s += 2;

        const cColors = new Set((c.colors || []).map((x) => x.toLowerCase()));
        const cFeatures = new Set((c.features || []).map((x) => x.toLowerCase()));

        let colorOverlap = 0;
        cColors.forEach((col) => {
          if (seedColors.has(col)) colorOverlap++;
        });

        let featureOverlap = 0;
        cFeatures.forEach((f) => {
          if (seedFeatures.has(f)) featureOverlap++;
        });

        s += Math.min(2, colorOverlap);
        s += Math.min(3, featureOverlap);

        // price proximity to seed average
        if (seedAvgPrice > 0 && c.price) {
          const diff = Math.abs(c.price - seedAvgPrice) / seedAvgPrice;
          if (diff <= 0.15) s += 2;
          else if (diff <= 0.3) s += 1;
        }

        // quality/reputation
        s += Math.min(2, Math.floor((c.rating || 0) / 2));
        if (c.isBestSeller) s += 1;

        return s;
      };

      candidates = candidates
        .map((c) => ({ c, score: score(c) }))
        .sort(
          (a, b) =>
            b.score - a.score ||
            (b.c.rating || 0) - (a.c.rating || 0) ||
            new Date(b.c.updatedAt) - new Date(a.c.updatedAt)
        )
        .slice(0, lim)
        .map((x) => x.c);
    } else {
      // ---- Fallback: best-sellers first, then rating, then recency
      candidates = candidates
        .sort((a, b) => {
          const bs = (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0);
          if (bs !== 0) return bs;
          const rr = (b.rating || 0) - (a.rating || 0);
          if (rr !== 0) return rr;
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        })
        .slice(0, lim);
    }

    const items = candidates.map(toDTO);
    res.json({ success: true, items });
  } catch (err) {
    console.error('Error in recommendations.browse:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server error getting recommendations.' });
  }
};
