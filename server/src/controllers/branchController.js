const Branch = require('../models/Branch');
const User = require('../models/User');
const DeliveryZone = require('../models/DeliveryZone');
const BranchMenuItemStatus = require('../models/BranchMenuItemStatus');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const { isBranchScopingEnabled, setBranchScopingEnabled } = require('../utils/branchScoping');

// Public/customer-facing — active branches only, for the branch picker.
// Also carries whether branching is turned on at all, so the client can
// decide whether to show the picker without a separate round trip.
const listBranches = asyncHandler(async (_req, res) => {
  const branches = await Branch.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  res.json({ branches, branchingEnabled: isBranchScopingEnabled() });
});

const getBranchingSettings = asyncHandler(async (_req, res) => {
  res.json({ branchingEnabled: isBranchScopingEnabled() });
});

const updateBranchingSettings = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  const branchingEnabled = await setBranchScopingEnabled(enabled);
  res.json({ branchingEnabled });
});

// Admin — every branch, including inactive/legacy ones.
const listBranchesAdmin = asyncHandler(async (_req, res) => {
  const branches = await Branch.find({}).sort({ sortOrder: 1, name: 1 });
  res.json({ branches });
});

const createBranch = asyncHandler(async (req, res) => {
  const { name, city, addressLine, phone } = req.body;

  if (!name || !city) {
    res.status(400);
    throw new Error('name and city are required');
  }

  const slug = slugify(name);
  const existing = await Branch.findOne({ slug });
  if (existing) {
    res.status(400);
    throw new Error('A branch with this name already exists');
  }

  const lastBranch = await Branch.findOne().sort({ sortOrder: -1 }).select('sortOrder');
  const sortOrder = lastBranch ? lastBranch.sortOrder + 1 : 0;

  const branch = await Branch.create({
    name,
    slug,
    city,
    addressLine: addressLine || '',
    phone: phone || '',
    sortOrder,
  });

  res.status(201).json({ branch });
});

const updateBranch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, city, addressLine, phone, isActive } = req.body;

  const branch = await Branch.findById(id);
  if (!branch) {
    res.status(404);
    throw new Error('Branch not found');
  }

  if (name) {
    branch.name = name;
    branch.slug = slugify(name);
  }
  if (city !== undefined) branch.city = city;
  if (addressLine !== undefined) branch.addressLine = addressLine;
  if (phone !== undefined) branch.phone = phone;
  if (typeof isActive === 'boolean') branch.isActive = isActive;

  await branch.save();
  res.json({ branch });
});

const deleteBranch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const branch = await Branch.findById(id);
  if (!branch) {
    res.status(404);
    throw new Error('Branch not found');
  }

  const staffCount = await User.countDocuments({ branches: id });
  if (staffCount > 0) {
    res.status(400);
    throw new Error('Reassign or remove this branch\'s staff/riders before deleting it');
  }

  // Zones and stock overrides are pure branch-scoped metadata with no
  // standalone value — safe to clean up. Orders keep their branch
  // reference as-is (a deleted branch just means that historical order's
  // branch no longer resolves to anything, same as a legacy pre-branch
  // order); re-tagging history isn't worth doing, per the rollout plan.
  await DeliveryZone.deleteMany({ branch: id });
  await BranchMenuItemStatus.deleteMany({ branch: id });
  await branch.deleteOne();

  res.json({ ok: true, deletedBranchId: id });
});

const reorderBranches = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400);
    throw new Error('orderedIds must be a non-empty array');
  }

  await Branch.bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }))
  );

  const branches = await Branch.find({}).sort({ sortOrder: 1, name: 1 });
  res.json({ branches });
});

module.exports = {
  listBranches,
  listBranchesAdmin,
  getBranchingSettings,
  updateBranchingSettings,
  createBranch,
  updateBranch,
  deleteBranch,
  reorderBranches,
};
