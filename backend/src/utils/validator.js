/**
 * Checks if the given array contains duplicates.
 * @param {Array} arr
 * @returns {boolean}
 */
function hasDuplicates(arr) {
  return new Set(arr).size !== arr.length;
}

/**
 * Validate that each node has at least one dependency if required.
 * (Placeholder function; implement as needed.)
 * @param {Object} design
 * @throws Error if validation fails.
 */
function validateDependencies(design) {
  design.nodes.forEach(node => {
    // Example: Governance nodes must have at least one dependency.
    if (node.type === 'governance' && (!node.dependencies || node.dependencies.length === 0)) {
      throw new Error(`Governance node ${node.id} must have at least one dependency.`);
    }
  });
}

module.exports = {
  hasDuplicates,
  validateDependencies
};
