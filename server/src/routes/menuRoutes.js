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
  deleteMenuItem,
  getMenuItemImage,
} = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', listMenu);
router.get('/categories', listCategories);
router.get('/categories/admin', protect, authorize('admin'), listCategoriesAdmin);
router.get('/:id/image', getMenuItemImage);

router.post('/categories', protect, authorize('admin'), createCategory);
router.patch('/categories/reorder', protect, authorize('admin'), reorderCategories);
router.put('/categories/:id', protect, authorize('admin'), updateCategory);
router.delete('/categories/:id', protect, authorize('admin'), deleteCategory);

router.post('/', protect, authorize('admin', 'staff'), createMenuItem);
router.put('/:id', protect, authorize('admin', 'staff'), updateMenuItem);
router.delete('/:id', protect, authorize('admin'), deleteMenuItem);

module.exports = router;
