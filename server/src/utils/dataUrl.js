const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/s;

const parseDataUrl = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(DATA_URL_PATTERN);
  if (!match) {
    return null;
  }

  return { contentType: match[1], base64: match[2] };
};

const buildMenuItemImageUrl = (req, item) =>
  item?.imageContentType ? `${req.protocol}://${req.get('host')}/api/menu/${item._id}/image` : item?.imageUrl || '';

module.exports = { parseDataUrl, buildMenuItemImageUrl };
