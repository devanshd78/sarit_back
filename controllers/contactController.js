const Contact = require('../models/Contact');

/**
 * Helper: Validate input fields for contact form
 */
function validateContactInput(fields, res) {
    const errors = [];

    if (!fields.name || fields.name.trim().length < 2) {
        errors.push({ field: 'name', msg: 'Name must be at least 2 characters.' });
    }
    if (!fields.email || !/^\S+@\S+\.\S+$/.test(fields.email)) {
        errors.push({ field: 'email', msg: 'Valid email is required.' });
    }
    if (fields.phone && !/^\+?\d{7,15}$/.test(fields.phone)) {
        errors.push({ field: 'phone', msg: 'Enter a valid phone number.' });
    }
    if (!fields.comment || fields.comment.trim().length < 5) {
        errors.push({ field: 'comment', msg: 'Comment must be at least 5 characters.' });
    }

    if (errors.length > 0) {
        res.status(400).json({ errors });
        return false;
    }
    return true;
}

/**
 * POST /contact – Create a new contact
 */
exports.submitContact = async (req, res) => {
    const { name, email, phone, comment } = req.body;

    if (!validateContactInput({ name, email, phone, comment }, res)) return;

    try {
        const contact = await Contact.create({ name, email, phone, comment });
        return res.status(201).json({
            message: 'Contact message submitted successfully.',
            data: contact,
        });
    } catch (err) {
        console.error('Error saving contact:', err.message);
        return res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

/**
 * POST /contact/list – Get paginated & searchable contacts
 * Request body: { page, limit, search }
 */
exports.getContactList = async (req, res) => {
    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;
        const search = req.body.search || '';

        const query = search
            ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { comment: { $regex: search, $options: 'i' } },
                ],
            }
            : {};

        const skip = (page - 1) * limit;

        const [contacts, total] = await Promise.all([
            Contact.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
            Contact.countDocuments(query),
        ]);

        return res.json({
            data: contacts,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        });
    } catch (err) {
        console.error('Error fetching contact list:', err.message);
        return res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};
