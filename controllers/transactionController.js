const commitTransaction = async (req, res) => {
  try {
    const { 'table-changes': tableChanges = [] } = req.body;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error in commitTransaction:', error);
    res.status(500).json({
      message: 'Internal server error',
      type: 'InternalServerException',
      code: 500
    });
  }
};

module.exports = {
  commitTransaction
};