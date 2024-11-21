const parseSerbian = (numberStr) => {
  if (!numberStr) return 0;

  // Remove any whitespace
  const cleaned = numberStr.trim();

  // Match Serbian number format:
  // 2.400,00 or 300,00 or 1,5 (for quantities)
  const regex = /^(?:\d{1,3}(?:\.\d{3})*|\d+),\d{1,3}$|^\d+$/;

  if (!regex.test(cleaned)) {
    throw new Error(`Invalid Serbian number format: ${numberStr}`);
  }

  return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
};

const parseBillItem = (itemDetails) => {
  try {
    return {
      price: parseSerbian(itemDetails[0]),
      amount: parseSerbian(itemDetails[1]),
      total: parseSerbian(itemDetails[2]),
    };
  } catch (error) {
    console.error(`Error parsing item details:`, itemDetails);
    throw error;
  }
};

// Example usage in scrapeHandler.js:
const parseBillAmount = (amountStr) => {
  try {
    return parseSerbian(amountStr);
  } catch (error) {
    console.error(`Error parsing amount: ${amountStr}`);
    throw error;
  }
};

module.exports = { parseSerbian, parseBillAmount, parseBillItem };
