// controllers/checkoutController.js
/* eslint-disable no-console */
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const Order = require('../models/Order');
const ShippingMethod = require('../models/Shipping');
const BagCollection = require('../models/Bag');
const Coupon = require('../models/Coupon');
const State = require('../models/State');
const City = require('../models/City');
const Newsletter = require('../models/NewsLetter');
const User = require('../models/User');

/* -----------------------------------------------------------------------------
 * Email (Nodemailer)
 * -------------------------------------------------------------------------- */
const EMAIL_ENABLED = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const transporter = EMAIL_ENABLED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const BRAND = process.env.BRAND_NAME || 'Zexa';
const LOGO_PATH = path.join(__dirname, '..', 'Logo.jpeg');
const HAS_LOGO = fs.existsSync(LOGO_PATH);

const STATUS_COPY = {
  pending: 'We’ve received your order and it’s pending. We’ll update you once payment is verified.',
  paid: 'Payment received—thank you! We’re preparing your order.',
  processing: 'Your order is being packed and prepared for shipment.',
  shipped: 'Good news—your order is on the way!',
  delivered: 'Delivered! We hope you love your purchase.',
  cancelled: 'Your order was cancelled. If this seems like a mistake, reply to this email.',
};

/* -----------------------------------------------------------------------------
 * Utilities
 * -------------------------------------------------------------------------- */
const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n) || 0
  );

const normalizeCode = (code = '') => code.trim().toUpperCase();

const humanizeStatus = (s = '') => (s ? s[0].toUpperCase() + s.slice(1) : '');

async function generateOrderId() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (len) => Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = 'ORD' + rand(Math.floor(Math.random() * 3) + 6); // 6–8
    const exists = await Order.exists({ orderId: id });
    if (!exists) return id;
  }
  throw new Error('Unable to generate unique orderId');
}

function validateOrderPayload(body) {
  const errs = [];
  const { items, form, shippingId } = body || {};

  if (!Array.isArray(items) || items.length === 0) errs.push('Cart items are required.');
  if (!form?.email) errs.push('Email is required.');
  if (!form?.lastName) errs.push('Last name is required.');
  if (!form?.address) errs.push('Shipping address is required.');
  if (!form?.pin) errs.push('Shipping PIN is required.');
  if (!form?.phone) errs.push('Shipping phone is required.');
  if (!form?.stateId) errs.push('stateId is required.');
  if (!form?.cityId) errs.push('cityId is required.');
  if (!form?.paymentMethod) errs.push('Payment method is required.');
  if (!shippingId) errs.push('shippingId is required.');

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

function renderAddress(a) {
  if (!a) return '';
  return `
    <div style="line-height:1.5;color:#374151;">
      <div>${[a.firstName, a.lastName].filter(Boolean).join(' ')}</div>
      <div>${a.address}${a.apartment ? ', ' + a.apartment : ''}</div>
      <div>${a.city?.name || ''}, ${a.state?.name || ''} ${a.pin || ''}</div>
      <div>Phone: ${a.phone || '-'}</div>
    </div>
  `;
}

function renderItemsTable(items = []) {
  const rows = items
    .map((it) => {
      const lineTotal = Number(it.price) * Number(it.quantity);
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${it.bagName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${inr(it.price)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${inr(lineTotal)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Item</th>
          <th style="text-align:center;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Qty</th>
          <th style="text-align:right;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Price</th>
          <th style="text-align:right;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/* -----------------------------------------------------------------------------
 * Email templates
 * -------------------------------------------------------------------------- */
function buildOrderHTML(order) {
  const {
    orderId,
    items,
    shippingAddress,
    billingAddress,
    shippingMethod,
    subtotal,
    taxes,
    shippingCost,
    grossTotal,
    discount,
    total,
    coupon,
  } = order;

  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; padding:24px; color:#111827;">
      ${HAS_LOGO ? `<div style="margin-bottom:16px;"><img src="cid:brand-logo" alt="${BRAND} Logo" style="height:48px;width:auto;display:block;" /></div>` : ''}

      <h2 style="margin:0 0 4px 0;">Thanks for your order!</h2>
      <p style="margin:0 0 16px 0; color:#374151;">Your order has been received and is now being processed.</p>

      <div style="margin:16px 0; padding:12px 16px; border:1px solid #e5e7eb; border-radius:12px;">
        <div style="font-weight:600; margin-bottom:4px;">Order ID:</div>
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco; font-size:14px;">${orderId}</div>
      </div>

      <h3 style="margin:24px 0 8px 0;">Order Summary</h3>
      ${renderItemsTable(items)}

      <div style="margin-top:16px; text-align:right;">
        <div style="margin:4px 0;">Subtotal: <strong>${inr(subtotal)}</strong></div>
        <div style="margin:4px 0;">Taxes (GST): <strong>${inr(taxes)}</strong></div>
        <div style="margin:4px 0;">Shipping (${shippingMethod?.label || '-' }): <strong>${inr(shippingCost)}</strong></div>
        ${discount ? `<div style="margin:4px 0;">Discount${coupon?.code ? ` (${coupon.code})` : ''}: <strong>- ${inr(discount)}</strong></div>` : ''}
        <div style="margin:8px 0; font-size:18px;">Total: <strong>${inr(total)}</strong></div>
      </div>

      <div style="display:flex; gap:20px; margin-top:24px; flex-wrap:wrap;">
        <div style="flex:1; min-width:260px;">
          <h4 style="margin:0 0 8px 0;">Shipping Address</h4>
          ${renderAddress(shippingAddress)}
        </div>
        ${billingAddress ? `<div style="flex:1; min-width:260px;"><h4 style="margin:0 0 8px 0;">Billing Address</h4>${renderAddress(billingAddress)}</div>` : ''}
      </div>

      <p style="color:#6b7280; margin-top:24px;">We’ll email you again when your order ships. If you have any questions, just reply to this email.</p>
      <p style="color:#6b7280;">— The ${BRAND} Team</p>
    </div>
  `;
}

function buildOrderText(order) {
  const lines = [];
  lines.push(`Thanks for your order at ${BRAND}!`);
  lines.push(`Order ID: ${order.orderId}`);
  lines.push('');
  lines.push('Items:');
  (order.items || []).forEach((it) => lines.push(`- ${it.bagName} x${it.quantity}: ${inr(it.price)} each`));
  lines.push('');
  lines.push(`Subtotal: ${inr(order.subtotal)}`);
  lines.push(`Taxes (GST): ${inr(order.taxes)}`);
  lines.push(`Shipping (${order?.shippingMethod?.label || '-' }): ${inr(order.shippingCost)}`);
  if (order.discount) lines.push(`Discount${order?.coupon?.code ? ` (${order.coupon.code})` : ''}: -${inr(order.discount)}`);
  lines.push(`Total: ${inr(order.total)}`);
  lines.push('');
  lines.push('Shipping Address:');
  const sa = order.shippingAddress || {};
  lines.push(`${[sa.firstName, sa.lastName].filter(Boolean).join(' ')}`);
  lines.push(`${sa.address}${sa.apartment ? ', ' + sa.apartment : ''}`);
  lines.push(`${sa.city?.name || ''}, ${sa.state?.name || ''} ${sa.pin || ''}`);
  lines.push(`Phone: ${sa.phone || '-'}`);
  if (order.billingAddress) {
    const ba = order.billingAddress;
    lines.push('');
    lines.push('Billing Address:');
    lines.push(`${[ba.firstName, ba.lastName].filter(Boolean).join(' ')}`);
    lines.push(`${ba.address}${ba.apartment ? ', ' + ba.apartment : ''}`);
    lines.push(`${ba.city?.name || ''}, ${ba.state?.name || ''} ${ba.pin || ''}`);
    lines.push(`Phone: ${ba.phone || '-'}`);
  }
  lines.push('');
  lines.push('We’ll email you when your order ships.');
  lines.push(`— The ${BRAND} Team`);
  return lines.join('\n');
}

function buildStatusHTML(order, newStatus) {
  const { orderId, items = [], shippingAddress, shippingMethod, subtotal, taxes, shippingCost, discount, total, coupon } =
    order;
  const trackingNumber = order?.trackingNumber;
  const trackingUrl = order?.trackingUrl;

  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; padding:24px; color:#111827;">
      ${HAS_LOGO ? `<div style="margin-bottom:16px;"><img src="cid:brand-logo" alt="${BRAND} Logo" style="height:48px;width:auto;display:block;" /></div>` : ''}

      <h2 style="margin:0 0 4px 0;">Order update: <span style="color:#111827;">${humanizeStatus(newStatus)}</span></h2>
      <p style="margin:0 0 16px 0; color:#374151;">${STATUS_COPY[newStatus] || 'Your order status has been updated.'}</p>

      <div style="margin:16px 0; padding:12px 16px; border:1px solid #e5e7eb; border-radius:12px;">
        <div style="font-weight:600; margin-bottom:4px;">Order ID</div>
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco; font-size:14px;">${orderId}</div>
        <div style="margin-top:8px;">
          <span style="display:inline-block;padding:4px 10px;border-radius:9999px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:600;">
            ${humanizeStatus(newStatus)}
          </span>
        </div>
      </div>

      ${newStatus === 'shipped' && (trackingNumber || trackingUrl) ? `
      <div style="margin:16px 0; padding:12px 16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px;">
        <div style="font-weight:600; margin-bottom:4px;">Tracking</div>
        ${trackingNumber ? `<div>Number: <strong>${trackingNumber}</strong></div>` : ''}
        ${trackingUrl ? `<div>Link: <a href="${trackingUrl}" target="_blank" style="color:#2563eb;">Track your shipment</a></div>` : ''}
      </div>` : ''}

      <h3 style="margin:24px 0 8px 0;">Items</h3>
      ${renderItemsTable(items)}

      <div style="margin-top:16px; text-align:right;">
        <div style="margin:4px 0;">Subtotal: <strong>${inr(subtotal)}</strong></div>
        <div style="margin:4px 0;">Taxes (GST): <strong>${inr(taxes)}</strong></div>
        <div style="margin:4px 0;">Shipping ${shippingMethod?.label ? `(${shippingMethod.label})` : ''}: <strong>${inr(
    shippingCost
  )}</strong></div>
        ${discount ? `<div style="margin:4px 0;">Discount${coupon?.code ? ` (${coupon.code})` : ''}: <strong>- ${inr(discount)}</strong></div>` : ''}
        <div style="margin:8px 0; font-size:18px;">Total: <strong>${inr(total)}</strong></div>
      </div>

      <div style="margin-top:24px;">
        <h4 style="margin:0 0 8px 0;">Ship to</h4>
        ${renderAddress(shippingAddress)}
      </div>

      <p style="color:#6b7280; margin-top:24px;">Need help? Just reply to this email.</p>
      <p style="color:#6b7280;">— The ${BRAND} Team</p>
    </div>
  `;
}

function buildStatusText(order, newStatus) {
  const lines = [];
  lines.push(`Order update for ${BRAND}: ${humanizeStatus(newStatus)}`);
  if (STATUS_COPY[newStatus]) lines.push(STATUS_COPY[newStatus]);
  lines.push(`Order ID: ${order.orderId}`);
  lines.push('');
  lines.push('Items:');
  (order.items || []).forEach((it) => lines.push(`- ${it.bagName} x${it.quantity}: ${inr(it.price)} each`));
  lines.push('');
  lines.push(`Subtotal: ${inr(order.subtotal)}`);
  lines.push(`Taxes (GST): ${inr(order.taxes)}`);
  lines.push(`Shipping${order?.shippingMethod?.label ? ` (${order.shippingMethod.label})` : ''}: ${inr(order.shippingCost)}`);
  if (order.discount) lines.push(`Discount${order?.coupon?.code ? ` (${order.coupon.code})` : ''}: -${inr(order.discount)}`);
  lines.push(`Total: ${inr(order.total)}`);
  if (order.trackingNumber || order.trackingUrl) {
    lines.push('');
    lines.push('Tracking:');
    if (order.trackingNumber) lines.push(`Number: ${order.trackingNumber}`);
    if (order.trackingUrl) lines.push(`Link: ${order.trackingUrl}`);
  }
  lines.push('');
  lines.push('Ship to:');
  const sa = order.shippingAddress || {};
  lines.push(`${[sa.firstName, sa.lastName].filter(Boolean).join(' ')}`);
  lines.push(`${sa.address}${sa.apartment ? ', ' + sa.apartment : ''}`);
  lines.push(`${sa.city?.name || ''}, ${sa.state?.name || ''} ${sa.pin || ''}`);
  lines.push(`Phone: ${sa.phone || '-'}`);
  lines.push('');
  lines.push('Need help? Reply to this email.');
  lines.push(`— The ${BRAND} Team`);
  return lines.join('\n');
}

async function sendMailSafe(payload) {
  if (!EMAIL_ENABLED || !transporter) return;
  try {
    await transporter.sendMail(payload);
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

async function sendOrderEmail(to, order) {
  if (!to) return;
  const html = buildOrderHTML(order);
  const text = buildOrderText(order);
  const mail = {
    from: `"${BRAND} Orders" <${process.env.SMTP_USER}>`,
    to,
    subject: `${BRAND} Order Confirmation — ${order.orderId}`,
    html,
    text,
    ...(HAS_LOGO && { attachments: [{ filename: 'Logo.jpeg', path: LOGO_PATH, cid: 'brand-logo' }] }),
  };
  await sendMailSafe(mail);
}

async function sendStatusEmail(to, order, newStatus) {
  if (!to) return;
  const html = buildStatusHTML(order, newStatus);
  const text = buildStatusText(order, newStatus);
  const mail = {
    from: `"${BRAND} Orders" <${process.env.SMTP_USER}>`,
    to,
    subject: `${BRAND} Order Update — ${order.orderId} is now ${humanizeStatus(newStatus)}`,
    html,
    text,
    ...(HAS_LOGO && { attachments: [{ filename: 'Logo.jpeg', path: LOGO_PATH, cid: 'brand-logo' }] }),
  };
  await sendMailSafe(mail);
}

/* -----------------------------------------------------------------------------
 * Controller: Create Order
 * -------------------------------------------------------------------------- */
exports.createOrder = async (req, res) => {
  try {
    const { items: rawItems, form, shippingId, coupon: couponClient, billingAddress: billingRaw } = req.body || {};

    // 1) Validate payload
    const errors = validateOrderPayload(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });

    // 2) State/City validation
    const [stateDoc, cityDoc] = await Promise.all([
      State.findById(form.stateId).lean(),
      City.findById(form.cityId).lean(),
    ]);
    if (!stateDoc) return res.status(400).json({ success: false, message: 'Invalid stateId.' });
    if (!cityDoc || !cityDoc.stateId.equals(stateDoc._id))
      return res.status(400).json({ success: false, message: 'Invalid cityId for given state.' });

    // 3) Normalize items
    let items;
    if (typeof rawItems?.[0] === 'string' || typeof rawItems?.[0] === 'number') {
      const products = await BagCollection.find({ _id: { $in: rawItems } }).lean();
      if (products.length !== rawItems.length)
        return res.status(400).json({ success: false, message: 'Some cart items were not found.' });
      items = products.map((p) => ({ _id: p._id, bagName: p.bagName, price: p.price, quantity: 1 }));
    } else {
      items = (rawItems || []).map((i) => ({
        _id: i.id || i._id,
        bagName: i.bagName,
        price: i.price,
        quantity: i.qty || i.quantity || 1,
      }));
    }

    // 4) Pricing & shipping
    const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);
    const taxes = +(subtotal * 0.09).toFixed(2); // example GST 9%
    const shipCfg = await ShippingMethod.ensureSingleton();
    const method = shipCfg.methods.find((m) => m.id === String(shippingId));
    if (!method) return res.status(400).json({ success: false, message: 'Invalid shippingId. Use "standard" or "express".' });
    const shippingCost = Number(method.cost);
    const grossTotal = subtotal + taxes + shippingCost;

    // 5) Coupon
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

      discount =
        doc.discountType === 'percentage'
          ? +(grossTotal * (doc.discountValue / 100)).toFixed(2)
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

    // 6) Addresses
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

    let billingAddress;
    if (!form.billingSame) {
      const [bState, bCity] = await Promise.all([
        State.findById(billingRaw.stateId).lean(),
        City.findById(billingRaw.cityId).lean(),
      ]);
      if (!bState || !bCity || !bCity.stateId.equals(bState._id))
        return res.status(400).json({ success: false, message: 'Invalid billing state/city.' });
      billingAddress = buildAddress(billingRaw, bCity, bState);
    }

    // 7) Persist order
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

    // 8) Newsletter opt-in (guest only or either way—best effort)
    if (form.subscribe && form.email) {
      const email = String(form.email).trim().toLowerCase();
      try {
        await Newsletter.findOneAndUpdate({ email }, { email }, { upsert: true, new: true, setDefaultsOnInsert: true });
      } catch (nlErr) {
        console.error('Failed to subscribe to newsletter:', nlErr);
      }
    }

    // 9) Recipient: prefer logged-in user email if available
    let recipient = (form.email || '').trim().toLowerCase();
    if (req.userId) {
      try {
        const u = await User.findById(req.userId).select('email').lean();
        if (u?.email) recipient = String(u.email).trim().toLowerCase();
      } catch (_) {
        /* fallback to form email */
      }
    }

    // 10) Send order confirmation (non-blocking)
    sendOrderEmail(recipient, {
      orderId: order.orderId,
      items,
      shippingAddress,
      billingAddress,
      shippingMethod: order.shippingMethod,
      subtotal,
      taxes,
      shippingCost,
      grossTotal,
      discount,
      total,
      coupon,
    }).catch(() => {});

    // 11) Respond
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
    if (err?.type === 'entity.too.large')
      return res.status(413).json({ success: false, message: 'Payload too large.' });
    return res.status(500).json({ success: false, message: 'Server error creating order.' });
  }
};

/* -----------------------------------------------------------------------------
 * Controller: Get Order List (paginated)
 * -------------------------------------------------------------------------- */
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

/* -----------------------------------------------------------------------------
 * Controller: Update Order Status (sends email)
 * -------------------------------------------------------------------------- */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body || {};
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required.' });

    const allowed = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowed.join(', ')}`,
      });
    }

    const order = await Order.findOneAndUpdate({ orderId }, { status }, { new: true, runValidators: true }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const recipient = String(order?.contact?.email || '').trim().toLowerCase();
    sendStatusEmail(recipient, order, status).catch(() => {});

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

/* -----------------------------------------------------------------------------
 * Controller: Get Order By ID (by orderId code)
 * -------------------------------------------------------------------------- */
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required.' });

    const order = await Order.findOne({ orderId }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('getOrderById error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving order.' });
  }
};
