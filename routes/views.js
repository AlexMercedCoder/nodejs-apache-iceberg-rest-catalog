const express = require('express');
const router = express.Router();
const {
  listViews,
  createView,
  getView,
  updateView,
  deleteView,
  renameView
} = require('../controllers/viewController');

router.get('/:prefix/namespaces/:namespace/views', listViews);
router.post('/:prefix/namespaces/:namespace/views', createView);
router.get('/:prefix/namespaces/:namespace/views/:view', getView);
router.post('/:prefix/namespaces/:namespace/views/:view', updateView);
router.delete('/:prefix/namespaces/:namespace/views/:view', deleteView);
router.post('/:prefix/views/rename', renameView);

module.exports = router;