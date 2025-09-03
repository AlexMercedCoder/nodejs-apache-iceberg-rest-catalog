const express = require('express');
const router = express.Router();
const { commitTransaction } = require('../controllers/transactionController');

router.post('/:prefix/transactions/commit', commitTransaction);

module.exports = router;