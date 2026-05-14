// Mock for rehype-highlight — identity function
module.exports = function rehypeHighlight() {
  return (tree) => tree;
};
