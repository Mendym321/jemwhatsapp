const express = require('express');
const router = express.Router();
const db = require('../db');

const VALID_STATUSES = ['pending', 'approved', 'scheduled', 'completed', 'cancelled'];
const VALID_DEDICATION_TYPES = ['In Honor Of', 'In Memory Of'];

// GET /api/entries - list all entries (supports ?status= filter)
router.get('/', (req, res) => {
  const { status } = req.query;

  let query = 'SELECT * FROM entries';
  const params = [];

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const entries = db.prepare(query).all(...params);
  res.json({ entries });
});

// GET /api/entries/:id - get a single entry
router.get('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);

  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  res.json({ entry });
});

// POST /api/entries - create a new entry
router.post('/', (req, res) => {
  const {
    sponsor_name,
    email,
    phone,
    dedication_type,
    dedication_name,
    occasion,
    message,
    preferred_date,
    amount
  } = req.body;

  // Validate required fields
  if (!sponsor_name || typeof sponsor_name !== 'string' || !sponsor_name.trim()) {
    return res.status(400).json({ error: 'sponsor_name is required' });
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'email is required' });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!dedication_name || typeof dedication_name !== 'string' || !dedication_name.trim()) {
    return res.status(400).json({ error: 'dedication_name is required' });
  }

  if (dedication_type && !VALID_DEDICATION_TYPES.includes(dedication_type)) {
    return res.status(400).json({ error: `Invalid dedication_type. Must be one of: ${VALID_DEDICATION_TYPES.join(', ')}` });
  }

  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const amountInt = parseInt(amount, 10);
  if (isNaN(amountInt) || amountInt < 1800) {
    return res.status(400).json({ error: 'amount must be a number >= 1800 (in cents, minimum $18)' });
  }

  const result = db.prepare(`
    INSERT INTO entries
      (sponsor_name, email, phone, dedication_type, dedication_name, occasion, message, preferred_date, amount)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sponsor_name.trim(),
    email.trim().toLowerCase(),
    phone ? phone.trim() : null,
    dedication_type || 'In Honor Of',
    dedication_name.trim(),
    occasion ? occasion.trim() : null,
    message ? message.trim() : null,
    preferred_date || null,
    amountInt
  );

  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ entry });
});

// PATCH /api/entries/:id - update status or assigned_date
router.patch('/:id', (req, res) => {
  const { status, assigned_date } = req.body;

  const existing = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const updates = [];
  const params = [];

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }

  if (assigned_date !== undefined) {
    updates.push('assigned_date = ?');
    params.push(assigned_date);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update. Allowed: status, assigned_date' });
  }

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE entries SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
  res.json({ entry });
});

// DELETE /api/entries/:id - delete an entry
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id);
  res.json({ message: 'Entry deleted successfully' });
});

module.exports = router;
