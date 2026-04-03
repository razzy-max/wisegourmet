const mongoose = require('mongoose');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');

const listMenu = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
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

  res.json({ items: menuItems });
});

const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
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

  const category = await Category.create({ name, slug });
  res.status(201).json({ category });
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

  const item = await MenuItem.create({
    name,
    slug: `${slugify(name)}-${Date.now()}`,
    description,
    category,
    price,
    imageUrl,
    availabilityStatus: normalizedStatus,
    isAvailable: normalizedStatus === 'in_stock',
    tags: Array.isArray(tags) ? tags : [],
  });

  const populated = await item.populate('category', 'name slug');
  res.status(201).json({ item: populated });
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await MenuItem.findById(id);

  if (!item) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  const fields = ['name', 'description', 'price', 'imageUrl'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      item[field] = req.body[field];
    }
  });

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
  res.json({ item: populated });
});

const deleteMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await MenuItem.findByIdAndDelete(id);

  if (!item) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  res.json({ message: 'Menu item deleted' });
});

module.exports = {
  listMenu,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
