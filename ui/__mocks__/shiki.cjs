// Mock for shiki — stub
module.exports = {
  getSingletonHighlighter: () => Promise.resolve({
    codeToHtml: (code) => `<pre>${code}</pre>`,
  }),
};
