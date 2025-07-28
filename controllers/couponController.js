const Coupon = require('../models/Coupon');  // adjust filename as needed

/** 
 * Validate core coupon fields
 */
function validateCouponInput(fields, res) {
  const errors = [];

  if (!fields.code || fields.code.trim().length < 3) {
    errors.push({ field: 'code', msg: 'Code is required (min 3 chars).' });
  }
  if (!['percentage', 'fixed'].includes(fields.discountType)) {
    errors.push({
      field: 'discountType',
      msg: 'discountType must be "percentage" or "fixed".'
    });
  }
  if (fields.discountValue == null || fields.discountValue < 0) {
    errors.push({
      field: 'discountValue',
      msg: 'discountValue must be a non-negative number.'
    });
  }
  if (fields.usageLimit != null && fields.usageLimit < 0) {
    errors.push({
      field: 'usageLimit',
      msg: 'usageLimit must be zero or positive.'
    });
  }
  if (errors.length) {
    res.status(400).json({ errors });
    return false;
  }
  return true;
}

/**
 * POST /coupons/create
 */
exports.createCoupon = async (req, res) => {
  const { code, discountType, discountValue, expiresAt, usageLimit, active } = req.body;
  if (!validateCouponInput({ code, discountType, discountValue, usageLimit }, res)) return;

  try {
    const normalized = code.toUpperCase().trim();
    if (await Coupon.findOne({ code: normalized })) {
      return res.status(400).json({
        errors: [{ field: 'code', msg: 'Coupon code already exists.' }]
      });
    }

    const coupon = await Coupon.create({
      code: normalized,
      discountType,
      discountValue,
      expiresAt,
      usageLimit,
      active: active != null ? active : true,
    });
    res.status(201).json({ message: 'Coupon created.', data: coupon });
  } catch (err) {
    console.error('createCoupon error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * POST /coupons/getlist
 */
exports.getCouponList = async (req, res) => {
  try {
    const page   = parseInt(req.body.page)  || 1;
    const limit  = parseInt(req.body.limit) || 20;
    const search = req.body.search || '';

    const filter = search
      ? { code: { $regex: search, $options: 'i' } }
      : {};

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Coupon.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Coupon.countDocuments(filter),
    ]);

    res.json({
      data,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (err) {
    console.error('getCouponList error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * POST /coupons/:code/get
 */
exports.getCoupon = async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const coupon = await Coupon.findOne({ code });
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found.' });
    }
    res.json({ data: coupon });
  } catch (err) {
    console.error('getCoupon error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * POST /coupons/:code/update
 */
exports.updateCoupon = async (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const updates = req.body;
  if (!validateCouponInput({ code, ...updates }, res)) return;

  try {
    const coupon = await Coupon.findOneAndUpdate({ code }, updates, { new: true });
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found.' });
    }
    res.json({ message: 'Coupon updated.', data: coupon });
  } catch (err) {
    console.error('updateCoupon error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * POST /coupons/:code/delete
 */
exports.deleteCoupon = async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const result = await Coupon.deleteOne({ code });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Coupon not found.' });
    }
    res.json({ message: 'Coupon deleted.' });
  } catch (err) {
    console.error('deleteCoupon error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

/**
 * POST /coupons/apply
 */
exports.applyCoupon = async (req, res) => {
  const { code, orderTotal } = req.body;
  if (!code || orderTotal == null) {
    return res.status(400).json({
      errors: [
        { field: 'code',      msg: 'Code is required.' },
        { field: 'orderTotal',msg: 'orderTotal is required.' },
      ]
    });
  }

  try {
    const normalized = code.toUpperCase().trim();
    const coupon = await Coupon.findOne({ code: normalized, active: true });
    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or inactive coupon.' });
    }
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Coupon has expired.' });
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached.' });
    }

    const discount = coupon.discountType === 'percentage'
      ? (orderTotal * coupon.discountValue) / 100
      : coupon.discountValue;
    const newTotal = Math.max(0, orderTotal - discount);

    coupon.usedCount++;
    await coupon.save();

    res.json({ data: { code: coupon.code, discount, newTotal } });
  } catch (err) {
    console.error('applyCoupon error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};
