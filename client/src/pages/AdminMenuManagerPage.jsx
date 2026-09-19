import { Fragment, useEffect, useMemo, useState } from 'react';
import { menuApi } from '../api/menuApi';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { filesToAttachments } from '../utils/attachments';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { UploadIcon, SearchIcon, FoodIcon, EditIcon, TrashIcon, CloseIcon } from '../components/icons';
import './AdminPolish.css';

const availabilityOptions = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'unavailable', label: 'Unavailable' },
];

const sortOptions = [
  { value: 'name-asc', label: 'Sort: Name (A–Z)' },
  { value: 'name-desc', label: 'Sort: Name (Z–A)' },
  { value: 'price-asc', label: 'Sort: Price (low–high)' },
  { value: 'price-desc', label: 'Sort: Price (high–low)' },
  { value: 'status-asc', label: 'Sort: Status' },
];

const normalizeStatus = (item) => item.availabilityStatus || (item.isAvailable ? 'in_stock' : 'unavailable');

function StockToggle({ value, onChange }) {
  return (
    <div className="stock-toggle" role="group" aria-label="Availability status">
      {availabilityOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`stock-toggle-btn stock-toggle-${option.value}${value === option.value ? ' active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const emptyItemForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  imageUrl: '',
  availabilityStatus: 'in_stock',
};

export default function AdminMenuManagerPage() {
  const { user } = useAuth();
  const { branches } = useBranch();
  const isOwner = user?.role === 'admin';
  const myBranchId = user?.branches?.[0] || '';
  const myBranchName = branches.find((branch) => branch._id === myBranchId)?.name || '';

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [stockBranchId, setStockBranchId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [newItem, setNewItem] = useState(emptyItemForm);
  const [editingItemId, setEditingItemId] = useState('');
  const [editItem, setEditItem] = useState(emptyItemForm);
  const [editImageChanged, setEditImageChanged] = useState(false);
  const [savingItemId, setSavingItemId] = useState('');
  const [creatingItemId, setCreatingItemId] = useState('');
  const [message, setMessage] = useState('');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const activeCategories = useMemo(() => categories.filter((category) => category.isActive !== false), [categories]);

  // Which branch's stock this page is showing/editing right now — the
  // owner picks from every branch, everyone else is locked to their own.
  const stockScopeBranchId = isOwner ? stockBranchId : myBranchId;

  const toImageDataUrl = async (fileList) => {
    const attachments = await filesToAttachments(fileList || []);
    return attachments[0]?.dataUrl || '';
  };

  const load = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingItems(true);
    }

    try {
      const [categoryRes, itemRes] = await Promise.all([
        menuApi.categoriesAdmin(),
        menuApi.list(stockScopeBranchId ? { branch: stockScopeBranchId } : {}),
      ]);
      setCategories(categoryRes.categories || []);
      setItems(itemRes.items || []);
    } finally {
      if (!silent) {
        setLoadingItems(false);
      }
    }
  };

  useEffect(() => {
    if (isOwner && branches.length) {
      setStockBranchId((current) => current || branches[0]._id);
    }
  }, [isOwner, branches]);

  useEffect(() => {
    if (isOwner && !stockBranchId) {
      return;
    }
    load().catch((error) => setMessage(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockScopeBranchId]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    items.forEach((item) => {
      const key = item.category?._id || 'uncategorized';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (categoryFilter && item.category?._id !== categoryFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${item.name || ''} ${item.description || ''}`.toLowerCase();
      return haystack.includes(query);
    });

    const [field, direction] = sortBy.split('-');
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (field === 'name') {
        comparison = String(a.name || '').localeCompare(String(b.name || ''));
      } else if (field === 'price') {
        comparison = Number(a.price || 0) - Number(b.price || 0);
      } else if (field === 'status') {
        comparison = normalizeStatus(a).localeCompare(normalizeStatus(b));
      }
      return direction === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }, [items, search, categoryFilter, sortBy]);

  const visibleSelectedCount = filteredItems.filter((item) => selectedIds.has(item._id)).length;
  const allVisibleSelected = filteredItems.length > 0 && visibleSelectedCount === filteredItems.length;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filteredItems.forEach((item) => next.delete(item._id));
        return next;
      }
      const next = new Set(prev);
      filteredItems.forEach((item) => next.add(item._id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkMarkSoldOut = async () => {
    setMessage('Updating selected items...');
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => menuApi.updateBranchStatus(id, stockScopeBranchId, 'sold_out'))
      );
      clearSelection();
      await load();
      setMessage('Selected items marked sold out.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} selected item(s)? This cannot be undone.`)) {
      return;
    }
    setMessage('Deleting selected items...');
    try {
      await Promise.all(Array.from(selectedIds).map((id) => menuApi.deleteItem(id)));
      clearSelection();
      await load();
      setMessage('Selected items deleted.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const createCategory = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await menuApi.createCategory({ name: newCategory });
      setNewCategory('');
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const moveCategory = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) {
      return;
    }

    const reordered = [...categories];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setCategories(reordered);

    try {
      await menuApi.reorderCategories(reordered.map((category) => category._id));
      await load({ silent: true });
    } catch (error) {
      setMessage(error.message);
      await load();
    }
  };

  const toggleCategoryActive = async (category) => {
    setMessage('');
    try {
      await menuApi.updateCategory(category._id, { isActive: !category.isActive });
      await load({ silent: true });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const startEditCategory = (category) => {
    setEditingCategoryId(category._id);
    setEditCategoryName(category.name);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId('');
    setEditCategoryName('');
  };

  const saveEditCategory = async (categoryId) => {
    setMessage('');
    try {
      await menuApi.updateCategory(categoryId, { name: editCategoryName });
      cancelEditCategory();
      await load({ silent: true });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const removeCategory = async (category) => {
    setMessage('');
    try {
      await menuApi.deleteCategory(category._id);
      await load({ silent: true });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const createItem = async (event) => {
    event.preventDefault();
    setMessage('');
    setCreatingItemId('creating');
    try {
      setMessage('Creating menu item...');
      await menuApi.createItem({
        ...newItem,
        price: Number(newItem.price),
        tags: [],
      });
      setNewItem(emptyItemForm);
      await load();
      setMessage('Menu item created successfully.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setCreatingItemId('');
    }
  };

  const handleCreateImageUpload = async (event) => {
    try {
      const dataUrl = await toImageDataUrl(event.target.files || []);
      if (dataUrl) {
        setNewItem((prev) => ({ ...prev, imageUrl: dataUrl }));
      }
      event.target.value = '';
    } catch (error) {
      setMessage(error.message);
    }
  };

  const startEdit = (item) => {
    setEditingItemId(item._id);
    setEditImageChanged(false);
    setEditItem({
      name: item.name || '',
      description: item.description || '',
      price: String(item.price ?? ''),
      category: item.category?._id || '',
      imageUrl: item.imageUrl || '',
      availabilityStatus: normalizeStatus(item),
    });
  };

  const cancelEdit = () => {
    setEditingItemId('');
    setEditImageChanged(false);
    setEditItem(emptyItemForm);
  };

  const handleEditImageUpload = async (event) => {
    try {
      const dataUrl = await toImageDataUrl(event.target.files || []);
      if (dataUrl) {
        setEditItem((prev) => ({ ...prev, imageUrl: dataUrl }));
        setEditImageChanged(true);
      }
      event.target.value = '';
    } catch (error) {
      setMessage(error.message);
    }
  };

  const saveEdit = async (itemId) => {
    setMessage('');
    setSavingItemId(itemId);
    try {
      setMessage('Saving item changes...');
      const { imageUrl, ...rest } = editItem;
      const payload = { ...rest, price: Number(editItem.price) };
      if (editImageChanged) {
        payload.imageUrl = imageUrl;
      }
      const response = await menuApi.updateItem(itemId, payload);

      if (response?.item) {
        setItems((prev) => prev.map((existing) => (existing._id === itemId ? response.item : existing)));
      }

      cancelEdit();
      await load({ silent: true });
      setMessage('Item updated successfully.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSavingItemId('');
    }
  };

  const updateStatus = async (itemId, availabilityStatus) => {
    setMessage('');
    try {
      await menuApi.updateBranchStatus(itemId, stockScopeBranchId, availabilityStatus);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteItem = async (itemId) => {
    setMessage('');
    try {
      await menuApi.deleteItem(itemId);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="page-wrap">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1>Menu items</h1>
          <p className="muted">
            {items.length} item{items.length === 1 ? '' : 's'} across {categories.length} categor
            {categories.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
      </div>
      {message ? <p className="error">{message}</p> : null}

      {isOwner ? (
        <div className="field-label" style={{ margin: '0.75rem 0' }}>
          Stock for branch:{' '}
          <select value={stockBranchId} onChange={(event) => setStockBranchId(event.target.value)}>
            {branches.map((branch) => (
              <option key={branch._id} value={branch._id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      ) : myBranchId ? (
        <p className="ops-branch-pill" style={{ margin: '0.75rem 0' }}>
          Managing stock for: {myBranchName || 'your branch'}
        </p>
      ) : (
        <p className="error" style={{ margin: '0.75rem 0' }}>
          You haven't been assigned to a branch yet — ask your admin to assign you one from the Team page. Stock
          changes won't save until then.
        </p>
      )}

      <div className="grid">
        {isOwner ? (
          <article className="panel">
            <h3>Create Category</h3>
            <form className="form" onSubmit={createCategory}>
              <input
                placeholder="Category name"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                required
              />
              <button className="btn" type="submit">
                Create
              </button>
            </form>

            <div className="category-manage-list">
              {categories.map((category, index) => (
                <div className="category-manage-row" key={category._id}>
                  <span className={`status-badge ${category.isActive !== false ? 'status-success' : 'status-muted'}`}>
                    {category.isActive !== false ? 'Active' : 'Disabled'}
                  </span>
                  {editingCategoryId === category._id ? (
                    <input
                      className="category-manage-name-input"
                      value={editCategoryName}
                      onChange={(event) => setEditCategoryName(event.target.value)}
                      autoFocus
                    />
                  ) : (
                    <span className="category-manage-name">{category.name}</span>
                  )}
                  <div className="row">
                    {editingCategoryId === category._id ? (
                      <>
                        <button className="btn" type="button" onClick={() => saveEditCategory(category._id)}>
                          Save
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={cancelEditCategory}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => moveCategory(index, -1)}
                          disabled={index === 0}
                        >
                          Move up
                        </button>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => moveCategory(index, 1)}
                          disabled={index === categories.length - 1}
                        >
                          Move down
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={() => toggleCategoryActive(category)}>
                          {category.isActive !== false ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={() => startEditCategory(category)}>
                          Rename
                        </button>
                        <button className="btn btn-danger" type="button" onClick={() => removeCategory(category)}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {isOwner ? (
        <article className="panel">
          <h3>Create Menu Item</h3>
          <form className="form" onSubmit={createItem}>
            <input
              placeholder="Name"
              value={newItem.name}
              onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <textarea
              placeholder="Description"
              value={newItem.description}
              onChange={(event) => setNewItem((prev) => ({ ...prev, description: event.target.value }))}
            />
            <input
              type="number"
              min="0"
              placeholder="Price"
              value={newItem.price}
              onChange={(event) => setNewItem((prev) => ({ ...prev, price: event.target.value }))}
              required
            />
            <input
              placeholder="Image URL (optional)"
              value={newItem.imageUrl}
              onChange={(event) => setNewItem((prev) => ({ ...prev, imageUrl: event.target.value }))}
            />
            <label className="upload-zone" htmlFor="create-menu-image">
              <p className="upload-icon" aria-hidden="true"><UploadIcon size={28} /></p>
              <p>Drag files here or click to upload.</p>
            </label>
            <input
              id="create-menu-image"
              type="file"
              accept="image/*"
              onChange={handleCreateImageUpload}
              className="hidden-file-input"
            />
            <select
              value={newItem.category}
              onChange={(event) => setNewItem((prev) => ({ ...prev, category: event.target.value }))}
              required
            >
              <option value="">Select category</option>
              {activeCategories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={newItem.availabilityStatus}
              onChange={(event) =>
                setNewItem((prev) => ({ ...prev, availabilityStatus: event.target.value }))
              }
            >
              {availabilityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="btn" type="submit" disabled={creatingItemId === 'creating'}>
              {creatingItemId === 'creating' ? 'Creating...' : 'Create item'}
            </button>
          </form>
        </article>
        ) : null}
      </div>

      <article className="panel" style={{ marginTop: '1.2rem' }}>
        <div className="data-toolbar">
          <div className="search-field">
            <SearchIcon size={15} />
            <input
              placeholder="Search by name or description..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="cat-chip-row">
          <button type="button" className={`cat-chip${categoryFilter === '' ? ' on' : ''}`} onClick={() => setCategoryFilter('')}>
            All · {items.length}
          </button>
          {categories.map((category) => (
            <button
              key={category._id}
              type="button"
              className={`cat-chip${categoryFilter === category._id ? ' on' : ''}`}
              onClick={() => setCategoryFilter(category._id)}
            >
              {category.name} · {categoryCounts[category._id] || 0}
            </button>
          ))}
        </div>

        {selectedIds.size > 0 ? (
          <div className="bulk-action-bar">
            <span>{selectedIds.size} selected</span>
            <span className="sp" />
            <button type="button" onClick={bulkMarkSoldOut}>Mark sold out</button>
            {isOwner ? <button type="button" onClick={bulkDelete}>Delete</button> : null}
            <button type="button" onClick={clearSelection}>Clear</button>
          </div>
        ) : null}

        {loadingItems && items.length === 0 ? <Skeleton variant="row" count={5} /> : null}

        {!loadingItems && filteredItems.length === 0 ? (
          <EmptyState
            icon={FoodIcon}
            heading={items.length === 0 ? 'No menu items yet' : 'No items match your filters'}
            subtext={items.length === 0 ? 'Create your first item using the form above.' : 'Try a different search term or category.'}
            actionLabel={search || categoryFilter ? 'Clear filters' : undefined}
            onAction={
              search || categoryFilter
                ? () => {
                    setSearch('');
                    setCategoryFilter('');
                  }
                : undefined
            }
          />
        ) : null}

        {filteredItems.length > 0 && isOwner ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                  </th>
                  <th>Item</th>
                  <th>Category</th>
                  <th className="num">Price</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const status = normalizeStatus(item);
                  const rowClass = status === 'sold_out' ? 'row-severity-bad' : '';
                  return (
                    <Fragment key={item._id}>
                      <tr className={rowClass}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item._id)}
                            onChange={() => toggleSelect(item._id)}
                          />
                        </td>
                        <td>
                          <div className="row-item">
                            <div className="row-thumb">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} loading="lazy" />
                              ) : (
                                <FoodIcon size={17} />
                              )}
                            </div>
                            <div>
                              <div className="row-name">{item.name}</div>
                              {item.description ? <div className="row-desc">{item.description}</div> : null}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="cat-tag">{item.category?.name || 'Uncategorized'}</span>
                        </td>
                        <td className="num tabular">₦{Number(item.price || 0).toLocaleString()}</td>
                        <td>
                          <span className="row" style={{ gap: '0.4rem', alignItems: 'center' }}>
                            <span className={`status-dot ${status === 'in_stock' ? 'in-stock' : 'offline'}`} />
                            <select value={status} onChange={(event) => updateStatus(item._id, event.target.value)}>
                              {availabilityOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <span onClick={() => (editingItemId === item._id ? cancelEdit() : startEdit(item))} style={{ cursor: 'pointer' }}>
                              {editingItemId === item._id ? <CloseIcon size={14} /> : <EditIcon size={14} />}
                            </span>
                            <span onClick={() => deleteItem(item._id)} style={{ cursor: 'pointer' }}>
                              <TrashIcon size={14} />
                            </span>
                          </div>
                        </td>
                      </tr>
                      {editingItemId === item._id ? (
                        <tr>
                          <td colSpan={6}>
                            <div className="form" style={{ background: 'var(--wg-green-light)', borderRadius: '10px', padding: '1rem' }}>
                              <input
                                placeholder="Name"
                                value={editItem.name}
                                onChange={(event) => setEditItem((prev) => ({ ...prev, name: event.target.value }))}
                              />
                              <textarea
                                placeholder="Description"
                                value={editItem.description}
                                onChange={(event) => setEditItem((prev) => ({ ...prev, description: event.target.value }))}
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder="Price"
                                value={editItem.price}
                                onChange={(event) => setEditItem((prev) => ({ ...prev, price: event.target.value }))}
                              />
                              <select
                                value={editItem.category}
                                onChange={(event) => setEditItem((prev) => ({ ...prev, category: event.target.value }))}
                              >
                                <option value="">Select category</option>
                                {activeCategories.map((category) => (
                                  <option key={category._id} value={category._id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                placeholder="Image URL (optional)"
                                value={editItem.imageUrl}
                                onChange={(event) => {
                                  setEditItem((prev) => ({ ...prev, imageUrl: event.target.value }));
                                  setEditImageChanged(true);
                                }}
                              />
                              <label className="upload-zone" htmlFor={`edit-menu-image-${item._id}`}>
                                <p className="upload-icon" aria-hidden="true"><UploadIcon size={24} /></p>
                                <p>Drag files here or click to upload.</p>
                              </label>
                              <input
                                id={`edit-menu-image-${item._id}`}
                                type="file"
                                accept="image/*"
                                onChange={handleEditImageUpload}
                                className="hidden-file-input"
                              />
                              <div className="row">
                                <button className="btn" type="button" onClick={() => saveEdit(item._id)} disabled={savingItemId === item._id}>
                                  {savingItemId === item._id ? 'Saving...' : 'Save'}
                                </button>
                                <button className="btn btn-ghost" type="button" onClick={cancelEdit} disabled={savingItemId === item._id}>
                                  Cancel
                                </button>
                                <button
                                  className="btn btn-danger"
                                  type="button"
                                  onClick={() => deleteItem(item._id)}
                                  disabled={savingItemId === item._id}
                                >
                                  Delete item
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {filteredItems.length > 0 && !isOwner ? (
          <div className="stock-card-grid">
            {filteredItems.map((item) => {
              const status = normalizeStatus(item);
              return (
                <article key={item._id} className={`panel stock-card${status === 'sold_out' ? ' stock-card-sold-out' : ''}`}>
                  <div className="stock-card-top">
                    <div className="stock-card-thumb">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} loading="lazy" />
                      ) : (
                        <FoodIcon size={20} />
                      )}
                    </div>
                    <div className="stock-card-info">
                      <h4>{item.name}</h4>
                      <span className="cat-tag">{item.category?.name || 'Uncategorized'}</span>
                      <p className="stock-card-price">₦{Number(item.price || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <StockToggle value={status} onChange={(next) => updateStatus(item._id, next)} />
                </article>
              );
            })}
          </div>
        ) : null}

        {filteredItems.length > 0 ? (
          <div className="table-foot">
            <span>Showing {filteredItems.length} of {items.length} items</span>
          </div>
        ) : null}
      </article>
    </section>
  );
}
