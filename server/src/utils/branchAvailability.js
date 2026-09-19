const Branch = require('../models/Branch');
const MenuItem = require('../models/MenuItem');
const BranchMenuItemStatus = require('../models/BranchMenuItemStatus');

const isStatusInStock = (status) => status !== 'sold_out' && status !== 'unavailable';

// Map<menuItemId, Map<branchId, status>> across every active branch — the
// single source of truth for "can this branch supply this item," used by
// the menu, cart, checkout-zones, and order-creation steps alike. Falls
// back to the item's own store-wide availabilityStatus for any branch with
// no explicit BranchMenuItemStatus row (the sparse-join design — see the
// BranchMenuItemStatus model).
const getAvailabilityByBranch = async (menuItemIds) => {
  const ids = [...new Set(menuItemIds.map(String))];
  if (ids.length === 0) {
    return new Map();
  }

  const [branches, items, overrides] = await Promise.all([
    Branch.find({ isActive: true }).select('_id').lean(),
    MenuItem.find({ _id: { $in: ids } }).select('availabilityStatus isAvailable').lean(),
    BranchMenuItemStatus.find({ menuItem: { $in: ids } }).lean(),
  ]);

  const fallbackByItem = new Map(
    items.map((item) => [
      String(item._id),
      item.availabilityStatus || (item.isAvailable ? 'in_stock' : 'unavailable'),
    ])
  );

  const overrideByItemBranch = new Map();
  overrides.forEach((entry) => {
    overrideByItemBranch.set(`${String(entry.menuItem)}:${String(entry.branch)}`, entry.availabilityStatus);
  });

  const result = new Map();
  ids.forEach((itemId) => {
    const perBranch = new Map();
    branches.forEach((branch) => {
      const branchId = String(branch._id);
      const status =
        overrideByItemBranch.get(`${itemId}:${branchId}`) || fallbackByItem.get(itemId) || 'unavailable';
      perBranch.set(branchId, status);
    });
    result.set(itemId, perBranch);
  });

  return result;
};

// Active branch IDs capable of supplying every item in the set. An empty
// item set is trivially satisfiable by every active branch.
const getFeasibleBranchIds = async (menuItemIds) => {
  const ids = [...new Set((menuItemIds || []).map(String))];

  if (ids.length === 0) {
    const branches = await Branch.find({ isActive: true }).select('_id').lean();
    return branches.map((branch) => String(branch._id));
  }

  const availability = await getAvailabilityByBranch(ids);
  const branchIds = [...(availability.get(ids[0]) || new Map()).keys()];

  return branchIds.filter((branchId) =>
    ids.every((itemId) => isStatusInStock(availability.get(itemId)?.get(branchId)))
  );
};

// Given an item ID set that is already known to be infeasible as a whole,
// returns which item(s) would restore feasibility if removed alone — i.e.
// the actual culprit(s) to name in a rejection message, rather than vaguely
// blaming the entire set. More than one item can come back as a culprit
// (removing *either* one independently fixes it); the caller decides how
// many to mention and whether to exclude a particular id (e.g. the item
// just being added, since "remove the thing you're trying to add" isn't
// useful advice for that action).
const findRemovableConflicts = async (menuItemIds) => {
  const ids = [...new Set(menuItemIds.map(String))];
  const culprits = [];

  for (const id of ids) {
    const rest = ids.filter((otherId) => otherId !== id);
    // eslint-disable-next-line no-await-in-loop
    const feasible = await getFeasibleBranchIds(rest);
    if (feasible.length > 0) {
      culprits.push(id);
    }
  }

  return culprits;
};

module.exports = { getAvailabilityByBranch, getFeasibleBranchIds, findRemovableConflicts, isStatusInStock };
