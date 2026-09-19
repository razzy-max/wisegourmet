const express = require('express');
const {
  listBranches,
  listBranchesAdmin,
  getBranchingSettings,
  updateBranchingSettings,
  createBranch,
  updateBranch,
  deleteBranch,
  reorderBranches,
} = require('../controllers/branchController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', listBranches);
router.get('/admin', protect, authorize('admin'), listBranchesAdmin);
router.get('/settings', protect, authorize('admin'), getBranchingSettings);
router.patch('/settings', protect, authorize('admin'), updateBranchingSettings);
router.post('/', protect, authorize('admin'), createBranch);
router.patch('/reorder', protect, authorize('admin'), reorderBranches);
router.put('/:id', protect, authorize('admin'), updateBranch);
router.delete('/:id', protect, authorize('admin'), deleteBranch);

module.exports = router;
