# Implementation Plan - Limit Popup Max Width

## Proposed Changes

We will modify the styling of the modal content container in the `openCalculatorModal` function in both JavaScript and TypeScript implementation files.

### 1. `c:\Users\H.I.N\Desktop\Skyjet ERP Extension Helper\src\extension\search-transaction.js`

Add `content.style.maxWidth = '1144px';` to the `content` element. Since the parent container uses Flexbox (`display: flex`, `justify-content: center`, and `align-items: center`), the content element will automatically be centered horizontally and vertically when the viewport width exceeds 1144px.

**Diff illustration:**
```diff
           const content = document.createElement('div');
           content.style.position = 'relative';
           content.style.width = '100%';
+          content.style.maxWidth = '1144px';
           content.style.height = '100%';
           content.style.backgroundColor = '#1e1e2e';
```

---

### 2. `c:\Users\H.I.N\Desktop\Skyjet ERP Extension Helper\src\data\searchTransaction.ts`

Add `content.style.maxWidth = '1144px';` to the `content` element. The Flexbox settings on the parent container (`display: flex`, `justify-content: center`, and `align-items: center`) will ensure that the modal remains centered when the viewport width is larger than 1144px.

**Diff illustration:**
```diff
           const content = document.createElement('div');
           content.style.position = 'relative';
           content.style.width = '100%';
+          content.style.maxWidth = '1144px';
           content.style.height = '100%';
           content.style.backgroundColor = '#1e1e2e';
```
