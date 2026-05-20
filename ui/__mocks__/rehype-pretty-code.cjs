// Mock for rehype-pretty-code — identity function
module.exports = function rehypePrettyCode() {
  return (tree) => tree;
};
