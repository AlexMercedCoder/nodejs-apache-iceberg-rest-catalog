const express = require('express');
const router = express.Router();
const {
  listTables,
  createTable,
  getTable,
  updateTable,
  deleteTable,
  renameTable,
  reportTableMetrics
} = require('../controllers/tableController');

router.get('/:prefix/namespaces/:namespace/tables', listTables);
router.post('/:prefix/namespaces/:namespace/tables', createTable);
router.get('/:prefix/namespaces/:namespace/tables/:table', getTable);
router.post('/:prefix/namespaces/:namespace/tables/:table', updateTable);
router.delete('/:prefix/namespaces/:namespace/tables/:table', deleteTable);
router.post('/:prefix/tables/rename', renameTable);
router.post('/:prefix/namespaces/:namespace/tables/:table/metrics', reportTableMetrics);

module.exports = router;