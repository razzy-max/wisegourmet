const mongoose = require('mongoose');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const BranchMenuItemStatus = require('../models/BranchMenuItemStatus');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const { parseDataUrl, buildMenuItemImageUrl } = require('../utils/dataUrl');
const { isBranchScopingEnabled } = require('../utils/branchScoping');
const { getAvailabilityByBranch, isStatusInStock } = require('../utils/branchAvailability');

const notifyMenuChanged = (req) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('menu:changed', { updatedAt: new Date().toISOString() });
  }
};

const serializeMenuItem = (req, doc) => {
  const item = doc.toObject ? doc.toObject() : { ...doc };
  item.imageUrl = buildMenuItemImageUrl(req, item);
  delete item.imageContentType;
  delete item.imageData;
  return item;
};

const listMenu = asyncHandler(async (req, res) => {
  const { category, search, branch } = req.query;
  const availabilityFilter = {
    $or: [
      { availabilityStatus: { $in: ['in_stock', 'sold_out'] } },
      { availabilityStatus: { $exists: false }, isAvailable: true },
    ],
  };
  const andFilters = [availabilityFilter];

  if (category && category !== 'undefined') {
    const categoryFilters = [{ slug: category }];
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryFilters.push({ _id: category });
    }

    const categoryDoc = await Category.findOne({ $or: categoryFilters });
    if (categoryDoc) {
      andFilters.push({ category: categoryDoc._id });
    }
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    andFilters.push({
      $or: [{ name: searchRegex }, { description: searchRegex }, { tags: searchRegex }],
    });
  }

  const query = andFilters.length > 1 ? { $and: andFilters } : availabilityFilter;

  const menuItems = await MenuItem.find(query)
    .populate('category', 'name slug')
    .sort({ createdAt: -1 });

  // An explicit branch (admin/staff/branch_admin managing one branch's
  // stock) always wins and collapses to that single branch's status.
  if (branch) {
    const overrides = await BranchMenuItemStatus.find({
      branch,
      menuItem: { $in: menuItems.map((item) => item._id) },
    }).lean();
    const branchStatusById = new Map(overrides.map((entry) => [String(entry.menuItem), entry.availabilityStatus]));

    res.json({
      items: menuItems.map((item) => {
        const serialized = serializeMenuItem(req, item);
        const override = branchStatusById.get(String(item._id));
        if (override) {
          serialized.availabilityStatus = override;
        }
        return serialized;
      }),
    });
    return;
  }

  // No branch given — the customer's call. With branching off, every item
  // just keeps its own store-wide availabilityStatus (today's exact
  // behavior). With branching on, an item is shown as available if *any*
  // active branch has it — the customer sees one combined menu; which
  // branch actually fulfills it gets resolved later at checkout.
  if (!isBranchScopingEnabled()) {
    res.json({ items: menuItems.map((item) => serializeMenuItem(req, item)) });
    return;
  }

  const availability = await getAvailabilityByBranch(menuItems.map((item) => item._id));

  res.json({
    items: menuItems.map((item) => {
      const serialized = serializeMenuItem(req, item);
      const perBranch = availability.get(String(item._id)) || new Map();
      const availableBranchIds = [...perBranch.entries()]
        .filter(([, status]) => isStatusInStock(status))
        .map(([branchId]) => branchId);

      serialized.availableBranchIds = availableBranchIds;
      if (availableBranchIds.length > 0) {
        serialized.availabilityStatus = 'in_stock';
      } else if (!isStatusInStock(serialized.availabilityStatus)) {
        // Keep the item's own fallback reason (sold_out vs unavailable)
        // when no branch has it, rather than flattening to one value.
      } else {
        serialized.availabilityStatus = 'sold_out';
      }
      return serialized;
    }),
  });
});

const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  res.json({ categories });
});

const listCategoriesAdmin = asyncHandler(async (_req, res) => {
  const categories = await Category.find({}).sort({ sortOrder: 1, name: 1 });
  res.json({ categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Category name is required');
  }

  const slug = slugify(name);
  const existing = await Category.findOne({ slug });
  if (existing) {
    res.status(400);
    throw new Error('Category already exists');
  }

  const lastCategory = await Category.findOne().sort({ sortOrder: -1 }).select('sortOrder');
  const sortOrder = lastCategory ? lastCategory.sortOrder + 1 : 0;

  const category = await Category.create({ name, slug, sortOrder });
  notifyMenuChanged(req);
  res.status(201).json({ category });
});

const reorderCategories = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400);
    throw new Error('orderedIds must be a non-empty array');
  }

  await Category.bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }))
  );

  notifyMenuChanged(req);

  const categories = await Category.find({}).sort({ sortOrder: 1, name: 1 });
  res.json({ categories });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, isActive } = req.body;

  const category = await Category.findById(id);
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  if (name) {
    category.name = name;
    category.slug = slugify(name);
  }
  if (typeof isActive === 'boolean') {
    category.isActive = isActive;
  }

  await category.save();
  notifyMenuChanged(req);
  res.json({ category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inUse = await MenuItem.exists({ category: id });
  if (inUse) {
    res.status(400);
    throw new Error('Category has linked menu items and cannot be deleted');
  }

  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  notifyMenuChanged(req);
  res.json({ message: 'Category deleted' });
});

const createMenuItem = asyncHandler(async (req, res) => {
  const { name, description, category, price, imageUrl, isAvailable, availabilityStatus, tags } = req.body;
  if (!name || !category || price === undefined) {
    res.status(400);
    throw new Error('name, category and price are required');
  }

  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) {
    res.status(400);
    throw new Error('Invalid category');
  }

  const normalizedStatus = ['in_stock', 'sold_out', 'unavailable'].includes(availabilityStatus)
    ? availabilityStatus
    : isAvailable === false
      ? 'unavailable'
      : 'in_stock';

  const parsedImage = parseDataUrl(imageUrl);

  const item = await MenuItem.create({
    name,
    slug: `${slugify(name)}-${Date.now()}`,
    description,
    category,
    price,
    imageUrl: parsedImage ? '' : imageUrl || '',
    imageData: parsedImage ? parsedImage.base64 : '',
    imageContentType: parsedImage ? parsedImage.contentType : '',
    availabilityStatus: normalizedStatus,
    isAvailable: normalizedStatus === 'in_stock',
    tags: Array.isArray(tags) ? tags : [],
  });

  const populated = await item.populate('category', 'name slug');
  notifyMenuChanged(req);
  res.status(201).json({ item: serializeMenuItem(req, populated) });
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await MenuItem.findById(id);

  if (!item) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  const fields = ['name', 'description', 'price'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      item[field] = req.body[field];
    }
  });

  if (req.body.imageUrl !== undefined) {
    const parsedImage = parseDataUrl(req.body.imageUrl);
    if (parsedImage) {
      item.imageData = parsedImage.base64;
      item.imageContentType = parsedImage.contentType;
      item.imageUrl = '';
    } else {
      item.imageData = '';
      item.imageContentType = '';
      item.imageUrl = req.body.imageUrl;
    }
  }

  if (req.body.name) {
    item.slug = `${slugify(req.body.name)}-${Date.now()}`;
  }

  if (req.body.category) {
    const categoryDoc = await Category.findById(req.body.category);
    if (!categoryDoc) {
      res.status(400);
      throw new Error('Invalid category');
    }
    item.category = req.body.category;
  }

  if (req.body.availabilityStatus !== undefined) {
    if (!['in_stock', 'sold_out', 'unavailable'].includes(req.body.availabilityStatus)) {
      res.status(400);
      throw new Error('Invalid availability status');
    }
    item.availabilityStatus = req.body.availabilityStatus;
    item.isAvailable = req.body.availabilityStatus === 'in_stock';
  } else if (typeof req.body.isAvailable === 'boolean') {
    item.isAvailable = req.body.isAvailable;
    item.availabilityStatus = req.body.isAvailable ? 'in_stock' : 'unavailable';
  }

  if (Array.isArray(req.body.tags)) {
    item.tags = req.body.tags;
  }

  await item.save();
  const populated = await item.populate('category', 'name slug');
  notifyMenuChanged(req);
  res.json({ item: serializeMenuItem(req, populated) });
});

// Sets a menu item's stock status for one specific branch, without touching
// the item's own store-wide `availabilityStatus` (which stays the fallback
// used by any branch with no override of its own — see BranchMenuItemStatus).
const updateBranchMenuItemStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { availabilityStatus } = req.body;
  // Non-admins can only ever act on their own branch — infer it rather than
  // trusting a client-supplied value when one isn't explicitly given.
  const branch = req.user.role === 'admin' ? req.body.branch : req.user.branches[0];

  if (!branch || !['in_stock', 'sold_out', 'unavailable'].includes(availabilityStatus)) {
    res.status(400);
    throw new Error('branch and a valid availabilityStatus are required');
  }

  if (req.user.role !== 'admin' && !req.user.branches.some((ownId) => String(ownId) === String(branch))) {
    res.status(403);
    throw new Error('You can only set stock status for your own branch');
  }

  const menuItem = await MenuItem.findById(id);
  if (!menuItem) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  const status = await BranchMenuItemStatus.findOneAndUpdate(
    { branch, menuItem: id },
    { $set: { availabilityStatus } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  notifyMenuChanged(req);
  res.json({ status });
});

const deleteMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await MenuItem.findByIdAndDelete(id);

  if (!item) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  notifyMenuChanged(req);
  res.json({ message: 'Menu item deleted' });
});

const getMenuItemImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await MenuItem.findById(id).select('+imageData imageContentType');

  if (!item || !item.imageData) {
    res.status(404);
    throw new Error('Image not found');
  }

  res.set({
    'Content-Type': item.imageContentType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=86400',
  });
  res.send(Buffer.from(item.imageData, 'base64'));
});

module.exports = {
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
};
