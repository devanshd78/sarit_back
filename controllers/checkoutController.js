// controllers/checkoutController.js

const mongoose = require('mongoose');
const Order = require('../models/Order');
const ShippingMethod = require('../models/Shipping');
const BagCollection = require('../models/Bag');
const Coupon = require('../models/Coupon');
const State = require('../models/State');
const City = require('../models/City');
const Newsletter = require('../models/NewsLetter');

/** ---------------------------------------------------------------------------
 * Helper utilities
 * -------------------------------------------------------------------------*/
const normalizeCode = (code = '') => code.trim().toUpperCase();
/** Create an ID like “ordA7K9X2” or “ord9qBf12Z” (prefix + 6‑8 chars) */

async function generateOrderId() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = len =>
    Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');

  // try up to 5 times in the unlikely event of a collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = 'ORD' + rand(Math.floor(Math.random() * 3) + 6); // 6‑8 chars
    const exists = await Order.exists({ orderId: id });
    if (!exists) return id;
  }
  throw new Error('Unable to generate unique orderId'); // extremely unlikely
}

/**
 * Validate incoming payload – returns an array of error strings.
 */
function validateOrderPayload(body) {
  const errs = [];
  const { items, form, shippingId } = body;

  if (!Array.isArray(items) || items.length === 0) errs.push('Cart items are required.');

  // Contact & shipping address basics
  if (!form?.email) errs.push('Email is required.');
  if (!form?.lastName) errs.push('Last name is required.');
  if (!form?.address) errs.push('Shipping address is required.');
  if (!form?.pin) errs.push('Shipping PIN is required.');
  if (!form?.phone) errs.push('Shipping phone is required.');
  if (!form?.stateId) errs.push('stateId is required.');
  if (!form?.cityId) errs.push('cityId is required.');
  if (!form?.paymentMethod) errs.push('Payment method is required.');

  // Shipping
  if (!shippingId) errs.push('shippingId is required.');

  // Billing address when different
  if (!form?.billingSame) {
    const b = body.billingAddress || {};
    if (!b.address) errs.push('Billing address is required.');
    if (!b.pin) errs.push('Billing PIN is required.');
    if (!b.phone) errs.push('Billing phone is required.');
    if (!b.stateId) errs.push('Billing stateId is required.');
    if (!b.cityId) errs.push('Billing cityId is required.');
  }

  return errs;
}

/** ---------------------------------------------------------------------------
 * POST /checkout – Create Order
 * ---------------------------------------------------------------------------*/
exports.createOrder = async (req, res) => {
  try {
    const {
      items: rawItems,
      form,
      shippingId,
      coupon: couponClient,
      billingAddress: billingRaw,
    } = req.body;

    /* 1. Basic validation */
    const errors = validateOrderPayload(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });

    /* 2. Fetch & validate State / City */
    const [stateDoc, cityDoc] = await Promise.all([
      State.findById(form.stateId).lean(),
      City.findById(form.cityId).lean(),
    ]);
    if (!stateDoc) return res.status(400).json({ success: false, message: 'Invalid stateId.' });
    if (!cityDoc || !cityDoc.stateId.equals(stateDoc._id))
      return res.status(400).json({ success: false, message: 'Invalid cityId for given state.' });

    /* 3. Normalize cart items */
    let items;
    if (typeof rawItems[0] === 'string' || typeof rawItems[0] === 'number') {
      const products = await BagCollection.find({ _id: { $in: rawItems } });
      if (products.length !== rawItems.length)
        return res.status(400).json({ success: false, message: 'Some cart items were not found.' });
      items = products.map(p => ({ _id: p._id, bagName: p.bagName, price: p.price, quantity: 1 }));
    } else {
      items = rawItems.map(i => ({
        _id: i.id || i._id,
        bagName: i.bagName,
        price: i.price,
        quantity: i.qty || i.quantity || 1,
      }));
    }

    /* 4. Pricing */
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const taxes = +(subtotal * 0.09).toFixed(2); // Example GST 9%
    const shipCfg = await ShippingMethod.ensureSingleton();
    const method = shipCfg.methods.find(m => m.id === String(shippingId));
    if (!method) {
      return res.status(400).json({ success: false, message: 'Invalid shippingId. Use "standard" or "express".' });
    }
    const shippingCost = Number(method.cost);
    const grossTotal = subtotal + taxes + shippingCost;

    /* 5. Coupon */
    let coupon = null;
    let discount = 0;
    if (couponClient?.code) {
      const code = normalizeCode(couponClient.code);
      const doc = await Coupon.findOne({ code, active: true });
      if (!doc) return res.status(400).json({ success: false, message: 'Invalid or inactive coupon.' });
      if (doc.expiresAt && doc.expiresAt < Date.now())
        return res.status(400).json({ success: false, message: 'Coupon has expired.' });
      if (doc.usageLimit > 0 && doc.usedCount >= doc.usageLimit)
        return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });

      discount = doc.discountType === 'percentage'
        ? +(grossTotal * doc.discountValue / 100).toFixed(2)
        : +Math.min(grossTotal, doc.discountValue).toFixed(2);

      coupon = {
        code: doc.code,
        discountType: doc.discountType,
        discountValue: doc.discountValue,
        discountAmount: discount,
      };

      doc.usedCount += 1;
      await doc.save();
    }

    const total = +(grossTotal - discount).toFixed(2);

    /* 6. Build address objects */
    const buildAddress = (src, cityD, stateD) => ({
      firstName: src.firstName,
      lastName: src.lastName,
      address: src.address,
      apartment: src.apartment,
      city: { id: cityD._id, name: cityD.name },
      state: { id: stateD._id, name: stateD.name },
      pin: src.pin,
      phone: src.phone,
    });

    const shippingAddress = buildAddress(form, cityDoc, stateDoc);
    let billingAddress = undefined;
    if (!form.billingSame) {
      const [bState, bCity] = await Promise.all([
        State.findById(billingRaw.stateId).lean(),
        City.findById(billingRaw.cityId).lean(),
      ]);
      if (!bState || !bCity || !bCity.stateId.equals(bState._id))
        return res.status(400).json({ success: false, message: 'Invalid billing state/city.' });
      billingAddress = buildAddress(billingRaw, bCity, bState);
    }

    /* 7. Persist order */
    const order = new Order({
      orderId: await generateOrderId(),
      items,
      contact: { email: form.email, subscribe: Boolean(form.subscribe) },
      shippingAddress,
      billingAddress,
      paymentMethod: form.paymentMethod,
      shippingMethod: { id: method.id, label: method.label, cost: method.cost },
      coupon,
      subtotal,
      taxes,
      shippingCost,
      grossTotal,
      discount,
      total,
    });
    await order.save();

    if (form.subscribe) {
      const email = form.email.trim().toLowerCase();
      try {
        await Newsletter.findOneAndUpdate(
          { email },
          { email },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (nlErr) {
        console.error("Failed to subscribe to newsletter:", nlErr);
      }
    }

    /* 8. Respond */
    return res.status(201).json({
      success: true,
      orderId: order.orderId,
      mongoId: order._id,
      subtotal,
      taxes,
      shippingCost,
      grossTotal,
      discount,
      total,
      coupon: coupon?.code || null,
      message: 'Order created successfully.',
    });
  } catch (err) {
    console.error('checkoutController.createOrder error:', err);
    if (err.type === 'entity.too.large')
      return res.status(413).json({ success: false, message: 'Payload too large.' });
    return res.status(500).json({ success: false, message: 'Server error creating order.' });
  }
};

/** ---------------------------------------------------------------------------
 * POST /orders/getlist – Paginated order list
 * ---------------------------------------------------------------------------*/
exports.getOrderList = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status, dateFrom, dateTo, sortBy } = req.body || {};

    const p = Math.max(1, parseInt(page, 10));
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const filter = {};
    if (search) {
      if (mongoose.Types.ObjectId.isValid(search)) filter._id = search;
      else filter['contact.email'] = { $regex: search, $options: 'i' };
    }
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (p - 1) * lim;
    const [rowsRaw, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      Order.countDocuments(filter),
    ]);

    let rows = rowsRaw;
    if (sortBy === 'shippingPriority') {
      rows = [...rowsRaw].sort((a, b) => {
        const ax = a?.shippingMethod?.id === 'express' ? 1 : 0;
        const bx = b?.shippingMethod?.id === 'express' ? 1 : 0;
        return bx - ax || +new Date(b.createdAt) - +new Date(a.createdAt);
      });
    }

    return res.json({
      success: true,
      data: rows,
      pagination: { total, page: p, pages: Math.ceil(total / lim), limit: lim },
    });
  } catch (err) {
    console.error('getOrderList error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving orders.' });
  }
};


exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required.' });
    }

    const filter = { orderId };

    const allowed = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowed.join(', ')}`,
      });
    }

    const order = await Order.findOneAndUpdate(
      filter,
      { status },
      { new: true, runValidators: true }
    ).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({
      success: true,
      message: `Order status set to "${status}".`,
      data: order,
    });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating order.' });
  }
};

/** ---------------------------------------------------------------------------
 * POST /checkout/get – Fetch a single order (used by admin modal)
 * Body: { orderId: "ORDxxxxx" }
 * ---------------------------------------------------------------------------*/
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required.' });
    }

    const filter = { orderId };
    const order = await Order.findOne(filter).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('getOrderById error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving order.' });
  }
};
