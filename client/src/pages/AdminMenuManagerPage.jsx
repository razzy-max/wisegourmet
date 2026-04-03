import { useEffect, useState } from 'react';
import { menuApi } from '../api/menuApi';
import { filesToAttachments } from '../utils/attachments';

const availabilityOptions = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'unavailable', label: 'Unavailable' },
];

const normalizeStatus = (item) => item.availabilityStatus || (item.isAvailable ? 'in_stock' : 'unavailable');

export default function AdminMenuManagerPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    availabilityStatus: 'in_stock',
  });
  const [editingItemId, setEditingItemId] = useState('');
  const [editItem, setEditItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    availabilityStatus: 'in_stock',
  });
  const [savingItemId, setSavingItemId] = useState('');
  const [creatingItemId, setCreatingItemId] = useState('');
  const [message, setMessage] = useState('');

  const toImageDataUrl = async (fileList) => {
    const attachments = await filesToAttachments(fileList || []);
    return attachments[0]?.dataUrl || '';
  };

  const load = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingItems(true);
    }

    try {
      const [categoryRes, itemRes] = await Promise.all([menuApi.categories(), menuApi.list()]);
      setCategories(categoryRes.categories || []);
      setItems(itemRes.items || []);
    } finally {
      if (!silent) {
        setLoadingItems(false);
      }
    }
  };

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

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
      setNewItem({
        name: '',
        description: '',
        price: '',
        category: '',
        imageUrl: '',
        availabilityStatus: 'in_stock',
      });
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
    setEditItem({
      name: '',
      description: '',
      price: '',
      category: '',
      imageUrl: '',
      availabilityStatus: 'in_stock',
    });
  };

  const handleEditImageUpload = async (event) => {
    try {
      const dataUrl = await toImageDataUrl(event.target.files || []);
      if (dataUrl) {
        setEditItem((prev) => ({ ...prev, imageUrl: dataUrl }));
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
      const response = await menuApi.updateItem(itemId, {
        ...editItem,
        price: Number(editItem.price),
      });

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
      await menuApi.updateItem(itemId, { availabilityStatus });
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
      <h1>Admin Menu Manager</h1>
      {message ? <p className="error">{message}</p> : null}
      {loadingItems ? <p className="muted">Refreshing menu data...</p> : null}

      <div className="grid">
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
        </article>

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
            <input type="file" accept="image/*" onChange={handleCreateImageUpload} />
            <select
              value={newItem.category}
              onChange={(event) => setNewItem((prev) => ({ ...prev, category: event.target.value }))}
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
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
      </div>

      <div className="grid">
        {items.map((item) => (
          <article className="panel" key={item._id}>
            {editingItemId === item._id ? (
              <>
                {editItem.imageUrl ? (
                  <img className="menu-item-image" src={editItem.imageUrl} alt={editItem.name} loading="lazy" />
                ) : (
                  <div className="menu-item-image-placeholder">No Image</div>
                )}
                <div className="form">
                  <input
                    placeholder="Name"
                    value={editItem.name}
                    onChange={(event) => setEditItem((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <textarea
                    placeholder="Description"
                    value={editItem.description}
                    onChange={(event) =>
                      setEditItem((prev) => ({ ...prev, description: event.target.value }))
                    }
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
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editItem.availabilityStatus}
                    onChange={(event) =>
                      setEditItem((prev) => ({ ...prev, availabilityStatus: event.target.value }))
                    }
                  >
                    {availabilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Image URL (optional)"
                    value={editItem.imageUrl}
                    onChange={(event) => setEditItem((prev) => ({ ...prev, imageUrl: event.target.value }))}
                  />
                  <input type="file" accept="image/*" onChange={handleEditImageUpload} />
                </div>
                <div className="row">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => saveEdit(item._id)}
                    disabled={savingItemId === item._id}
                  >
                    {savingItemId === item._id ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={cancelEdit}
                    disabled={savingItemId === item._id}
                  >
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
              </>
            ) : (
              <>
                {item.imageUrl ? (
                  <img className="menu-item-image" src={item.imageUrl} alt={item.name} loading="lazy" />
                ) : (
                  <div className="menu-item-image-placeholder">No Image</div>
                )}
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <p>N {item.price.toLocaleString()}</p>
                <p>
                  Status:{' '}
                  {
                    availabilityOptions.find((option) => option.value === normalizeStatus(item))
                      ?.label || 'Unknown'
                  }
                </p>
                <div className="row">
                  <select
                    value={normalizeStatus(item)}
                    onChange={(event) => updateStatus(item._id, event.target.value)}
                  >
                    {availabilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button className="btn" type="button" onClick={() => startEdit(item)}>
                    Edit
                  </button>
                  <button className="btn btn-danger" type="button" onClick={() => deleteItem(item._id)}>
                    Delete item
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
