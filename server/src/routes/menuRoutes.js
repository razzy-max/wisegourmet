const express = require('express');
const {
  listMenu,
  listCategories,
  listCategoriesAdmin,
  createCategory,
  reorderCategories,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  updateBranchMenuItemStatus,
  deleteMenuItem,
  getMenuItemImage,
} = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', listMenu);
router.get('/categories', listCategories);
// Read-only, includes inactive categories — staff/branch_admin need this
// too so the item filter chips on this page don't disappear for items
// whose category was later deactivated. Category create/update/delete/
// reorder below stay owner-only — those actually change the shared catalog.
router.get('/categories/admin', protect, authorize('admin', 'branch_admin', 'staff'), listCategoriesAdmin);
router.get('/:id/image', getMenuItemImage);

router.post('/categories', protect, authorize('admin'), createCategory);
router.patch('/categories/reorder', protect, authorize('admin'), reorderCategories);
router.put('/categories/:id', protect, authorize('admin'), updateCategory);
router.delete('/categories/:id', protect, authorize('admin'), deleteCategory);

// Creating/deleting items, and editing item details (name/price/description/
// category/image), stay owner-only — the shared catalog affects every branch
// at once. Only toggling a branch's own stock status is open to staff/branch_admin.
router.post('/', protect, authorize('admin'), createMenuItem);
router.put('/:id', protect, authorize('admin'), updateMenuItem);
router.patch('/:id/branch-status', protect, authorize('admin', 'branch_admin', 'staff'), updateBranchMenuItemStatus);
router.delete('/:id', protect, authorize('admin'), deleteMenuItem);

module.exports = router;
