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

module.exports = { parseDataUrl };
