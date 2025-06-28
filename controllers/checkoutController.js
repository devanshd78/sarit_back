// controllers/checkoutController.js

const Order            = require('../models/Order');
const ShippingMethod   = require('../models/Shipping');
const BagCollection    = require('../models/Bag');

exports.createOrder = async (req, res) => {
  try {
    let { items: rawItems, form, shippingId, shippingCost, billingAddress } = req.body;

    // Basic validation of required form fields
    if (
      !Array.isArray(rawItems) || rawItems.length === 0 ||
      !form?.email || !form?.lastName || !form?.address ||
      !form?.city  || !form?.state    || !form?.pin     ||
      !form?.paymentMethod ||
      !shippingId || shippingCost == null
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid required fields.'
      });
    }

    // Normalize items: either array of IDs or full objects
    let items;
    if (typeof rawItems[0] === 'string') {
      // fetch product details
      const products = await BagCollection.find({ _id: { $in: rawItems } });
      items = products.map(p => ({
        _id:      p._id,
        bagName:  p.bagName,
        price:    p.price,
        quantity: 1,
      }));
    } else {
      // assume full item objects
      items = rawItems.map(i => ({
        _id:      i._id,
        bagName:  i.bagName,
        price:    i.price,
        quantity: i.quantity,
      }));
    }

    // Compute subtotals & totals
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const taxes   = +((subtotal * 0.09).toFixed(2));
    const total   = +(subtotal + taxes + shippingCost).toFixed(2);

    // LOOK UP the shipping-method label using the country from the form
    const shipDoc = await ShippingMethod.findOne({ country: form.country });
    const method  = shipDoc?.methods.find(m => m.id === shippingId);
    const shippingLabel = method?.label || 'Standard';

    // Build and save the Order
    const order = new Order({
      items,
      contact: {
        email:     form.email,
        subscribe: Boolean(form.subscribe),
      },
      shippingAddress: {
        firstName: form.firstName,
        lastName:  form.lastName,
        address:   form.address,
        apartment: form.apartment,
        city:      form.city,
        state:     form.state,
        pin:       form.pin,
        phone:     form.phone,
      },
      billingAddress: form.billingSame ? undefined : billingAddress,
      paymentMethod:  form.paymentMethod,
      shippingMethod: {
        id:    shippingId,
        label: shippingLabel,
        cost:  shippingCost,
      },
      subtotal,
      taxes,
      shippingCost,
      total,
    });

    await order.save();

    return res.status(201).json({
      success: true,
      orderId: order._id,
      message: 'Order created successfully.'
    });

  } catch (err) {
    console.error('checkoutController.createOrder error:', err);

    // If payload too big (unlikely here but just in case)
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ success: false, message: 'Payload too large.' });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error creating order.'
    });
  }
};
