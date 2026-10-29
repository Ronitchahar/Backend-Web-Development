
'use strict';
// routes/payments.js

const router = require('express').Router();
const { charges, idempotency, nextChargeId } = require('../store');

router.post('/', (req, res) => {
  // Rule 1: Require an Idempotency-Key
  const key = req.headers['idempotency-key'];

  if (!key || !key.trim()) {
    return res.status(400).json({
      error: {
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required'
      }
    });
  }

  // Rule 2: Return the previously stored response for retries
  if (idempotency.has(key)) {
    const storedResponse = idempotency.get(key);

    return res.status(storedResponse.status).json(storedResponse.body);
  }

  // Rule 3: Process a new key exactly once
  const amount = req.body && req.body.amount;

  const charge = {
    id: nextChargeId(),
    amount,
    status: 'charged'
  };

  // Record the real charge
  charges.push(charge);

  // Store the response for future retries
  const response = {
    id: charge.id,
    amount: charge.amount,
    status: charge.status
  };

  const storedResponse = {
    status: 201,
    body: response
  };

  idempotency.set(key, storedResponse);

  return res.status(201).json(response);
});

module.exports = router;
