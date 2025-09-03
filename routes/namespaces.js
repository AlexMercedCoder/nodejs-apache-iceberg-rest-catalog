const express = require('express');
const router = express.Router();
const {
  listNamespaces,
  createNamespace,
  getNamespace,
  deleteNamespace,
  updateNamespaceProperties
} = require('../controllers/namespaceController');

router.get('/:prefix/namespaces', listNamespaces);
router.post('/:prefix/namespaces', createNamespace);
router.get('/:prefix/namespaces/:namespace', getNamespace);
router.delete('/:prefix/namespaces/:namespace', deleteNamespace);
router.post('/:prefix/namespaces/:namespace/properties', updateNamespaceProperties);

module.exports = router;