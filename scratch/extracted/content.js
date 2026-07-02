/**
 * Skyjet ERP Helper - Content Script
 * Tự động biến Mã đơn hàng thành nút tra cứu nhanh không tải lại trang.
 */

// An toàn hóa việc truy xuất sessionStorage tránh crash ở các trang bị chặn storage (như data: URL)
function safeGetSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
function safeSetSession(key, val) {
  try {
    sessionStorage.setItem(key, val);
  } catch (e) {}
}
function safeRemoveSession(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {}
}

// Đun nóng MutationObserver để theo dõi khi bảng dữ liệu thay đổi (khi bấm Tìm kiếm, đổi trang...)
const observer = new MutationObserver((mutations) => {
  let shouldProcess = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      shouldProcess = true;
      break;
    }
  }
  if (shouldProcess) {
    // Tránh trùng lặp tài nguyên bằng cách debounce nhẹ
    clearTimeout(window.skyjetTimeout);
    window.skyjetTimeout = setTimeout(processTransactionTable, 150);
  }
});

// Chạy lần đầu tiên khi trang web được tải xong
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSkyjetHelper);
} else {
  initSkyjetHelper();
}

function initSkyjetHelper() {
  if (window.location.hostname.includes('flightvn.com')) {
    handleAutoSearchQuery();
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const shouldHideFromUrl = urlParams.get('skyjet_hide_nav') === 'true';
  if (safeGetSession('skyjet_hide_nav') === 'true' || shouldHideFromUrl) {
    safeRemoveSession('skyjet_hide_nav');
    if (shouldHideFromUrl) {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + 
        window.location.search
          .replace(/[?&]skyjet_hide_nav=[^&]+/, '')
          .replace(/^&/, '?')
          .replace(/[?]$/, '');
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
    const tryHide = collapseLeftSidebar;
    tryHide();
    setTimeout(tryHide, 100);
    setTimeout(tryHide, 300);
    setTimeout(tryHide, 800);
    setTimeout(tryHide, 1500);
  }

  handleAutoSearchQuery();
  handleSearchTransactionQuery();
  processTransactionTable();
  processAgencySalesTable();
  removeCustomerCodeColumn();
  hideDuplicateDates();
  shortenDocumentPrefix();
  handleSearchTransactionCheck();
  handleSplitDescription();
  
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    applyVisibilitySettings();
  }
  
  // Quan sát toàn bộ body để phát hiện AJAX cập nhật bảng công nợ
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Dự phòng kiểm tra định kỳ mỗi 1.5 giây phòng khi MutationObserver bỏ lỡ
  setInterval(() => {
    processTransactionTable();
    processAgencySalesTable();
    removeCustomerCodeColumn();
    hideDuplicateDates();
    shortenDocumentPrefix();
    handleSearchTransactionCheck();
    handleSplitDescription();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      applyVisibilitySettings();
    }
  }, 1500);
}

// Lắng nghe thông điệp từ popup.js để quản lý hiển thị các mục
function getStableTitle(div, index) {
  if (div && div.dataset && div.dataset.title) {
    return div.dataset.title;
  }
  const text = div.innerText.trim();
  const menuMatches = ['Thông Báo', 'Báo Cáo Vé', 'Nội Bộ', 'Đại Lý', 'Kế Toán', 'Kinh Doanh', 'Phòng Vé', 'Data', 'HCNS', 'DVKH', 'Setting', 'BLĐ', 'QLKH'];
  for (let i = 0; i < menuMatches.length; i++) {
    if (text.includes(menuMatches[i]) && text.length < 35) {
      return menuMatches[i];
    }
  }
  return null;
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'get_sections') {
      const sections = [];
      const rowDivs = document.querySelectorAll('.row > div');
      rowDivs.forEach((div, index) => {
        const title = getStableTitle(div, index);
        if (title) {
          const a = div.querySelector('a');
          const href = a ? a.href : '';
          sections.push({
            index: index,
            title: title,
            url: href
          });
        }
      });
      if (sections.length > 0) {
        const discovered = sections.map(s => ({ title: s.title, url: s.url }));
        chrome.storage.local.set({ discoveredSections: discovered });
      }
      sendResponse({ sections: sections });
    } else if (message.action === 'update_visibility') {
      applyVisibilitySettings();
      sendResponse({ success: true });
    } else if (message.action === 'start_picker') {
      startSkyjetElementPicker();
      sendResponse({ success: true });
    } else if (message.action === 'update_split_desc') {
      handleSplitDescription();
      sendResponse({ success: true });
    } else if (message.action === 'update_auto_download') {
      handleSearchTransactionCheck();
      sendResponse({ success: true });
    }
    return true;
  });
}

let hoverOverlay = null;
let currentHoveredEl = null;

function startSkyjetElementPicker() {
  if (window.skyjetPickerActive) return;
  window.skyjetPickerActive = true;
  
  if (!hoverOverlay) {
    hoverOverlay = document.createElement('div');
    hoverOverlay.className = 'skyjet-picker-overlay';
    document.body.appendChild(hoverOverlay);
  }
  
  document.body.style.cursor = 'crosshair';
  
  const onMouseMove = (e) => {
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === hoverOverlay || el === document.body || el === document.documentElement) return;
    
    let target = el;
    for (let i = 0; i < 3; i++) {
      if (target.parentElement && (target.clientWidth < 100 || target.clientHeight < 40)) {
        target = target.parentElement;
      } else {
        break;
      }
    }
    
    currentHoveredEl = target;
    const rect = target.getBoundingClientRect();
    hoverOverlay.style.left = (rect.left + window.scrollX) + 'px';
    hoverOverlay.style.top = (rect.top + window.scrollY) + 'px';
    hoverOverlay.style.width = rect.width + 'px';
    hoverOverlay.style.height = rect.height + 'px';
    hoverOverlay.style.display = 'block';
  };
  
  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    cleanUpPicker();
    
    if (currentHoveredEl) {
      captureElementAndDownload(currentHoveredEl);
    }
  };
  
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      cleanUpPicker();
    }
  };
  
  function cleanUpPicker() {
    window.skyjetPickerActive = false;
    if (hoverOverlay) {
      hoverOverlay.style.display = 'none';
    }
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  }
  
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
}

function captureTab() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'capture_tab_rect' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        resolve(null);
      } else {
        resolve(response.dataUrl);
      }
    });
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Lỗi load ảnh: ' + e));
    img.src = src;
  });
}

async function captureTallElement(element) {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const rect = element.getBoundingClientRect();
  
  // Save original scroll positions
  const originalElementScrollTop = element.scrollTop;
  const originalWindowScrollY = window.scrollY;
  const originalWindowScrollX = window.scrollX;
  
  // Check scrollability
  const isElementScrollable = element.scrollHeight > element.clientHeight + 10;
  
  // Create status indicator
  const statusText = document.createElement('div');
  statusText.innerText = 'Đang chuẩn bị chụp cuộn...';
  statusText.style.position = 'fixed';
  statusText.style.bottom = '20px';
  statusText.style.right = '20px';
  statusText.style.background = '#2aa7dd';
  statusText.style.color = '#fff';
  statusText.style.padding = '10px 15px';
  statusText.style.borderRadius = '5px';
  statusText.style.zIndex = '999999';
  statusText.style.fontFamily = 'sans-serif';
  statusText.style.fontSize = '12px';
  statusText.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  document.body.appendChild(statusText);

  // Disable pointer-events globally to disable hover effects
  const disableHoverStyle = document.createElement('style');
  disableHoverStyle.id = 'skyjet-disable-hover-style';
  disableHoverStyle.innerHTML = '* { pointer-events: none !important; }';
  document.head.appendChild(disableHoverStyle);
  
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  try {
    if (isElementScrollable) {
      // SCROLL THE ELEMENT ITSELF
      const totalWidth = rect.width;
      const totalHeight = element.scrollHeight;
      
      const canvas = document.createElement('canvas');
      canvas.width = totalWidth * devicePixelRatio;
      canvas.height = totalHeight * devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không tạo được canvas 2D');
      
      let currentScrollTop = 0;
      element.scrollTop = 0;
      await sleep(150); // wait for scroll to settle
      
      while (currentScrollTop < totalHeight) {
        statusText.innerText = `Đang chụp cuộn: ${Math.round((currentScrollTop / totalHeight) * 100)}%`;
        
        // Temporarily hide status indicator for screenshot
        statusText.style.display = 'none';
        await sleep(80); // Wait for browser to repaint without the status indicator
        const dataUrl = await captureTab();
        statusText.style.display = 'block';
        
        if (!dataUrl) throw new Error('Chụp ảnh màn hình thất bại');
        
        const img = await loadImage(dataUrl);
        
        // Element's visible client rect in the viewport
        const currentRect = element.getBoundingClientRect();
        
        // Source coordinates on the captured image
        const srcX = currentRect.left * devicePixelRatio;
        const srcY = currentRect.top * devicePixelRatio;
        const srcW = currentRect.width * devicePixelRatio;
        const srcH = element.clientHeight * devicePixelRatio;
        
        // Destination on canvas
        const destX = 0;
        const destY = currentScrollTop * devicePixelRatio;
        
        ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, srcW, srcH);
        
        // Move down
        currentScrollTop += element.clientHeight;
        if (currentScrollTop >= totalHeight) break;
        
        element.scrollTop = currentScrollTop;
        await sleep(150);
        
        // Handle offset if we scrolled to the very bottom
        if (element.scrollTop < currentScrollTop) {
          const actualScrollTop = element.scrollTop;
          const diff = actualScrollTop - (currentScrollTop - element.clientHeight);
          if (diff <= 0) break;
          currentScrollTop = actualScrollTop;
        }
      }
      
      const croppedDataUrl = canvas.toDataURL('image/png');
      showImagePreviewModal(croppedDataUrl);
      
    } else {
      // SCROLL THE ENTIRE WINDOW (rect.height > window.innerHeight)
      const totalWidth = rect.width;
      const totalHeight = rect.height;
      
      // Scroll element to top of viewport
      const elementAbsoluteTop = rect.top + window.scrollY;
      window.scrollTo(window.scrollX, elementAbsoluteTop);
      await sleep(150);
      
      const canvas = document.createElement('canvas');
      canvas.width = totalWidth * devicePixelRatio;
      canvas.height = totalHeight * devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không tạo được canvas 2D');
      
      while (true) {
        const currentScrollY = window.scrollY;
        const progress = Math.min(100, Math.max(0, Math.round(((currentScrollY - elementAbsoluteTop + window.innerHeight) / totalHeight) * 100)));
        statusText.innerText = `Đang chụp cuộn trang: ${progress}%`;
        
        // Temporarily hide status indicator for screenshot
        statusText.style.display = 'none';
        await sleep(80); // Wait for browser to repaint without the status indicator
        const dataUrl = await captureTab();
        statusText.style.display = 'block';
        
        if (!dataUrl) throw new Error('Chụp ảnh màn hình thất bại');
        
        const img = await loadImage(dataUrl);
        
        // Get updated element position in viewport
        const currentRect = element.getBoundingClientRect();
        
        // Determine visible height of the element in current viewport
        const visibleY = Math.max(0, currentRect.top);
        const visibleH = Math.min(window.innerHeight - visibleY, currentRect.bottom - visibleY);
        
        if (visibleH <= 0) break;
        
        const srcX = currentRect.left * devicePixelRatio;
        const srcY = visibleY * devicePixelRatio;
        const srcW = totalWidth * devicePixelRatio;
        const srcH = visibleH * devicePixelRatio;
        
        const destX = 0;
        const destY = Math.max(0, (currentScrollY + visibleY - elementAbsoluteTop) * devicePixelRatio);
        
        ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, srcW, srcH);
        
        window.scrollBy(0, visibleH);
        await sleep(150);
        
        if (window.scrollY === currentScrollY) {
          break;
        }
      }
      
      const croppedDataUrl = canvas.toDataURL('image/png');
      showImagePreviewModal(croppedDataUrl);
    }
  } catch (err) {
    console.error('Lỗi chụp cuộn: ', err);
    alert('Lỗi chụp cuộn: ' + err.message);
  } finally {
    // Restore original positions
    element.scrollTop = originalElementScrollTop;
    window.scrollTo(originalWindowScrollX, originalWindowScrollY);
    if (statusText.parentNode) statusText.parentNode.removeChild(statusText);
    
    // Clean up hover style override
    const styleEl = document.getElementById('skyjet-disable-hover-style');
    if (styleEl) styleEl.remove();
  }
}

function captureElementAndDownload(element) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    const rect = element.getBoundingClientRect();
    const isElementScrollable = element.scrollHeight > element.clientHeight + 10;
    
    if (isElementScrollable || rect.height > window.innerHeight) {
      captureTallElement(element);
      return;
    }

    const statusText = document.createElement('div');
    statusText.innerText = 'Đang xử lý hình ảnh...';
    statusText.style.position = 'fixed';
    statusText.style.bottom = '20px';
    statusText.style.right = '20px';
    statusText.style.background = '#2aa7dd';
    statusText.style.color = '#fff';
    statusText.style.padding = '10px 15px';
    statusText.style.borderRadius = '5px';
    statusText.style.zIndex = '999999';
    statusText.style.fontFamily = 'sans-serif';
    statusText.style.fontSize = '12px';
    statusText.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    document.body.appendChild(statusText);

    // Disable hover style override
    const disableHoverStyle = document.createElement('style');
    disableHoverStyle.id = 'skyjet-disable-hover-style';
    disableHoverStyle.innerHTML = '* { pointer-events: none !important; }';
    document.head.appendChild(disableHoverStyle);
    
    statusText.style.display = 'none';
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'capture_tab_rect',
        rect: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          devicePixelRatio: window.devicePixelRatio || 1
        }
      }, (response) => {
        if (statusText.parentNode) {
          statusText.parentNode.removeChild(statusText);
        }
        const styleEl = document.getElementById('skyjet-disable-hover-style');
        if (styleEl) styleEl.remove();
        
        if (chrome.runtime.lastError) {
          console.error('Lỗi gửi tin nhắn: ', chrome.runtime.lastError);
          alert('Lỗi chụp màn hình: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.success && response.dataUrl) {
          cropImageAndDownload(response.dataUrl, rect, window.devicePixelRatio || 1);
        } else {
          alert('Chụp ảnh thất bại hoặc không nhận được dữ liệu.');
        }
      });
    }, 80);
  } else {
    alert('Không thể kết nối đến extension background script. Chức năng chụp yêu cầu cài đặt đầy đủ tiện ích.');
  }
}

function cropImageAndDownload(dataUrl, rect, devicePixelRatio) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const x = rect.left * devicePixelRatio;
    const y = rect.top * devicePixelRatio;
    const width = rect.width * devicePixelRatio;
    const height = rect.height * devicePixelRatio;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Không khởi tạo được canvas 2D.');
      return;
    }
    
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
    
    try {
      const croppedDataUrl = canvas.toDataURL('image/png');
      showImagePreviewModal(croppedDataUrl);
    } catch (err) {
      console.error('Lỗi khi xử lý ảnh preview: ', err);
      alert('Lỗi xem trước ảnh: ' + err.message);
    }
  };
  img.onerror = (e) => {
    console.error('Lỗi nạp ảnh screenshot: ', e);
    alert('Lỗi hiển thị dữ liệu ảnh chụp.');
  };
  img.src = dataUrl;
}

function showImagePreviewModal(croppedDataUrl) {
  let overlay = document.getElementById('skyjet-preview-overlay');
  if (overlay) overlay.remove();
  
  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  
  overlay = document.createElement('div');
  overlay.id = 'skyjet-preview-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.95);
    z-index: 10000000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  overlay.innerHTML = `
    <!-- Viewport Container -->
    <div id="skyjet-viewport" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: auto;">
      <div id="skyjet-canvas-container" style="position: relative; transform-origin: center; cursor: default; transition: transform 0.15s ease-out;">
        <canvas id="skyjet-paint-canvas" style="display: block; max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 4px;"></canvas>
        <div id="skyjet-selection-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000001;"></div>
      </div>
    </div>
    <div style="position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 8px 24px; border-radius: 9999px; display: flex; gap: 14px; align-items: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.4), 0 10px 10px -5px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); z-index: 10000002; color: #fff; user-select: none;">
      
      <!-- Zoom Tools -->
      <button type="button" id="skyjet-btn-zoom-out" title="Thu nhỏ" style="background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 6px; display: flex; align-items: center; transition: color 0.15s;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></button>
      <span id="skyjet-zoom-text" style="font-size: 13px; font-weight: 600; min-width: 45px; text-align: center; color: #e2e8f0;">100%</span>
      <button type="button" id="skyjet-btn-zoom-in" title="Phóng to" style="background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 6px; display: flex; align-items: center; transition: color 0.15s;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></button>
      
      <div style="width: 1px; height: 20px; background: rgba(255,255,255,0.2);"></div>
      
      <!-- Modes (Crop / Draw Rect / Erase) -->
      <button type="button" id="skyjet-btn-crop" title="Cắt ảnh" style="background: rgba(255,255,255,0.08); border: none; color: #38bdf8; cursor: pointer; padding: 8px 14px; border-radius: 6px; display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; transition: all 0.15s; border: 1px solid rgba(56, 189, 248, 0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg> Cắt</button>
      <button type="button" id="skyjet-btn-rect" title="Vẽ hình chữ nhật" style="background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 8px 14px; border-radius: 6px; display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; transition: all 0.15s;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> Vẽ khung</button>
      
      <!-- Color Picker Options (Shown when in rect mode) -->
      <div id="skyjet-color-picker-container" style="display: none; align-items: center; gap: 6px; padding: 0 4px;">
        <button type="button" class="skyjet-color-dot" data-color="#ef4444" style="width: 16px; height: 16px; border-radius: 50%; background: #ef4444; border: 2px solid #fff; cursor: pointer; padding: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.3); box-sizing: border-box;"></button>
        <button type="button" class="skyjet-color-dot" data-color="#22c55e" style="width: 16px; height: 16px; border-radius: 50%; background: #22c55e; border: none; cursor: pointer; padding: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.3); box-sizing: border-box;"></button>
        <button type="button" class="skyjet-color-dot" data-color="#3b82f6" style="width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; border: none; cursor: pointer; padding: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.3); box-sizing: border-box;"></button>
        <button type="button" class="skyjet-color-dot" data-color="#eab308" style="width: 16px; height: 16px; border-radius: 50%; background: #eab308; border: none; cursor: pointer; padding: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.3); box-sizing: border-box;"></button>
        <button type="button" class="skyjet-color-dot" data-color="#000000" style="width: 16px; height: 16px; border-radius: 50%; background: #000000; border: none; cursor: pointer; padding: 0; box-shadow: 0 0 0 1px rgba(255,255,255,0.3); box-sizing: border-box;"></button>
      </div>

      <button type="button" id="skyjet-btn-erase" title="Tẩy khung" style="background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 8px 14px; border-radius: 6px; display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; transition: all 0.15s;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H4"></path><path d="M20 7.3a2 2 0 0 0 0-2.8l-2.5-2.5a2 2 0 0 0-2.8 0L3 13.7v5.6h5.6L20 7.3z"></path></svg> Tẩy</button>
      
      <div style="width: 1px; height: 20px; background: rgba(255,255,255,0.2);"></div>
      
      <!-- Apply / Reset for Crop (Only visible when active crop selection exists) -->
      <button type="button" id="skyjet-btn-apply-crop" title="Áp dụng cắt" style="display: none; background: #0284c7; border: none; color: #fff; cursor: pointer; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; transition: background 0.15s; outline: none;">Áp dụng cắt</button>
      
      <!-- Actions -->
      <button type="button" id="skyjet-btn-cancel" style="background: rgba(255,255,255,0.1); border: none; color: #cbd5e1; cursor: pointer; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; transition: background 0.15s; outline: none;">Hủy</button>
      <button type="button" id="skyjet-btn-save" style="background: #10b981; border: none; color: #fff; cursor: pointer; padding: 8px 20px; border-radius: 9999px; font-size: 13px; font-weight: 600; transition: background 0.15s; box-shadow: 0 4px 6px -1px rgba(16,185,129,0.3); outline: none;">Lưu ảnh</button>
    </div>
  `;

  const canvas = overlay.querySelector('#skyjet-paint-canvas');
  const overlayDiv = overlay.querySelector('#skyjet-selection-overlay');
  const canvasContainer = overlay.querySelector('#skyjet-canvas-container');
  const ctx = canvas.getContext('2d');
  
  let scale = 1.0;
  let mode = 'crop'; // 'crop' | 'rect' | 'eraser'
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  
  // Crop area coordinates relative to canvas
  let cropSelection = null; // { x, y, w, h }
  // Drawn rectangles list relative to original image size
  let drawnRects = []; 
  let selectedColor = '#ef4444';
  
  function updateZoom(newScale) {
    scale = Math.max(0.1, Math.min(3.0, newScale));
    canvasContainer.style.transform = "scale(" + scale + ")";
    zoomText.innerText = Math.round(scale * 100) + '%';
  }
  
  const img = new Image();
  img.onload = () => {
    // Setup canvas size
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    redraw();

    // Auto-fit to viewport height and width
    const maxW = window.innerWidth - 80;
    const maxH = window.innerHeight - 140; // leaving safe room for the toolbar at bottom
    const fitScale = Math.min(1.0, maxW / img.naturalWidth, maxH / img.naturalHeight);
    updateZoom(fitScale);
  };
  img.src = croppedDataUrl;
 
  function redraw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    
    // Draw all completed rectangles
    drawnRects.forEach(r => {
      ctx.strokeStyle = r.color || '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    });

    // Draw active drawing element if in rect mode
    if (isDragging && mode === 'rect') {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    }
    
    // Draw crop outline if in crop mode and has selection
    if (mode === 'crop' && cropSelection) {
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cropSelection.x, cropSelection.y, cropSelection.w, cropSelection.h);
      ctx.setLineDash([]);
      
      // Draw semi-transparent overlay outside crop area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      // Top
      ctx.fillRect(0, 0, canvas.width, cropSelection.y);
      // Bottom
      ctx.fillRect(0, cropSelection.y + cropSelection.h, canvas.width, canvas.height - (cropSelection.y + cropSelection.h));
      // Left
      ctx.fillRect(0, cropSelection.y, cropSelection.x, cropSelection.h);
      // Right
      ctx.fillRect(cropSelection.x + cropSelection.w, cropSelection.y, canvas.width - (cropSelection.x + cropSelection.w), cropSelection.h);
    }
  }

  // Zoom logic
  const zoomInBtn = overlay.querySelector('#skyjet-btn-zoom-in');
  const zoomOutBtn = overlay.querySelector('#skyjet-btn-zoom-out');
  const zoomText = overlay.querySelector('#skyjet-zoom-text');
  
  zoomInBtn.addEventListener('click', () => updateZoom(scale + 0.15));
  zoomOutBtn.addEventListener('click', () => updateZoom(scale - 0.15));

  // Mode Toggles
  const btnCrop = overlay.querySelector('#skyjet-btn-crop');
  const btnRect = overlay.querySelector('#skyjet-btn-rect');
  const btnErase = overlay.querySelector('#skyjet-btn-erase');
  const btnApplyCrop = overlay.querySelector('#skyjet-btn-apply-crop');
  const colorPickerContainer = overlay.querySelector('#skyjet-color-picker-container');

  const setMode = (newMode) => {
    mode = newMode;
    cropSelection = null;
    btnApplyCrop.style.display = 'none';
    
    [btnCrop, btnRect, btnErase].forEach(btn => {
      btn.style.background = 'none';
      btn.style.border = 'none';
      btn.style.color = '#cbd5e1';
    });
    
    colorPickerContainer.style.display = (mode === 'rect') ? 'flex' : 'none';
    
    if (mode === 'crop') {
      btnCrop.style.background = 'rgba(255, 255, 255, 0.08)';
      btnCrop.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      btnCrop.style.color = '#38bdf8';
    } else if (mode === 'rect') {
      btnRect.style.background = 'rgba(255, 255, 255, 0.08)';
      btnRect.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      btnRect.style.color = '#38bdf8';
    } else if (mode === 'eraser') {
      btnErase.style.background = 'rgba(255, 255, 255, 0.08)';
      btnErase.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      btnErase.style.color = '#38bdf8';
    }
    redraw();
  };

  btnCrop.addEventListener('click', () => setMode('crop'));
  btnRect.addEventListener('click', () => setMode('rect'));
  btnErase.addEventListener('click', () => setMode('eraser'));

  // Color picker selection dots
  const colorDots = overlay.querySelectorAll('.skyjet-color-dot');
  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      selectedColor = dot.getAttribute('data-color');
      colorDots.forEach(d => {
        d.style.border = 'none';
      });
      dot.style.border = '2px solid #fff';
    });
  });

  // Drawing and selection logic on overlay overlayDiv
  const getCanvasCoords = (e) => {
    const cRect = canvas.getBoundingClientRect();
    if (cRect.width === 0 || cRect.height === 0) return { x: 0, y: 0 };
    const x = (e.clientX - cRect.left) * (canvas.width / cRect.width);
    const y = (e.clientY - cRect.top) * (canvas.height / cRect.height);
    return {
      x: Math.max(0, Math.min(canvas.width, x)),
      y: Math.max(0, Math.min(canvas.height, y))
    };
  };

  const eraseAt = (coords) => {
    const threshold = 12;
    const originalLen = drawnRects.length;
    drawnRects = drawnRects.filter(rect => {
      const nearTop = Math.abs(coords.y - rect.y) < threshold && coords.x >= rect.x - threshold && coords.x <= rect.x + rect.w + threshold;
      const nearBottom = Math.abs(coords.y - (rect.y + rect.h)) < threshold && coords.x >= rect.x - threshold && coords.x <= rect.x + rect.w + threshold;
      const nearLeft = Math.abs(coords.x - rect.x) < threshold && coords.y >= rect.y - threshold && coords.y <= rect.y + rect.h + threshold;
      const nearRight = Math.abs(coords.x - (rect.x + rect.w)) < threshold && coords.x >= rect.x - threshold && coords.x <= rect.x + rect.w + threshold;
      const isInside = coords.x >= rect.x && coords.x <= rect.x + rect.w && coords.y >= rect.y && coords.y <= rect.y + rect.h;
      return !(nearTop || nearBottom || nearLeft || nearRight || (rect.w < 30 && rect.h < 30 && isInside));
    });
    if (drawnRects.length !== originalLen) {
      redraw();
    }
  };

  overlayDiv.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left click
    isDragging = true;
    const coords = getCanvasCoords(e);
    startX = coords.x;
    startY = coords.y;
    currentX = coords.x;
    currentY = coords.y;
    
    if (mode === 'eraser') {
      eraseAt(coords);
    }
  });

  overlayDiv.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const coords = getCanvasCoords(e);
    currentX = coords.x;
    currentY = coords.y;

    if (mode === 'crop') {
      const w = Math.abs(currentX - startX);
      const h = Math.abs(currentY - startY);
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      if (w > 5 && h > 5) {
        cropSelection = { x, y, w, h };
        btnApplyCrop.style.display = 'inline-block';
      }
    } else if (mode === 'eraser') {
      eraseAt(coords);
    }
    redraw();
  });

  overlayDiv.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    
    if (mode === 'rect') {
      const w = Math.abs(currentX - startX);
      const h = Math.abs(currentY - startY);
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      if (w > 5 && h > 5) {
        drawnRects.push({ x, y, w, h, color: selectedColor });
      }
    }
    redraw();
  });

  // Apply Crop Action
  btnApplyCrop.addEventListener('click', () => {
    if (!cropSelection || !ctx) return;
    
    // Create temporary canvas to hold cropped image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropSelection.w;
    tempCanvas.height = cropSelection.h;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCtx.drawImage(canvas, cropSelection.x, cropSelection.y, cropSelection.w, cropSelection.h, 0, 0, cropSelection.w, cropSelection.h);
    
    // Reload canvas with cropped image
    const croppedUrl = tempCanvas.toDataURL('image/png');
    img.src = croppedUrl; // Trigger reload
    
    // Reset crop selection and drawn rects mapped relative to old sizes
    cropSelection = null;
    drawnRects = []; 
    btnApplyCrop.style.display = 'none';
  });

  // Actions
  const btnCancel = overlay.querySelector('#skyjet-btn-cancel');
  const btnSave = overlay.querySelector('#skyjet-btn-save');
  
  const close = () => {
    document.body.style.overflow = originalOverflow;
    overlay.remove();
  };
  btnCancel.addEventListener('click', close);
  
  btnSave.addEventListener('click', () => {
    try {
      const finalUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'skyjet-card-' + Date.now() + '.png';
      link.href = finalUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      close();
    } catch (err) {
      console.error('Lỗi khi tải ảnh: ', err);
      alert('Lỗi tải ảnh về: ' + err.message);
    }
  });

  document.body.appendChild(overlay);
}

function applyVisibilitySettings() {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    if (!chrome.runtime || !chrome.runtime.id) return;
    
    chrome.storage.local.get(['hiddenSections', 'sectionOrder', 'customShortcuts', 'skyjet_hide_nav', 'skyjet_dark_mode'], (result) => {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
      if (chrome.runtime.lastError) return;

      if (result.skyjet_dark_mode === true) {
        document.documentElement.classList.add('skyjet-dark-mode');
        document.body.classList.add('skyjet-dark-mode');
      } else {
        document.documentElement.classList.remove('skyjet-dark-mode');
        document.body.classList.remove('skyjet-dark-mode');
      }
      
      if (result.skyjet_hide_nav === true) {
        chrome.storage.local.remove('skyjet_hide_nav');
    const tryHide = collapseLeftSidebar;
        tryHide();
        setTimeout(tryHide, 100);
        setTimeout(tryHide, 300);
        setTimeout(tryHide, 800);
        setTimeout(tryHide, 1500);
      }
      
      const hiddenSections = result.hiddenSections || [];
      const sectionOrder = result.sectionOrder || [];
      const customShortcuts = result.customShortcuts || [];

      // 1. Xóa phím tắt tự tạo cũ để tránh lặp
      document.querySelectorAll('.skyjet-custom-shortcut').forEach(el => el.remove());

      // 2. Tìm một mục gốc làm template để nhân bản
      const rowDivsBefore = Array.from(document.querySelectorAll('.row > div'));
      const templateDiv = rowDivsBefore.find(div => {
        const title = getStableTitle(div);
        return title !== null && !div.classList.contains('skyjet-custom-shortcut');
      });

      if (templateDiv && customShortcuts.length > 0) {
        const parent = templateDiv.parentNode;
        customShortcuts.forEach(sc => {
          const clone = templateDiv.cloneNode(true);
          clone.classList.add('skyjet-custom-shortcut');
          clone.dataset.title = sc.title;

          // Cập nhật tất cả thẻ a dẫn đến URL tự cấu hình
          const links = clone.querySelectorAll('a');
          links.forEach(a => {
            let targetUrl = sc.url;
            if (targetUrl.includes('?')) {
              targetUrl += '&skyjet_hide_nav=true';
            } else {
              targetUrl += '?skyjet_hide_nav=true';
            }
            a.href = targetUrl;
            a.addEventListener('click', () => {
              safeSetSession('skyjet_hide_nav', 'true');
              collapseLeftSidebar();
            });
          });

          // Cập nhật text tiêu đề trong thẻ con
          const origTitle = getStableTitle(templateDiv);
          const headerElements = clone.querySelectorAll('h3, h4, h5, p, span, div');
          headerElements.forEach(el => {
            if (el.children.length === 0) {
              if (el.innerText.includes(origTitle)) {
                el.innerText = el.innerText.replace(origTitle, sc.title);
              } else if (el.innerText.trim() !== '') {
                el.innerText = sc.title;
              }
            }
          });

          // Ẩn badge đếm số lượng nếu có
          const countEl = clone.querySelector('.count, .badge, .label');
          if (countEl) {
            countEl.style.display = 'none';
          }

          parent.appendChild(clone);
        });
      }

      // 3. Quét lại toàn bộ các mục (gồm cả phím tắt tự tạo mới)
      const rowDivs = Array.from(document.querySelectorAll('.row > div'));
      const menuDivs = [];
      const discovered = [];
      rowDivs.forEach((div, index) => {
        const title = getStableTitle(div, index);
        if (title) {
          const a = div.querySelector('a');
          const href = a ? a.href : '';
          discovered.push({ title, url: href });
          menuDivs.push({ div, title });
        }
      });
      if (discovered.length > 0) {
        chrome.storage.local.set({ discoveredSections: discovered });
      }

      if (menuDivs.length === 0) return;

      // Áp dụng ẩn hiện
      menuDivs.forEach(item => {
        const shouldHide = hiddenSections.includes(item.title);
        item.div.style.display = shouldHide ? 'none' : '';
      });

      // Áp dụng thứ tự sắp xếp
      if (sectionOrder.length > 0) {
        menuDivs.sort((a, b) => {
          let indexA = sectionOrder.indexOf(a.title);
          let indexB = sectionOrder.indexOf(b.title);
          if (indexA === -1) indexA = 999;
          if (indexB === -1) indexB = 999;
          return indexA - indexB;
        });
        
        const parent = menuDivs[0].div.parentNode;
        if (parent) {
          menuDivs.forEach(item => {
            parent.appendChild(item.div);
          });
        }
      }
    });
  } catch (e) {
    // Tiện ích đã bị tải lại/vô hiệu hóa, bỏ qua lỗi context invalidated
  }
}

// Helper to convert DD/MM/YYYY to YYYY-MM-DD for standard input type="date"
function convertToYmd(dateStr) {
  console.log('[Skyjet Helper] convertToYmd input:', JSON.stringify(dateStr));
  if (!dateStr) return '';
  const clean = dateStr.trim();
  
  // Pattern 1: Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    console.log('[Skyjet Helper] Already YYYY-MM-DD:', clean);
    return clean;
  }
  
  // Pattern 2: DD/MM/YYYY or D/M/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].length === 1 ? '0' + dmyMatch[1] : dmyMatch[1];
    const month = dmyMatch[2].length === 1 ? '0' + dmyMatch[2] : dmyMatch[2];
    const year = dmyMatch[3];
    const res = year + '-' + month + '-' + day;
    console.log('[Skyjet Helper] parsed DD/MM/YYYY match:', res);
    return res;
  }
  
  // Pattern 3: YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].length === 1 ? '0' + ymdMatch[2] : ymdMatch[2];
    const day = ymdMatch[3].length === 1 ? '0' + ymdMatch[3] : ymdMatch[3];
    const res = year + '-' + month + '-' + day;
    console.log('[Skyjet Helper] parsed YYYY/MM/DD match:', res);
    return res;
  }
  
  console.warn('[Skyjet Helper] convertToYmd fallback (not parsed):', clean);
  return clean;
}

// Auto fill and trigger search in SearchTransaction page
function handleSearchTransactionQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const agentId = urlParams.get('skyjetAgentId');
  if (!agentId) return;

  const dateRangeVal = urlParams.get('skyjetDateRange');
  const fromDateVal = urlParams.get('skyjetFromDate');
  const toDateVal = urlParams.get('skyjetToDate');

  // Xử lý một lần duy nhất, xoá các tham số tự động để tránh lặp vô hạn khi khách tải lại trang thủ công
  const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + 
    window.location.search
      .replace(/[?&]skyjetAgentId=[^&]+/, '')
      .replace(/[?&]skyjetDateRange=[^&]+/, '')
      .replace(/[?&]skyjetFromDate=[^&]+/, '')
      .replace(/[?&]skyjetToDate=[^&]+/, '')
      .replace(/^&/, '?')
      .replace(/[?]$/, '');
  
  window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

  const performAutoSearch = () => {
    // 1. Tìm và điền mã đại lý
    let selectEl = document.querySelector('select[id*="agent" i], select[id*="Agent" i], select[id*="customer" i], select[name*="agent" i], select[name*="Agent" i], #AgentId, #agent-id, #AgentCode, #agent_id');
    if (!selectEl) {
      selectEl = Array.from(document.querySelectorAll('select')).find(sel => {
        return Array.from(sel.options).some(opt => opt.value === agentId || opt.value.includes(agentId));
      }) || null;
    }

    if (selectEl) {
      selectEl.value = agentId;
      const matchOpt = Array.from(selectEl.options).find(opt => opt.value === agentId || opt.value.includes(agentId));
      if (matchOpt) {
        selectEl.value = matchOpt.value;
      }
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));

      // Hỗ trợ thư viện select2 của bên thứ 3
      const gJquery = window.$ || window.jQuery;
      if (gJquery && gJquery(selectEl).data('select2')) {
        gJquery(selectEl).val(selectEl.value).trigger('change');
      }
    } else {
      const textInput = document.querySelector('input[id*="agent" i], input[id*="Agent" i], input[placeholder*="đại lý" i], input[placeholder*="Đại lý" i], input[placeholder*="khách" i], input[placeholder*="Khách" i]');
      if (textInput) {
        textInput.value = agentId;
        textInput.dispatchEvent(new Event('input', { bubbles: true }));
        textInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 2. Điền khoảng thời gian
    if (dateRangeVal) {
      const dateRangeInp = document.querySelector('input.date-range, input.datepicker, input[id*="date-send-request"], input[id*="range" i]');
      if (dateRangeInp) {
        const isDateType = dateRangeInp.type === 'date';
        if (!isDateType) {
          dateRangeInp.value = dateRangeVal;
          dateRangeInp.dispatchEvent(new Event('input', { bubbles: true }));
          dateRangeInp.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const gJquery = window.$ || window.jQuery;
        const momentLib = window.moment;
        if (gJquery) {
          const picker = gJquery(dateRangeInp).data('daterangepicker');
          if (picker && momentLib) {
            const parts = dateRangeVal.split(/s*[-~]s*/);
            if (parts.length === 2) {
              picker.setStartDate(momentLib(parts[0], 'DD/MM/YYYY'));
              picker.setEndDate(momentLib(parts[1], 'DD/MM/YYYY'));
            }
          }
        }
      }
    }

    if (fromDateVal && toDateVal) {
      console.log('[Skyjet Helper] Detected date parameters in URL. From date raw:', JSON.stringify(fromDateVal), 'To date raw:', JSON.stringify(toDateVal));
      const fromInp = document.querySelector('input[id*="from" i], input[name*="from" i], input[id*="tu" i], input[name*="tu" i]');
      const toInp = document.querySelector('input[id*="to" i], input[name*="to" i], input[id*="den" i], input[name*="den" i]');
      
      if (fromInp && toInp) {
        const isFromDateType = fromInp.type === 'date';
        const isToDateType = toInp.type === 'date';
        console.log('[Skyjet Helper] Found inputs on page.', 'fromInp element:', fromInp, 'isDate:', isFromDateType, 'toInp element:', toInp, 'isDate:', isToDateType);

        const convertedFrom = isFromDateType ? convertToYmd(fromDateVal) : fromDateVal;
        const convertedTo = isToDateType ? convertToYmd(toDateVal) : toDateVal;

        console.log('[Skyjet Helper] Target values to set:', 'from:', JSON.stringify(convertedFrom), 'to:', JSON.stringify(convertedTo));
        
        fromInp.value = convertedFrom;
        toInp.value = convertedTo;

        fromInp.dispatchEvent(new Event('input', { bubbles: true }));
        fromInp.dispatchEvent(new Event('change', { bubbles: true }));
        toInp.dispatchEvent(new Event('input', { bubbles: true }));
        toInp.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('[Skyjet Helper] Assigned values successfully to inputs.');
      } else {
        console.error('[Skyjet Helper] Could not locate either fromDate input or toDate input on the page!', { fromInp, toInp });
      }
    }

    // 3. Tự động click tìm kiếm sau 700ms để đảm bảo các thành phần đã sẵn sàng
    setTimeout(() => {
      const searchBtn = document.querySelector('button[id*="search" i], button[id*="btn" i], input[type="submit"], #searchBtn, #btnSearch, .btn-search');
      if (searchBtn) {
        searchBtn.click();
      }
    }, 700);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', performAutoSearch);
  } else {
    setTimeout(performAutoSearch, 400);
  }
}

// Decorate agency sales table (gridItem) column: Mã đại lý
function processAgencySalesTable() {
  if (window.location.pathname.toLowerCase().includes('/orderreportarea/orderreport/searchallorder')) return;
  const table = document.getElementById('gridItem');
  if (!table) return;
  
  // Check if it's indeed the AgencySales table containing "Mã đại lý"
  const headers = Array.from(table.querySelectorAll('thead th'));
  let agentCodeIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    const text = headers[i].innerText.trim().toLowerCase();
    if (text === 'mã đại lý' || text.includes('mã đại lý') || text.includes('mã dl') || text.includes('mã đại lí')) {
      agentCodeIndex = i;
      break;
    }
  }
  
  if (agentCodeIndex === -1) {
    return; // This gridItem belongs to a different report or page
  }

  // Get date range input value to pass it along
  let fromDate = '';
  let toDate = '';
  const dateInput = document.getElementById('date-send-request') || document.querySelector('.datepicker.date-range') || document.querySelector('.date-range') || document.querySelector('input[name*="date" i]');
  if (dateInput && 'value' in dateInput) {
    const val = (dateInput.value || '').trim();
    const parts = val.split(/\s*[-~]\s*/);
    if (parts.length === 2) {
      fromDate = parts[0];
      toDate = parts[1];
    }
  }
  
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length > agentCodeIndex) {
      const td = cells[agentCodeIndex];
      const agentCode = td.innerText.trim();
      
      // Decorate row if valid agent code and not already decorated, not summarizing row
      if (agentCode && agentCode.length >= 3 && !td.querySelector('.skyjet-agent-btn') && !agentCode.includes('Tổng') && !agentCode.includes('TỔNG')) {
        td.innerHTML = ''; // Clear text
        
        const btn = document.createElement('a');
        btn.className = 'skyjet-agent-btn';
        btn.target = '_blank';
        
        let href = '/AgentArea/Agent/SearchTransaction?&i=8&skyjetAgentId=' + encodeURIComponent(agentCode);
        if (fromDate && toDate) {
          href += '&skyjetFromDate=' + encodeURIComponent(fromDate) + '&skyjetToDate=' + encodeURIComponent(toDate);
        }
        href += '&skyjet_hide_nav=true';
        btn.href = href;
        btn.addEventListener('click', (e) => {
          // Allow opening the tab, but prevent table double firing or bubble issues
          e.stopPropagation();
        });
        
        // Apply pristine inline styling to match Skyjet style perfectly
        btn.style.color = '#0284c7';
        btn.style.fontWeight = '700';
        btn.style.textDecoration = 'none';
        btn.style.borderBottom = '1px dashed #0284c7';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.15s ease';
        
        btn.addEventListener('mouseenter', () => {
          btn.style.color = '#0369a1';
          btn.style.borderBottom = '1px solid #0369a1';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.color = '#0284c7';
          btn.style.borderBottom = '1px dashed #0284c7';
        });
        
        btn.innerText = agentCode;
        td.appendChild(btn);
      }
    }
  });
}

// Tự động xoá cột "Mã KH" khỏi bảng tra cứu công nợ theo yêu cầu của người dùng
function removeCustomerCodeColumn() {
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th, tr:first-child td'));
    let colIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      const text = headers[i].innerText.trim().toLowerCase();
      if (text === 'mã kh' || text === 'mã khách hàng' || text === 'ma kh') {
        colIndex = i;
        break;
      }
    }
    if (colIndex !== -1) {
      const headRows = table.querySelectorAll('thead tr, tr:has(th)');
      headRows.forEach(tr => {
        if (tr.cells[colIndex]) {
          tr.cells[colIndex].style.display = 'none';
        }
      });
      const rows = table.querySelectorAll('tbody tr, tr');
      rows.forEach(tr => {
        if (tr.cells[colIndex] && tr.querySelector('td')) {
          tr.cells[colIndex].style.display = 'none';
        }
      });
      const footRows = table.querySelectorAll('tfoot tr');
      footRows.forEach(tr => {
        if (tr.cells[colIndex]) {
          tr.cells[colIndex].style.display = 'none';
        }
      });
    }
  });
}

// Ẩn cột Ngày xuất nếu tất cả các dòng đều có Ngày xuất trùng với Ngày chứng từ (coi 1900/rỗng là bằng Ngày chứng từ)
function hideDuplicateDates() {
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (!headerRow) return;
    const headers = Array.from(headerRow.cells || headerRow.querySelectorAll('th, td'));
    let docDateIdx = -1;
    let issueDateIdx = -1;
    for (let i = 0; i < headers.length; i++) {
      const text = headers[i].innerText.trim().toLowerCase();
      if (text === 'ngày chứng từ' || text === 'ngày ct' || text === 'ngày hạch toán' || text === 'ngày lập') {
        docDateIdx = i;
      }
      if (text === 'ngày xuất' || text === 'ngày xuất vé' || text === 'ngày xuất hđ') {
        issueDateIdx = i;
      }
    }
    
    if (docDateIdx !== -1 && issueDateIdx !== -1) {
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const dataRows = rows.filter(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length <= Math.max(docDateIdx, issueDateIdx)) return false;
        const text = row.innerText.toLowerCase();
        return !text.includes('tổng') && !text.includes('cộng') && cells[docDateIdx].innerText.trim() !== '';
      });
      
      if (dataRows.length === 0) return;
      
      let allIdentical = true;
      for (const row of dataRows) {
        const cells = row.querySelectorAll('td');
        const d = cells[docDateIdx].innerText.trim();
        let i = cells[issueDateIdx].innerText.trim();
        
        if (!i || i === '01/01/1900' || i.includes('1900')) {
          i = d;
        }
        
        if (d !== i) {
          allIdentical = false;
          break;
        }
      }
      
      const displayVal = allIdentical ? 'none' : '';
      
      // Ẩn/hiện tiêu đề cột
      const headRows = table.querySelectorAll('thead tr, tr:has(th)');
      headRows.forEach(tr => {
        if (tr.cells[issueDateIdx]) {
          tr.cells[issueDateIdx].style.display = displayVal;
        }
      });
      
      // Ẩn/hiện dữ liệu các dòng
      rows.forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length > issueDateIdx) {
          cells[issueDateIdx].style.display = displayVal;
          // Nếu không ẩn, và ngày xuất là rỗng/1900, hiển thị bằng ngày chứng từ
          if (!allIdentical && cells.length > docDateIdx) {
            let i = cells[issueDateIdx].innerText.trim();
            if (!i || i === '01/01/1900' || i.includes('1900')) {
              const d = cells[docDateIdx].innerText.trim();
              cells[issueDateIdx].innerText = d;
            }
          }
        }
      });
      
      // Ẩn/hiện dòng chân trang (tfoot)
      const footRows = table.querySelectorAll('tfoot tr');
      footRows.forEach(tr => {
        if (tr.cells[issueDateIdx]) {
          tr.cells[issueDateIdx].style.display = displayVal;
        }
      });
    }
  });
}

// Rút gọn cột Chứng từ nếu ngày trong Chứng từ trùng với Ngày chứng từ
function shortenDocumentPrefix() {
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (!headerRow) return;
    const headers = Array.from(headerRow.cells || headerRow.querySelectorAll('th, td'));
    let docTypeIdx = -1;
    let docDateIdx = -1;
    for (let i = 0; i < headers.length; i++) {
      const text = headers[i].innerText.replace(/\s+/g, ' ').trim().toLowerCase();
      if (text.includes('ngày chứng từ') || text.includes('ngày ct') || text.includes('ngày hạch toán') || text.includes('ngày lập')) {
        docDateIdx = i;
      } else if (text === 'chứng từ' || text === 'chung tu' || text.includes('chứng từ') || text.includes('chung tu') || text === 'loại ct' || text === 'mã ct') {
        docTypeIdx = i;
      }
    }

    if (docTypeIdx !== -1 && docDateIdx !== -1) {
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > Math.max(docTypeIdx, docDateIdx)) {
          const docTypeCell = cells[docTypeIdx];
          const docDateCell = cells[docDateIdx];
          
          const docTypeText = docTypeCell.innerText.replace(/[\s\u00a0]+/g, ' ').trim();
          const docDateText = docDateCell.innerText.replace(/[\s\u00a0]+/g, ' ').trim();
          
          if (docTypeText && docDateText) {
            // Tìm định dạng ngày YYYY-MM-XX trong Chứng từ (chấp nhận chữ/số cho ngày để bắt lỗi gõ sai như T3)
            const dateMatch = docTypeText.match(/\d{4}-\d{2}-[a-zA-Z0-9]{2}/);
            if (dateMatch) {
              const docTypeDateStr = dateMatch[0]; // Ví dụ: "2026-06-13" hoặc "2026-06-T3"
              // Chuyển sang định dạng DD/MM/YYYY để so khớp với Ngày chứng từ
              const parts = docTypeDateStr.split('-');
              const day = parts[2].replace(/T/i, '1'); // Chuẩn hóa chữ T (ví dụ T3 -> 13)
              const convertedDate = day + '/' + parts[1] + '/' + parts[0];
              if (docDateText.includes(convertedDate)) {
                // Thay thế phần ngày trong tất cả text nodes của ô Chứng từ
                const walker = document.createTreeWalker(docTypeCell, NodeFilter.SHOW_TEXT, null);
                let node;
                while (node = walker.nextNode()) {
                  if (node.nodeValue.includes(docTypeDateStr)) {
                    node.nodeValue = node.nodeValue.replace(docTypeDateStr, '').trim();
                  }
                }
              }
            }
          }
        }
      });
    }
  });
}

// Tự động điền và bấm tìm kiếm khi có tham số skyjetAutoSearch được chuyển hướng đến từ báo cáo công nợ
function handleAutoSearchQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  // Có thể tìm theo skyjetAutoSearch, TicketNumber, hoặc OrderReferenceId làm từ khóa tự động tra cứu từ đầu
  const autoSearchVal = urlParams.get('skyjetAutoSearch') || urlParams.get('TicketNumber') || urlParams.get('OrderReferenceId') || urlParams.get('pnr') || urlParams.get('code') || urlParams.get('RecordLocation');
  if (!autoSearchVal) return;

  // Xử lý một lần duy nhất, xoá các tham số tìm kiếm tự động để tránh lặp vô hạn khi khách tải lại trang thủ công
  const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + 
    window.location.search
      .replace(/[?&]skyjetAutoSearch=[^&]+/, '')
      .replace(/[?&]TicketNumber=[^&]+/, '')
      .replace(/[?&]OrderReferenceId=[^&]+/, '')
      .replace(/[?&]pnr=[^&]+/, '')
      .replace(/[?&]code=[^&]+/, '')
      .replace(/[?&]RecordLocation=[^&]+/, '')
      .replace(/^&/, '?')
      .replace(/[?]$/, '');
  
  window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

  const performSearch = () => {
    // Tìm ô nhập Số vé/PNR dựa vào placeholder tiếng Việt hoặc ID/name phổ quát
    let input = document.querySelector('input[placeholder*="Số vé"], input[placeholder*="PNR"], input[placeholder*="pnr"], #TicketNumber, #TicketNo, #searchKey, #SearchKey, input[name*="val"], input[name*="search"], input[name*="Ticket"], #record-location, input[name="RecordLocation"], #recordlocation-to-open');
    
    if (!input) {
      const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      input = allInputs.find(inp => {
        const ph = (inp.placeholder || '').toLowerCase();
        return ph.includes('số vé') || ph.includes('pnr') || ph.includes('nhập') || ph.includes('vé');
      }) || allInputs[0];
    }

    if (input) {
      input.value = autoSearchVal;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Tìm nút bấm "Tìm Kiếm" hoặc "Tìm kiếm"
      let btn = document.getElementById('btn-search-booking') || document.querySelector('#btn-search-booking');
      if (!btn) {
        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn'));
        btn = buttons.find(b => {
          const txt = (b.innerText || b.value || '').trim().toLowerCase();
          return txt.includes('tìm kiếm') || txt.includes('tra cứu') || txt.includes('search');
        });
      }

      if (btn) {
        setTimeout(() => {
          btn.click();
        }, 500);
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', performSearch);
  } else {
    setTimeout(performSearch, 400);
  }
}

// Tự động thêm nút "Kiểm tra" vào trang tìm kiếm giao dịch công nợ
function handleSearchTransactionCheck() {
  const table = document.getElementById('tableContent');
  if (!table) return;

  const headers = Array.from(table.querySelectorAll('thead th'));
  let orderCodeIndex = findHeaderIndex(headers, ['mã đơn hàng'], ['đơn hàng', 'mã đh']);
  if (orderCodeIndex === -1) orderCodeIndex = 5;

  let checkBtn = document.getElementById('skyjet-check-btn');
  if (!checkBtn) {
    // Tìm phần tử chứa tiêu đề "Danh sách công nợ hiện tại"
    let titleEl = null;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, p, span, strong'));
    for (const el of headings) {
      if (el.innerText.trim().includes('Danh sách công nợ hiện tại')) {
        const hasBlockChildren = Array.from(el.children).some(child => ['DIV', 'P', 'TABLE', 'UL', 'OL'].includes(child.tagName));
        if (!hasBlockChildren) {
          titleEl = el;
          break;
        }
      }
    }

    if (!titleEl) {
      // Fallback: Tìm thẻ tiêu đề gần bảng tableContent nhất
      titleEl = document.querySelector('h1, h2, h3, h4, h5, h6, .x_title, .title_left');
    }

    if (titleEl) {
      checkBtn = document.createElement('button');
      checkBtn.type = 'button';
      checkBtn.id = 'skyjet-check-btn';
      checkBtn.className = 'btn btn-info';
      checkBtn.innerHTML = '<i class="fa fa-check-circle"></i> Kiểm tra';
      checkBtn.style.marginLeft = '12px';
      checkBtn.style.fontWeight = 'bold';
      checkBtn.style.backgroundColor = '#17a2b8';
      checkBtn.style.borderColor = '#17a2b8';
      checkBtn.style.color = '#ffffff';
      checkBtn.style.verticalAlign = 'middle';
      checkBtn.style.padding = '4px 10px';
      checkBtn.style.fontSize = '12px';

      checkBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await performTransactionChecking(checkBtn, table);
      });

      // Chèn nút ngay sau phần tử tiêu đề hoặc kế bên text
      if (titleEl.tagName === 'STRONG' || titleEl.tagName === 'SPAN') {
        if (titleEl.parentNode) {
          titleEl.parentNode.insertBefore(checkBtn, titleEl.nextSibling);
        }
      } else {
        titleEl.style.display = 'inline-block';
        titleEl.appendChild(checkBtn);
      }
    }
  }

  // Tự động tải dữ liệu nếu check này true
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['skyjet_auto_download'], async (res) => {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
        if (chrome.runtime.lastError) return;
        if (res && res.skyjet_auto_download) {
          const visibleRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => {
            return row.style.display !== 'none' && row.offsetHeight > 0;
          });

          let signature = '';
          visibleRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const codeVal = cells[orderCodeIndex]?.innerText?.trim() || '';
            let cleanCode = cells[orderCodeIndex]?.querySelector('.skyjet-btn span')?.innerText?.trim() || codeVal;
            if (cleanCode) cleanCode = cleanCode.split('*')[0].trim();
            const ticketNum = getTicketNumFromRow(row, headers);
            signature += cleanCode + ':' + ticketNum + '|';
          });

          if (signature && table.dataset.skyjetAutoDownloadedHash !== signature) {
            table.dataset.skyjetAutoDownloadedHash = signature;
            const currentBtn = document.getElementById('skyjet-check-btn') || checkBtn;
            if (currentBtn) {
              await performTransactionChecking(currentBtn, table, true);
            }
          }
        }
      });
    }
  } catch (e) {
    // Context invalidated
  }
}

function getTicketNumFromRow(row, headers) {
  const cells = row.querySelectorAll('td');
  let soVeColIdx = -1;
  if (headers) {
    soVeColIdx = findHeaderIndex(headers, ['số vé', 'so ve']);
  }
  if (soVeColIdx === -1) {
    soVeColIdx = 8;
  }
  return cells[soVeColIdx]?.innerText?.trim() || '';
}

async function performTransactionChecking(btn, table, isAutoLoad = false) {
  let hasLoginError = false;
  const headers = Array.from(table.querySelectorAll('thead th'));
  let orderCodeIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    const text = headers[i].innerText.trim().toLowerCase();
    if (text === 'mã đơn hàng' || text.includes('đơn hàng') || text.includes('mã đh')) {
      orderCodeIndex = i;
      break;
    }
  }
  if (orderCodeIndex === -1) {
    orderCodeIndex = 5;
  }

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  
  // Làm mới kết quả kiểm tra cũ trong cột Hạng vé
  let oldTargetClassHeaderIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].innerText.trim() === 'Hạng vé') {
      oldTargetClassHeaderIndex = i;
      break;
    }
  }
  if (oldTargetClassHeaderIndex !== -1) {
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells[oldTargetClassHeaderIndex]) {
        cells[oldTargetClassHeaderIndex].innerHTML = '';
      }
    });
  }

  // Làm mới kết quả kiểm tra cũ trong cột Loại vé (nếu có)
  let oldTargetTypeHeaderIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].innerText.trim() === 'Loại vé' && headers[i].dataset.skyjetTypeCol === "true") {
      oldTargetTypeHeaderIndex = i;
      break;
    }
  }
  if (oldTargetTypeHeaderIndex !== -1) {
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells[oldTargetTypeHeaderIndex]) {
        cells[oldTargetTypeHeaderIndex].innerHTML = '';
      }
    });
  }

  // Làm mới kết quả kiểm tra cũ trong cột Thời gian bay (nếu có)
  let oldTargetTimeHeaderIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].innerText.trim() === 'Thời gian bay' && headers[i].dataset.skyjetTimeCol === "true") {
      oldTargetTimeHeaderIndex = i;
      break;
    }
  }
  if (oldTargetTimeHeaderIndex !== -1) {
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells[oldTargetTimeHeaderIndex]) {
        cells[oldTargetTimeHeaderIndex].innerHTML = '';
      }
    });
  }

  const orderCodes = [];
  const pnrCarrierMap = new Map();
  rows.forEach(row => {
    if (row.style.display === 'none' || row.offsetHeight === 0) {
      return;
    }
    const cells = row.querySelectorAll('td');
    if (cells.length > orderCodeIndex) {
      const code = cells[orderCodeIndex].innerText.trim();
      if (code && code !== '0' && code.length >= 3 && !code.includes('Tổng') && !code.includes('TỔNG')) {
        let cleanCode = cells[orderCodeIndex].querySelector('.skyjet-btn span')?.innerText?.trim() || code;
        if (cleanCode) cleanCode = cleanCode.split('*')[0].trim();
        if (cleanCode && !orderCodes.includes(cleanCode)) {
          orderCodes.push(cleanCode);
        }
        const chungTuVal = getChungTuFromRow(row, table);
        const airlineId = mapChungTuToAirlineId(chungTuVal);
        let carrier = null;
        if (airlineId === 'VNA') carrier = 'VN';
        else if (airlineId === 'SPA') carrier = '9G';
        else if (airlineId === 'VIETJET') carrier = 'VJ';
        else if (airlineId === 'BAMBOO') carrier = 'QH';
        else if (airlineId === 'VIETRAVEL') carrier = 'VU';
        if (cleanCode && carrier) {
          pnrCarrierMap.set(cleanCode, carrier);
        }
      }
    }
  });

  if (orderCodes.length === 0) {
    alert('Không tìm thấy mã đơn hàng nào trên trang hiện tại để kiểm tra.');
    return;
  }

  const originalBtnText = btn.innerHTML;
  btn.disabled = true;

  btn.innerHTML = '<span class="skyjet-spinner" style="width:12px; height:12px; border-width:1.5px; border-top-color:#ffffff; display:inline-block; margin-right:4px;"></span> Đang truy vấn cache Supabase...';

  const pnrToTickets = new Map();
  rows.forEach(row => {
    if (row.style.display === 'none' || row.offsetHeight === 0) {
      return;
    }
    const cells = row.querySelectorAll('td');
    if (cells.length > orderCodeIndex) {
      const code = cells[orderCodeIndex].innerText.trim();
      if (code && code !== '0' && code.length >= 3 && !code.includes('Tổng') && !code.includes('TỔNG')) {
        let cleanCode = cells[orderCodeIndex].querySelector('.skyjet-btn span')?.innerText?.trim() || code;
        if (cleanCode) cleanCode = cleanCode.split('*')[0].trim();
        if (cleanCode) {
          const ticketNum = getTicketNumFromRow(row, headers);
          if (ticketNum) {
            if (!pnrToTickets.has(cleanCode)) {
              pnrToTickets.set(cleanCode, new Set());
            }
            pnrToTickets.get(cleanCode).add(ticketNum);
          }
        }
      }
    }
  });

  const allTicketNumbers = [];
  pnrToTickets.forEach((tickets) => {
    tickets.forEach(ticket => {
      if (ticket) allTicketNumbers.push(ticket);
    });
  });

  const cachedTicketsMap = new Map();
  const cachedPnrsMap = new Map();
  if (allTicketNumbers.length > 0 || orderCodes.length > 0) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const cacheResponse = await new Promise((resolve) => {
          try {
            chrome.runtime.sendMessage({
              action: 'check_ticket_cache',
              ticketNumbers: allTicketNumbers,
              pnrCodes: orderCodes
            }, (res) => {
              if (chrome.runtime.lastError) {
                console.warn('[Skyjet Helper] runtime.lastError during cache check:', chrome.runtime.lastError);
                resolve(null);
              } else {
                resolve(res);
              }
            });
          } catch (e) {
            resolve(null);
          }
        });
        if (cacheResponse && cacheResponse.success && Array.isArray(cacheResponse.data)) {
          cacheResponse.data.forEach(item => {
            if (item.ticket_number) {
              cachedTicketsMap.set(item.ticket_number, item);
            }
            if (item.pnr_code) {
              const cleanPnr = item.pnr_code.split('*')[0].trim();
              cachedPnrsMap.set(cleanPnr, item);
            }
          });
        }
      }
    } catch (err) {
      console.error('[Skyjet Helper] Lỗi khi kiểm tra cache vé từ Supabase:', err);
    }
  }

  const orderCodesToScan = [];
  const resultsMap = new Map();
  const vnaResultsMap = new Map();
  const vnaRequests = [];

  if (isAutoLoad) {
    orderCodes.forEach(code => {
      const tickets = pnrToTickets.get(code);

      const ticketList = [];
      const classes = [];
      const ticketTypes = [];
      let cachedJsonData = null;

      if (tickets && tickets.size > 0) {
        for (const tNum of tickets) {
          if (cachedTicketsMap.has(tNum)) {
            const cached = cachedTicketsMap.get(tNum);
            if (cached.ticket_class && !classes.includes(cached.ticket_class)) {
              classes.push(cached.ticket_class);
            }
            if (cached.ticket_type && !ticketTypes.includes(cached.ticket_type)) {
              ticketTypes.push(cached.ticket_type);
            }
            if (cached.json_data && !cachedJsonData) {
              cachedJsonData = cached.json_data;
            }
            ticketList.push({
              ticketNum: tNum,
              ticketClass: cached.ticket_class || '',
              ticketType: cached.ticket_type || '',
              passengerName: ''
            });
          }
        }
      }

      // Fallback/query by PNR from cachedPnrsMap:
      if (cachedPnrsMap.has(code)) {
        const cached = cachedPnrsMap.get(code);
        if (cached.ticket_class && !classes.includes(cached.ticket_class)) {
          classes.push(cached.ticket_class);
        }
        if (cached.ticket_type && !ticketTypes.includes(cached.ticket_type)) {
          ticketTypes.push(cached.ticket_type);
        }
        if (cached.json_data && !cachedJsonData) {
          cachedJsonData = cached.json_data;
        }
        if (ticketList.length === 0) {
          ticketList.push({
            ticketNum: '-',
            ticketClass: cached.ticket_class || '',
            ticketType: cached.ticket_type || '',
            passengerName: ''
          });
        }
      }

      if (ticketList.length > 0) {
        resultsMap.set(code, { ticketList, classes, ticketTypes });
      }

      if (cachedJsonData) {
        let segments = cachedJsonData;
        if (typeof segments === 'string') {
          try {
            segments = JSON.parse(segments);
          } catch (e) {}
        }
        vnaResultsMap.set(code, {
          success: true,
          data: {
            reservation: {
              originDestinationOptions: segments && segments.length > 0 ? [{ flightSegments: segments }] : [],
              passengers: []
            }
          }
        });
      }
    });

    btn.disabled = false;
    btn.innerHTML = originalBtnText;
    btn.style.backgroundColor = '#17a2b8';
    btn.style.borderColor = '#17a2b8';
    btn.style.color = '#ffffff';

  } else {
    // Manual checking: only query ERP for ticket numbers not present in Supabase cache
    orderCodes.forEach(code => {
      const tickets = pnrToTickets.get(code);
      if (!tickets || tickets.size === 0) {
        if (cachedPnrsMap.has(code)) {
          const cached = cachedPnrsMap.get(code);
          const classes = cached.ticket_class ? [cached.ticket_class] : [];
          const ticketTypes = cached.ticket_type ? [cached.ticket_type] : [];
          const ticketList = [{
            ticketNum: '-',
            ticketClass: cached.ticket_class || '',
            ticketType: cached.ticket_type || '',
            passengerName: ''
          }];
          resultsMap.set(code, { ticketList, classes, ticketTypes });
          return;
        }
        orderCodesToScan.push(code);
        return;
      }

      let allCached = true;
      const ticketList = [];
      const classes = [];
      const ticketTypes = [];

      for (const tNum of tickets) {
        if (cachedTicketsMap.has(tNum)) {
          const cached = cachedTicketsMap.get(tNum);
          if (cached.ticket_class && !classes.includes(cached.ticket_class)) {
            classes.push(cached.ticket_class);
          }
          if (cached.ticket_type && !ticketTypes.includes(cached.ticket_type)) {
            ticketTypes.push(cached.ticket_type);
          }
          ticketList.push({
            ticketNum: tNum,
            ticketClass: cached.ticket_class || '',
            ticketType: cached.ticket_type || '',
            passengerName: ''
          });
        } else {
          allCached = false;
        }
      }

      if (allCached) {
        resultsMap.set(code, { ticketList, classes, ticketTypes });
      } else {
        if (cachedPnrsMap.has(code)) {
          // If we have PNR cache, we can still use it as a partial/full mapping to avoid scanning if it's considered fully cached
          const cached = cachedPnrsMap.get(code);
          const fallbackClasses = cached.ticket_class ? [cached.ticket_class] : [];
          const fallbackTicketTypes = cached.ticket_type ? [cached.ticket_type] : [];
          resultsMap.set(code, { ticketList, classes: fallbackClasses, ticketTypes: fallbackTicketTypes });
        } else {
          orderCodesToScan.push(code);
        }
      }
    });

    const pnrHasJsonData = new Set();
    cachedTicketsMap.forEach(cached => {
      if (cached.pnr_code && cached.json_data) {
        let parsed = cached.json_data;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {}
        }
        if (parsed && parsed.length > 0) {
          pnrHasJsonData.add(cached.pnr_code);
        }
      }
    });
    cachedPnrsMap.forEach((cached, pnrCode) => {
      if (cached.json_data) {
        let parsed = cached.json_data;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {}
        }
        if (parsed && parsed.length > 0) {
          pnrHasJsonData.add(pnrCode);
        }
      }
    });

    orderCodes.forEach(code => {
      const tickets = pnrToTickets.get(code);
      let cachedJsonData = null;
      if (tickets && tickets.size > 0) {
        for (const tNum of tickets) {
          const cached = cachedTicketsMap.get(tNum);
          if (cached && cached.json_data) {
            let parsed = cached.json_data;
            if (typeof parsed === 'string') {
              try {
                parsed = JSON.parse(parsed);
              } catch (e) {}
            }
            if (parsed && parsed.length > 0) {
              cachedJsonData = parsed;
              break;
            }
          }
        }
      }
      if (!cachedJsonData && cachedPnrsMap.has(code)) {
        const cached = cachedPnrsMap.get(code);
        if (cached && cached.json_data) {
          let parsed = cached.json_data;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch (e) {}
          }
          if (parsed && parsed.length > 0) {
            cachedJsonData = parsed;
          }
        }
      }
      if (cachedJsonData) {
        vnaResultsMap.set(code, {
          success: true,
          data: {
            reservation: {
              originDestinationOptions: [{ flightSegments: cachedJsonData }],
              passengers: []
            }
          }
        });
      }
    });

    // FlightVN/VNA: only find reservation where PNR's json_data is empty/missing
    const vnaKeys = new Set();
    rows.forEach(row => {
      if (row.style.display === 'none' || row.offsetHeight === 0) {
        return;
      }
      const cells = row.querySelectorAll('td');
      if (cells.length > orderCodeIndex) {
        const code = cells[orderCodeIndex].innerText.trim();
        if (code && code !== '0' && code.length >= 3 && !code.includes('Tổng') && !code.includes('TỔNG')) {
          const rawCode = cells[orderCodeIndex].querySelector('.skyjet-btn span')?.innerText?.trim() || code;
          const hasAsterisk = rawCode.includes('*');
          let cleanCode = rawCode;
          if (cleanCode) cleanCode = cleanCode.split('*')[0].trim();
          
          if (!pnrHasJsonData.has(cleanCode)) {
            const chungTuVal = getChungTuFromRow(row, table);
            const airlineId = mapChungTuToAirlineId(chungTuVal);
            if (airlineId === 'VNA' || airlineId === 'SPA' || airlineId === 'VIETJET' || airlineId === 'BAMBOO' || airlineId === 'VIETRAVEL') {
              if (cleanCode) {
                const key = cleanCode;
                if (!vnaKeys.has(key)) {
                  vnaKeys.add(key);
                  const passengerName = getPassengerNameFromRow(row, table);
                  const nameParts = passengerName.trim().split(/s+/);
                  const lastName = nameParts[0] || '';
                  vnaRequests.push({ pnr: cleanCode, lastName, passengerName, airlineId, hasAsterisk });
                }
              }
            }
          }
        }
      }
    });

    let ticketCompletedCount = orderCodes.length - orderCodesToScan.length;
    let vnaCompletedCount = 0;
    let currentPnr = '';

    const updateProgress = () => {
      let text = 'Đang kiểm tra (' + ticketCompletedCount + '/' + orderCodes.length + ')';
      if (vnaRequests.length > 0) {
        text += ' - Quét PNR (' + vnaCompletedCount + '/' + vnaRequests.length + ')';
        if (currentPnr) {
          const req = vnaRequests.find(r => r.pnr === currentPnr);
          if (req) {
            let carrierCode = req.airlineId;
            if (carrierCode === 'SPA') carrierCode = '9G';
            else if (carrierCode === 'VIETJET') carrierCode = 'VJ';
            else if (carrierCode === 'BAMBOO') carrierCode = 'QH';
            else if (carrierCode === 'VIETRAVEL') carrierCode = 'VU';
            else if (carrierCode === 'VNA') carrierCode = 'VN';
            text += ': ' + currentPnr + ' (' + carrierCode + ')';
          } else {
            text += ': ' + currentPnr;
          }
        }
      }
      btn.innerHTML = '<span class="skyjet-spinner" style="width:12px; height:12px; border-width:1.5px; border-top-color:#ffffff; display:inline-block; margin-right:4px;"></span> ' + text + '...';
    };

    const fetchVnaSequentially = async () => {
      let networkCallCount = 0;
      for (let i = 0; i < vnaRequests.length; i++) {
        const req = vnaRequests[i];
        currentPnr = req.pnr;
        updateProgress();
        
        if (vnaResultsMap.has(req.pnr)) {
          vnaCompletedCount++;
          updateProgress();
          continue;
        }
        if (networkCallCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        networkCallCount++;
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            console.log('[Skyjet Helper] Bắt đầu tra cứu PNR: ' + req.pnr + ' (?airlineId=' + req.airlineId + ')');
            const response = await new Promise((resolve) => {
              try {
                chrome.runtime.sendMessage({
                  action: 'fetch_vietnamairlines',
                  pnr: req.pnr,
                  lastName: req.lastName,
                  passengerName: req.passengerName,
                  airlineId: req.airlineId,
                  hasAsterisk: req.hasAsterisk
                }, (res) => {
                  if (chrome.runtime.lastError) {
                    console.warn('[Skyjet Helper] Lỗi runtime.lastError khi tra cứu VNA:', chrome.runtime.lastError);
                    resolve(null);
                  } else {
                    resolve(res);
                  }
                });
              } catch (e) {
                resolve(null);
              }
            });
            if (response) {
              const sourceStr = response.source === 'cache' ? 'Supabase Cache' : 'FlightVN';
              console.log('[Skyjet Helper] Phản hồi nhận được từ ' + sourceStr + ' cho PNR: ' + req.pnr, response);
              if (response.success && response.data && typeof response.data === 'string') {
                try {
                  response.data = JSON.parse(response.data);
                } catch (e) {
                  console.error('Error parsing response.data string:', e);
                }
              }
              vnaResultsMap.set(req.pnr, response);
              if (response.success === false && (response.error === 'Chưa đăng nhập FlightVN' || response.error?.toLowerCase().includes('dang nhap') || response.error?.toLowerCase().includes('đăng nhập'))) {
                hasLoginError = true;
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                  chrome.runtime.sendMessage({ action: 'open_flightvn_login' });
                } else {
                  window.open('https://flightvn.com/Booking/ImportBooking', '_blank');
                }
                break;
              }
              if (response.success) {
                const ticketClass = response.ticket_class;
                const ticketType = response.ticket_type;
                if (ticketClass || ticketType) {
                  let currentResult = resultsMap.get(req.pnr);
                  if (!currentResult) {
                    currentResult = { ticketList: [], classes: [], ticketTypes: [] };
                    resultsMap.set(req.pnr, currentResult);
                  }
                  if (ticketClass) {
                    if (!currentResult.classes.includes(ticketClass)) {
                      currentResult.classes.push(ticketClass);
                    }
                    currentResult.ticketList.forEach(t => {
                      if (!t.ticketClass) t.ticketClass = ticketClass;
                    });
                  }
                  if (ticketType) {
                    if (!currentResult.ticketTypes.includes(ticketType)) {
                      currentResult.ticketTypes.push(ticketType);
                    }
                    currentResult.ticketList.forEach(t => {
                      if (!t.ticketType) t.ticketType = ticketType;
                    });
                  }
                }
              }
            } else {
              console.error('[Skyjet Helper] Không nhận được phản hồi từ background cho PNR: ' + req.pnr);
            }
          }
        } catch (error) {
          console.error('[Skyjet Helper] Error fetching VNA data for PNR: ' + req.pnr, error);
        } finally {
          vnaCompletedCount++;
          updateProgress();
        }
      }
      currentPnr = '';
      updateProgress();
    };

    await Promise.all([
      ...orderCodesToScan.map(async (code) => {
        try {
          const response = await fetch('/OrderReportArea/OrderReport/SearchAllOrder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: 'OrderReferenceId=' + encodeURIComponent(code)
          });
          if (response.ok) {
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const searchTable = doc.querySelector('#gridItem') || doc.querySelector('table');
            if (searchTable) {
              const detailRows = Array.from(searchTable.querySelectorAll('tbody tr'));
              const ticketList = [];
              const classes = [];
              const ticketTypes = [];

              const subHeaders = Array.from(searchTable.querySelectorAll('thead th')).map(th => th.innerText.trim().toLowerCase());
              let subTicketColIdx = findHeaderIndex(subHeaders, [], ['số vé', 'so ve']);
              let subClassColIdx = findHeaderIndex(subHeaders, ['hạng', 'hang'], ['hạng vé']);
              let subTypeColIdx = findHeaderIndex(subHeaders, [], ['loại vé', 'loai ve']);
              let subPassengerColIdx = findHeaderIndex(subHeaders, [], ['tên khách', 'ten khach', 'hành khách', 'hanh khach']);

              const newTicketsToCache = [];

              detailRows.forEach(dRow => {
                const dCells = dRow.querySelectorAll('td');
                if (dCells.length > 0) {
                  const tNum = subTicketColIdx !== -1 && dCells[subTicketColIdx] ? dCells[subTicketColIdx].innerText.trim() : '';
                  const tClass = subClassColIdx !== -1 && dCells[subClassColIdx] ? dCells[subClassColIdx].innerText.trim() : '';
                  let tType = subTypeColIdx !== -1 && dCells[subTypeColIdx] ? dCells[subTypeColIdx].innerText.trim() : '';
                  const passengerName = subPassengerColIdx !== -1 && dCells[subPassengerColIdx] ? dCells[subPassengerColIdx].innerText.trim() : '';

                  if (tClass && !classes.includes(tClass)) {
                    classes.push(tClass);
                  }
                  if (tType) {
                    if (passengerName && /(?:mstr|miss)$/i.test(passengerName)) {
                      if (!tType.endsWith('*')) {
                        tType += '*';
                      }
                    }
                    if (!ticketTypes.includes(tType)) {
                      ticketTypes.push(tType);
                    }
                  }
                  
                  ticketList.push({
                    ticketNum: tNum,
                    ticketClass: tClass,
                    ticketType: tType,
                    passengerName: passengerName
                  });

                  if (tNum && (tClass || tType)) {
                    const carrier = pnrCarrierMap.get(code) || null;
                    newTicketsToCache.push({
                      ticket_number: tNum,
                      pnr_code: code,
                      ticket_type: tType,
                      ticket_class: tClass,
                      carrier: carrier
                    });
                  }
                }
              });
              resultsMap.set(code, { ticketList, classes, ticketTypes });

              if (newTicketsToCache.length > 0) {
                chrome.runtime.sendMessage({
                  action: 'save_ticket_cache',
                  tickets: newTicketsToCache
                });
              }
            } else {
              resultsMap.set(code, { ticketList: [], classes: [], ticketTypes: [] });
            }
          } else {
            resultsMap.set(code, { ticketList: [], classes: [], ticketTypes: [] });
          }
        } catch (error) {
          console.error('[Skyjet Helper] Error fetching ticket class for order: ' + code, error);
          resultsMap.set(code, { classes: [], ticketTypes: [] });
        } finally {
          ticketCompletedCount++;
          updateProgress();
        }
      }),
      fetchVnaSequentially()
    ]);

    if (hasLoginError) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-exclamation-triangle"></i> Chưa đăng nhập FlightVN';
      btn.style.backgroundColor = '#dc3545';
      btn.style.borderColor = '#dc3545';
      btn.style.color = '#ffffff';
    } else {
      btn.disabled = false;
      btn.innerHTML = originalBtnText;
      btn.style.backgroundColor = '#17a2b8';
      btn.style.borderColor = '#17a2b8';
      btn.style.color = '#ffffff';
    }
  }

  const currentHeaders = Array.from(table.querySelectorAll('thead th'));
  oldTargetClassHeaderIndex = -1;
  oldTargetTypeHeaderIndex = -1;
  oldTargetTimeHeaderIndex = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    const text = currentHeaders[i].innerText.trim();
    if (text === 'Hạng vé') {
      oldTargetClassHeaderIndex = i;
    } else if (text === 'Loại vé' && currentHeaders[i].dataset.skyjetTypeCol === "true") {
      oldTargetTypeHeaderIndex = i;
    } else if (text === 'Thời gian bay' && currentHeaders[i].dataset.skyjetTimeCol === "true") {
      oldTargetTimeHeaderIndex = i;
    }
  }

  let soVeColIdx = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    const text = currentHeaders[i].innerText.trim().toLowerCase();
    if (text === 'số vé' || text === 'so ve') {
      soVeColIdx = i;
      break;
    }
  }

  let orderCodeHeaderIdx = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    const text = currentHeaders[i].innerText.trim().toLowerCase();
    if (text === 'mã đơn hàng' || text.includes('đơn hàng') || text.includes('mã đh')) {
      orderCodeHeaderIdx = i;
      break;
    }
  }

  let hanhTrinhHeaderIdx = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    const text = currentHeaders[i].innerText.trim().toLowerCase();
    if (text === 'hành trình' || text === 'hanh trinh') {
      hanhTrinhHeaderIdx = i;
      break;
    }
  }

  let targetClassHeaderIndex = oldTargetClassHeaderIndex;
  const theadTr = table.querySelector('thead tr');

  // Thêm / di chuyển cột Loại vé trước cột Mã đơn hàng
  if (oldTargetTypeHeaderIndex === -1) {
    if (theadTr && orderCodeHeaderIdx !== -1 && currentHeaders[orderCodeHeaderIdx]) {
      const th = document.createElement('th');
      th.innerText = 'Loại vé';
      th.style.textAlign = 'center';
      th.dataset.skyjetTypeCol = "true";
      theadTr.insertBefore(th, currentHeaders[orderCodeHeaderIdx]);
    }
  } else {
    if (theadTr && orderCodeHeaderIdx !== -1 && currentHeaders[orderCodeHeaderIdx]) {
      const th = currentHeaders[oldTargetTypeHeaderIndex];
      if (th && th.nextSibling !== currentHeaders[orderCodeHeaderIdx]) {
        theadTr.insertBefore(th, currentHeaders[orderCodeHeaderIdx]);
      }
    }
  }

  // Thêm / di chuyển cột Hạng vé
  if (oldTargetClassHeaderIndex === -1) {
    if (theadTr) {
      const th = document.createElement('th');
      th.innerText = 'Hạng vé';
      th.style.textAlign = 'center';
      if (soVeColIdx !== -1 && currentHeaders[soVeColIdx]) {
        theadTr.insertBefore(th, currentHeaders[soVeColIdx].nextSibling);
        targetClassHeaderIndex = soVeColIdx + 1;
      } else {
        theadTr.appendChild(th);
        targetClassHeaderIndex = currentHeaders.length;
      }
    }
  } else {
    if (soVeColIdx !== -1 && oldTargetClassHeaderIndex !== soVeColIdx + 1) {
      const th = currentHeaders[oldTargetClassHeaderIndex];
      if (theadTr && th && currentHeaders[soVeColIdx]) {
        theadTr.insertBefore(th, currentHeaders[soVeColIdx].nextSibling);
        const updatedHeaders = Array.from(table.querySelectorAll('thead th'));
        targetClassHeaderIndex = updatedHeaders.indexOf(th);
      }
    }
  }

  // Thêm / di chuyển cột Thời gian bay trực tiếp sau cột Hành trình
  if (oldTargetTimeHeaderIndex === -1) {
    if (theadTr && hanhTrinhHeaderIdx !== -1 && currentHeaders[hanhTrinhHeaderIdx]) {
      const th = document.createElement('th');
      th.innerText = 'Thời gian bay';
      th.style.textAlign = 'center';
      th.dataset.skyjetTimeCol = "true";
      theadTr.insertBefore(th, currentHeaders[hanhTrinhHeaderIdx].nextSibling);
    }
  } else {
    if (theadTr && hanhTrinhHeaderIdx !== -1 && currentHeaders[hanhTrinhHeaderIdx]) {
      const th = currentHeaders[oldTargetTimeHeaderIndex];
      if (th && th.previousSibling !== currentHeaders[hanhTrinhHeaderIdx]) {
        theadTr.insertBefore(th, currentHeaders[hanhTrinhHeaderIdx].nextSibling);
      }
    }
  }

  const finalRows = Array.from(table.querySelectorAll('tbody tr'));
  finalRows.forEach(row => {
    // Bỏ qua dòng bị ẩn hoặc dòng tổng cộng
    const rowText = row.innerText.toLowerCase();
    if (rowText.includes('tổng cộng') || rowText.includes('cộng') || row.classList.contains('skyjet-auto-summary-row') || row.style.display === 'none' || row.offsetHeight === 0) {
      return;
    }

    const cells = Array.from(row.querySelectorAll('td'));
    const orderCodeVal = cells[orderCodeIndex]?.innerText?.trim() || '';
    let cleanCode = cells[orderCodeIndex]?.querySelector('.skyjet-btn span')?.innerText?.trim() || orderCodeVal;
    if (cleanCode) cleanCode = cleanCode.split('*')[0].trim();

    const orderCodeCell = cells[orderCodeIndex];
    const soVeCell = soVeColIdx !== -1 ? cells[soVeColIdx] : null;

    // Thiết lập ô Loại vé
    let typeCell = null;
    if (oldTargetTypeHeaderIndex === -1) {
      typeCell = document.createElement('td');
      typeCell.style.textAlign = 'center';
      typeCell.dataset.skyjetTypeCol = "true";
      if (orderCodeCell) {
        row.insertBefore(typeCell, orderCodeCell);
      } else {
        row.appendChild(typeCell);
      }
    } else {
      typeCell = cells[oldTargetTypeHeaderIndex];
      if (typeCell) {
        if (orderCodeCell && typeCell.nextSibling !== orderCodeCell) {
          row.insertBefore(typeCell, orderCodeCell);
        }
      } else {
        typeCell = document.createElement('td');
        typeCell.style.textAlign = 'center';
        typeCell.dataset.skyjetTypeCol = "true";
        if (orderCodeCell) {
          row.insertBefore(typeCell, orderCodeCell);
        } else {
          row.appendChild(typeCell);
        }
      }
    }

    // Thiết lập ô Hạng vé
    let targetCell = null;
    if (oldTargetClassHeaderIndex === -1) {
      targetCell = document.createElement('td');
      targetCell.style.textAlign = 'center';
      if (soVeCell) {
        row.insertBefore(targetCell, soVeCell.nextSibling);
      } else {
        row.appendChild(targetCell);
      }
    } else {
      targetCell = cells[oldTargetClassHeaderIndex];
      if (targetCell) {
        if (soVeCell && targetCell.previousSibling !== soVeCell) {
          row.insertBefore(targetCell, soVeCell.nextSibling);
        }
      } else {
        targetCell = document.createElement('td');
        targetCell.style.textAlign = 'center';
        row.appendChild(targetCell);
      }
    }

    // Thiết lập ô Thời gian bay sau ô Hành trình
    const updatedHeaders2 = Array.from(table.querySelectorAll('thead th'));
    const hanhTrinhColIdx2 = findHeaderIndex(updatedHeaders2, ['hành trình', 'hanh trinh']);
    const currentCells = Array.from(row.querySelectorAll('td'));
    
    let timeCell = row.querySelector('td[data-skyjet-time-col="true"]');
    if (!timeCell) {
      timeCell = document.createElement('td');
      timeCell.style.textAlign = 'center';
      timeCell.dataset.skyjetTimeCol = "true";
      if (hanhTrinhColIdx2 !== -1 && currentCells[hanhTrinhColIdx2]) {
        row.insertBefore(timeCell, currentCells[hanhTrinhColIdx2].nextSibling);
      } else {
        row.appendChild(timeCell);
      }
    } else {
      if (hanhTrinhColIdx2 !== -1 && currentCells[hanhTrinhColIdx2]) {
        if (timeCell.previousSibling !== currentCells[hanhTrinhColIdx2]) {
          row.insertBefore(timeCell, currentCells[hanhTrinhColIdx2].nextSibling);
        }
      }
    }

    if (!cleanCode || cleanCode === '0' || cleanCode.length < 3 || cleanCode.includes('Tổng') || cleanCode.includes('TỔNG')) {
      targetCell.innerHTML = '';
      typeCell.innerHTML = '';
      timeCell.innerHTML = '';
      return;
    }

    const resultObj = resultsMap.get(cleanCode);
    let classesList = [];
    let ticketTypesList = [];

    if (resultObj) {
      let rowTicketNum = '';
      if (soVeCell) {
        rowTicketNum = soVeCell.innerText.trim();
      } else {
        const descColIdx = findHeaderIndex(currentHeaders, [], ['diễn giải', 'nội dung', 'description']);
        if (descColIdx !== -1 && cells[descColIdx]) {
          const descText = cells[descColIdx].innerText.trim();
          const parts = descText.split('-');
          if (parts.length > 0) {
            let result = parts[0].trim();
            for (let i = 1; i < parts.length; i++) {
              const currentPart = parts[i].trim();
              if (currentPart.length < 3) {
                result = result + '-' + currentPart;
              } else {
                break;
              }
            }
            rowTicketNum = result;
          }
        }
      }

      const ticketMatchExact = (t1, t2) => {
        if (!t1 || !t2) return false;
        const n1 = t1.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const n2 = t2.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return n1 === n2;
      };

      const ticketMatchFuzzy = (t1, t2) => {
        if (!t1 || !t2) return false;
        const n1 = t1.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const n2 = t2.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return n1.includes(n2) || n2.includes(n1);
      };

      let matchedTicket = null;
      if (rowTicketNum && resultObj.ticketList) {
        matchedTicket = resultObj.ticketList.find(t => ticketMatchExact(t.ticketNum, rowTicketNum));
        if (!matchedTicket) {
          matchedTicket = resultObj.ticketList.find(t => ticketMatchFuzzy(t.ticketNum, rowTicketNum));
        }
      }

      const updatedHeaders3 = Array.from(table.querySelectorAll('thead th'));
      const passengerColIdx = findHeaderIndex(updatedHeaders3, [], ['tên khách', 'ten khach', 'hành khách', 'hanh khach', 'khách hàng', 'khach hang']);
      let mainTablePassengerName = '';
      if (passengerColIdx !== -1 && cells[passengerColIdx]) {
        mainTablePassengerName = cells[passengerColIdx].innerText.trim();
      }

      if (matchedTicket) {
        if (matchedTicket.ticketClass) {
          classesList = [matchedTicket.ticketClass];
        }
        if (matchedTicket.ticketType) {
          let tType = matchedTicket.ticketType;
          if (tType && (
            (mainTablePassengerName && /(?:mstr|miss)$/i.test(mainTablePassengerName)) || 
            (matchedTicket.passengerName && /(?:mstr|miss)$/i.test(matchedTicket.passengerName))
          )) {
            if (!tType.endsWith('*')) {
              tType += '*';
            }
          }
          ticketTypesList = [tType];
        }
      } else {
        classesList = resultObj.classes || [];
        ticketTypesList = (resultObj.ticketTypes || []).map(tType => {
          if (tType && mainTablePassengerName && /(?:mstr|miss)$/i.test(mainTablePassengerName)) {
            if (!tType.endsWith('*')) {
              return tType + '*';
            }
          }
          return tType;
        });
      }
    }

    if (classesList.length > 0) {
      targetCell.innerHTML = classesList.map(cls => {
        let bgColor = '#64748b';
        if (cls === 'Y' || cls.startsWith('Y')) bgColor = '#10b981';
        else if (cls === 'C' || cls.startsWith('C') || cls === 'J' || cls.startsWith('J')) bgColor = '#f59e0b';
        else if (cls === 'M' || cls.startsWith('M') || cls === 'L' || cls.startsWith('L') || cls === 'R' || cls.startsWith('R')) bgColor = '#0284c7';
        
        return `<span class="badge" style="display:inline-block; padding: 3px 6px; font-size: 11px; font-weight: 700; color: #ffffff; background-color: ${bgColor}; border-radius: 4px; margin: 1px;">${cls}</span>`;
      }).join(' ');
    } else {
      targetCell.innerHTML = '<span style="color:#cbd5e1; font-size: 11px;">-</span>';
    }

    if (ticketTypesList.length > 0) {
      typeCell.innerHTML = ticketTypesList.map(type => {
        let bgColor = '#64748b';
        const lowerType = type.toLowerCase();
        if (lowerType.includes('bán') || lowerType.includes('ban') || lowerType.includes('sale') || lowerType.includes('xuất')) {
          bgColor = '#3b82f6';
        } else if (lowerType.includes('hoàn') || lowerType.includes('hoan') || lowerType.includes('refund') || lowerType.includes('hủy') || lowerType.includes('huy')) {
          bgColor = '#ef4444';
        } else if (lowerType.includes('đổi') || lowerType.includes('doi') || lowerType.includes('exchange')) {
          bgColor = '#8b5cf6';
        } else if (lowerType.includes('đoàn') || lowerType.includes('group') || lowerType.includes('git')) {
          bgColor = '#f59e0b';
        } else if (lowerType.includes('lẻ') || lowerType.includes('fit')) {
          bgColor = '#0ea5e9';
        }
        
        return `<span class="badge" style="display:inline-block; padding: 3px 6px; font-size: 11px; font-weight: 700; color: #ffffff; background-color: ${bgColor}; border-radius: 4px; margin: 1px;">${type}</span>`;
      }).join(' ');
    } else {
      typeCell.innerHTML = '<span style="color:#cbd5e1; font-size: 11px;">-</span>';
    }

    // Điền dữ liệu vào ô Thời gian bay
    const chungTuVal = getChungTuFromRow(row, table);
    const itineraryVal = getItineraryFromRow(row, table);
    const airlineId = mapChungTuToAirlineId(chungTuVal);
    if (airlineId && itineraryVal) {
      if (airlineId !== 'VNA' && airlineId !== 'SPA' && airlineId !== 'VIETJET' && airlineId !== 'BAMBOO' && airlineId !== 'VIETRAVEL') {
        timeCell.innerHTML = '<span style="color:#cbd5e1; font-size: 11px;">-</span>';
        return;
      }
      const passengerName = getPassengerNameFromRow(row, table);
      const nameParts = passengerName.trim().split(/s+/);
      const lastName = nameParts[0] || '';
      
      const vnaResponse = vnaResultsMap.get(cleanCode);
      const hasVnaData = vnaResponse && vnaResponse.success && vnaResponse.data;
      if (hasVnaData) {
        let vnaData = vnaResponse.data;
        if (typeof vnaData === 'string') {
          try {
            vnaData = JSON.parse(vnaData);
          } catch (e) {
            console.error('Error parsing vnaData string:', e);
          }
        }
        const pairs = getItineraryPairs(itineraryVal);
        const timeStrings = [];
        pairs.forEach((pair, pairIdx) => {
          const depTime = findDepartureTime(vnaData, pair.from, pair.to, pairIdx);
          if (depTime) {
            const formatted = formatFlightTime(depTime);
            if (formatted) {
              timeStrings.push(formatted);
            }
          }
        });
        if (timeStrings.length === 0) {
          const segments = [];
          if (vnaData && vnaData.reservation && vnaData.reservation.originDestinationOptions) {
            vnaData.reservation.originDestinationOptions.forEach(option => {
              if (option.flightSegments) {
                segments.push(...option.flightSegments);
              }
            });
          }
          segments.forEach(seg => {
            if (seg && seg.departureDateTime) {
              const formatted = formatFlightTime(seg.departureDateTime);
              if (formatted && !timeStrings.includes(formatted)) {
                timeStrings.push(formatted);
              }
            }
          });
        }
        if (timeStrings.length > 0) {
          timeCell.innerHTML = timeStrings.map(t => `<span style="display:inline-block; font-size: 11px; font-weight: 700; color: #38bdf8; margin: 1px;">${t}</span>`).join(' | ');
        } else {
          timeCell.innerHTML = `<span style="color:#cbd5e1; font-size: 11px;">-</span>`;
        }
      } else {
        const errorText = vnaResponse && vnaResponse.error ? vnaResponse.error : 'Lỗi tải giờ';
        timeCell.innerHTML = `<span style="color:#ef4444; font-size: 11px;" title="${errorText}">${errorText}</span>`;
      }
    } else {
      timeCell.innerHTML = '<span style="color:#cbd5e1; font-size: 11px;">-</span>';
    }
  });

  // Tự động fit chiều ngang các cột trừ tên khách và diễn giải
  const finalHeaders = Array.from(table.querySelectorAll('thead th'));
  finalHeaders.forEach((th, idx) => {
    const text = th.innerText.trim().toLowerCase();
    if (text.includes('tên khách') || text.includes('ten khach') || text.includes('diễn giải') || text.includes('description')) {
      // Giữ nguyên cột co giãn tự do
    } else {
      th.style.whiteSpace = 'nowrap';
      th.style.width = '1%';
    }
  });

  finalRows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    cells.forEach((td, cellIdx) => {
      const headerText = finalHeaders[cellIdx]?.innerText?.trim()?.toLowerCase() || '';
      if (headerText.includes('tên khách') || headerText.includes('ten khach') || headerText.includes('diễn giải') || headerText.includes('description')) {
        // Giữ nguyên
      } else {
        td.style.whiteSpace = 'nowrap';
        td.style.width = '1%';
      }
    });
  });

  ensureHangVePosition(table);
  ensureTimeColPosition(table);
}

function collapseLeftSidebar() {
  const toggleBtn = document.getElementById('menu_toggle') || document.querySelector('.menu_toggle');
  if (toggleBtn) {
    const isExpanded = document.body.classList.contains('nav-md') || !document.body.classList.contains('nav-sm');
    if (isExpanded) {
      toggleBtn.click();
    }
  }
  document.body.classList.remove('nav-md');
  document.body.classList.add('nav-sm');
}

function findHeaderIndex(headers, exactKeywords, subKeywords = []) {
  return headers.findIndex(h => {
    const txt = typeof h === 'string' ? h : h.innerText.trim().toLowerCase();
    if (exactKeywords.includes(txt)) return true;
    return subKeywords.some(sub => txt.includes(sub));
  });
}

function moveColumnNextTo(table, isTargetCol, isAnchorCol) {
  const currentHeaders = Array.from(table.querySelectorAll('thead th'));
  let targetIdx = -1;
  let anchorIdx = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    if (isTargetCol(currentHeaders[i], i)) {
      targetIdx = i;
    } else if (isAnchorCol(currentHeaders[i], i)) {
      anchorIdx = i;
    }
  }
  if (targetIdx !== -1 && anchorIdx !== -1 && targetIdx !== anchorIdx + 1) {
    const theadTr = table.querySelector('thead tr');
    if (theadTr) {
      const thTarget = currentHeaders[targetIdx];
      const thAnchor = currentHeaders[anchorIdx];
      if (thTarget && thAnchor) {
        theadTr.insertBefore(thTarget, thAnchor.nextSibling);
      }
    }
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    rows.forEach(row => {
      const rowText = row.innerText.toLowerCase();
      if (rowText.includes('tổng cộng') || rowText.includes('cộng') || row.classList.contains('skyjet-auto-summary-row')) {
        return;
      }
      const cells = Array.from(row.cells);
      const cellTarget = cells[targetIdx];
      const cellAnchor = cells[anchorIdx];
      if (cellTarget && cellAnchor) {
        row.insertBefore(cellTarget, cellAnchor.nextSibling);
      }
    });
  }
}

function ensureHangVePosition(table) {
  moveColumnNextTo(
    table,
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'hạng vé' || txt === 'hang ve';
    },
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'số vé' || txt === 'so ve';
    }
  );
}

function ensureTimeColPosition(table) {
  moveColumnNextTo(
    table,
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'thời gian bay' && th.dataset.skyjetTimeCol === 'true';
    },
    (th) => {
      const txt = th.innerText.trim().toLowerCase();
      return txt === 'hành trình' || txt === 'hanh trinh';
    }
  );
}


function mapChungTuToAirlineId(chungTuVal) {
  if (!chungTuVal) return '';
  const val = chungTuVal.toUpperCase().trim();
  if (val.includes('VNA') || val.includes('VIETNAM') || val.includes('PACIFIC') || val.includes('BL') || val.startsWith('VN')) {
    return 'VNA';
  }
  if (val.includes('VJ') || val.includes('VIETJET') || val.includes('VJC')) {
    return 'VIETJET';
  }
  if (val.includes('QH') || val.includes('BAMBOO')) {
    return 'BAMBOO';
  }
  if (val.includes('VU') || val.includes('VIETRAVEL')) {
    return 'VIETRAVEL';
  }
  if (val.includes('SPA')  || val.includes('9G')) {
    return 'SPA';
  }
  return '';
}

function getChungTuFromRow(row, table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  const cells = Array.from(row.querySelectorAll('td'));
  const idx = findHeaderIndex(headers, ['chứng từ', 'chung tu']);
  if (idx !== -1 && cells[idx]) {
    return cells[idx].innerText.trim();
  }
  return '';
}

function getItineraryFromRow(row, table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  const cells = Array.from(row.querySelectorAll('td'));
  const idx = findHeaderIndex(headers, ['hành trình', 'hanh trinh']);
  if (idx !== -1 && cells[idx]) {
    return cells[idx].innerText.trim();
  }
  return '';
}

function getItineraryPairs(itin) {
  if (!itin) return [];
  const airports = itin.split('-').map(a => a.trim().toUpperCase()).filter(Boolean);
  const pairs = [];
  for (let i = 0; i < airports.length - 1; i++) {
    pairs.push({ from: airports[i], to: airports[i+1] });
  }
  return pairs;
}

function findDepartureTime(vnaData, from, to, pairIdx = 0) {
  if (!vnaData || !vnaData.reservation) return null;
  const options = vnaData.reservation.originDestinationOptions || [];
  
  // 1. Trước tiên, tìm khớp chính xác đi/đến
  for (const option of options) {
    const segments = option.flightSegments || [];
    for (const segment of segments) {
      if (segment.departureLocationCode === from && segment.arrivalLocationCode === to) {
        return segment.departureDateTime;
      }
    }
  }

  // 2. Nếu không tìm thấy và là hãng 9G/SPA (hoặc thiếu sân bay đi/đến)
  // Gom tất cả các segment lại để check theo chỉ số
  const allSegments = [];
  for (const option of options) {
    allSegments.push(...(option.flightSegments || []));
  }
  if (allSegments[pairIdx]) {
    const seg = allSegments[pairIdx];
    if (!seg.departureLocationCode || !seg.arrivalLocationCode || seg.marketingAirlineCode === '9G') {
      return seg.departureDateTime;
    }
  }

  // 3. Kiểm tra coupons của hành khách
  const passengers = vnaData.reservation.passengers || [];
  for (const passenger of passengers) {
    const coupons = passenger.ticketDocument?.coupons || [];
    for (const coupon of coupons) {
      if (coupon.departureLocationCode === from && coupon.arrivalLocationCode === to) {
        return coupon.departureDateTime;
      }
    }
  }

  // Fallback cuối cùng nếu là 9G và chỉ có 1 segment
  if (allSegments.length === 1 && allSegments[0].marketingAirlineCode === '9G') {
    return allSegments[0].departureDateTime;
  }
  
  return null;
}

function formatFlightTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  try {
    const dt = new Date(dateTimeStr);
    if (isNaN(dt.getTime())) {
      const match = dateTimeStr.match(/^(d{4})-(d{2})-(d{2})T(d{2}):(d{2})/);
      if (match) {
        return match[4] + ":" + match[5] + " " + match[3] + "/" + match[2] + "/" + match[1];
      }
      return '';
    }
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return hours + ":" + minutes + " " + day + "/" + month + "/" + year;
  } catch (e) {
    return '';
  }
}


function getPassengerNameFromRow(row, table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  const cells = Array.from(row.querySelectorAll('td'));

  // 1. Check if there's a column with header containing passenger name keywords
  const passengerColIdx = findHeaderIndex(headers, [], ['tên khách', 'ten khach', 'hành khách', 'hanh khach', 'khách hàng', 'khach hang']);
  if (passengerColIdx !== -1 && cells[passengerColIdx]) {
    const name = cells[passengerColIdx].innerText.trim();
    if (name) return name;
  }

  // 2. If not, check the description cell to extract it
  const descColIdx = findHeaderIndex(headers, [], ['diễn giải', 'nội dung', 'description']);
  if (descColIdx !== -1 && cells[descColIdx]) {
    const descText = cells[descColIdx].innerText.trim();
    const orderCodeIndex = findHeaderIndex(headers, [], ['mã đơn hàng', 'đơn hàng', 'mã đh']);
    const orderCodeVal = orderCodeIndex !== -1 ? (cells[orderCodeIndex]?.innerText?.trim() || '') : '';
    let cleanCode = orderCodeIndex !== -1 ? (cells[orderCodeIndex]?.querySelector('.skyjet-btn span')?.innerText?.trim() || orderCodeVal) : orderCodeVal;
    if (cleanCode) cleanCode = cleanCode.split('*')[0].trim();
    const hasOrderCode = cleanCode && cleanCode !== '0' && cleanCode.length >= 3 && !cleanCode.includes('Tổng') && !cleanCode.includes('TỔNG');

    if (hasOrderCode) {
      const majorParts = descText.split(' - ').map(p => p.trim());
      if (majorParts.length >= 3) {
        return majorParts.slice(2).join(' - ');
      } else {
        const parts = descText.split('-');
        if (parts.length > 0) {
          let currentIdx = 1;
          for (; currentIdx < parts.length; currentIdx++) {
            const currentPart = parts[currentIdx].trim();
            if (currentPart.length >= 3) {
              break;
            }
          }
          currentIdx++;
          if (currentIdx < parts.length) {
            return parts.slice(currentIdx).map(p => p.trim()).join(' - ');
          }
        }
      }
    } else {
      return descText;
    }
  }
  return '';
}

function decorateLoaiVeWithAsterisk(row, table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  const cells = Array.from(row.querySelectorAll('td'));

  const loaiVeColIdx = findHeaderIndex(headers, ['loại vé', 'loai ve']);

  if (loaiVeColIdx === -1 || !cells[loaiVeColIdx]) return;

  const passengerName = getPassengerNameFromRow(row, table);
  if (passengerName && /(?:mstr|miss)$/i.test(passengerName)) {
    const cell = cells[loaiVeColIdx];
    const badge = cell.querySelector('.badge, span');
    if (badge) {
      const txt = badge.innerText.trim();
      if (txt && !txt.endsWith('*')) {
        badge.innerText = txt + '*';
      }
    } else {
      const txt = cell.innerText.trim();
      if (txt && !txt.endsWith('*')) {
        cell.innerText = txt + '*';
      }
    }
  }
}

// Hàm chính biến đổi Mã đơn hàng thành nút bấm thông minh
function processTransactionTable() {
  const table = document.getElementById('tableContent');
  if (!table) return;
  
  // Tránh việc lặp đi lặp lại trên cùng một bảng đã xử lý
  if (table.dataset.decoratedBySkyjet) {
    // Tuy nhiên, nếu số lượng tr thay đổi làm mới, vẫn quét lại các ô chưa có nút
    decorateRows(table);
    return;
  }
  table.dataset.decoratedBySkyjet = "true";
  decorateRows(table);
}

function decorateRows(table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  let orderCodeIndex = -1;
  
  // Quét động tiêu đề cột để xác định vị trí "Mã đơn hàng"
  for (let i = 0; i < headers.length; i++) {
    const text = headers[i].innerText.trim().toLowerCase();
    if (text === 'mã đơn hàng' || text.includes('đơn hàng') || text.includes('mã đh')) {
      orderCodeIndex = i;
      break;
    }
  }
  
  // Nếu không quét được tiêu đề, mặc định là cột số 6 (index 5 trong JS)
  if (orderCodeIndex === -1) {
    orderCodeIndex = 5;
  }
  
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    decorateLoaiVeWithAsterisk(row, table);
    const cells = row.querySelectorAll('td');
    if (cells.length > orderCodeIndex) {
      const td = cells[orderCodeIndex];
      const orderCode = td.innerText.trim();
      
      // Chỉ gắn nút khi có mã đơn hợp lệ (độ dài >= 3 ký tự, không trống, chưa được chuyển đổi)
      if (orderCode && orderCode !== '0' && orderCode.length >= 3 && !td.querySelector('.skyjet-btn')) {
        td.innerHTML = ''; // Xoá nội dung text thô ban đầu
        
        const btn = document.createElement('button');
        btn.className = 'skyjet-btn';
        btn.type = 'button';
        btn.innerHTML = '<span>' + orderCode + '</span>';
        btn.title = 'Bấm để tra cứu nhanh thông tin vé của đơn hàng ' + orderCode;
        
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const currentHeaders = Array.from(table.querySelectorAll('thead th'));
          let ticketColIdx = -1;
          let descColIdx = -1;
          for (let i = 0; i < currentHeaders.length; i++) {
            const hText = currentHeaders[i].innerText.trim().toLowerCase();
            if (hText === 'số vé' || hText === 'so ve') {
              ticketColIdx = i;
            } else if (hText.includes('diễn giải') || hText.includes('nội dung') || hText.includes('description') || hText.includes('giao dịch')) {
              descColIdx = i;
            }
          }
          
          let clickedTicketNum = '';
          const rowCells = Array.from(row.querySelectorAll('td'));
          
          if (ticketColIdx !== -1 && rowCells[ticketColIdx]) {
            clickedTicketNum = rowCells[ticketColIdx].innerText.trim();
          } else {
            let descText = '';
            if (descColIdx !== -1 && rowCells[descColIdx]) {
              descText = rowCells[descColIdx].innerText.trim();
            } else {
              let fallbackTicketIdx = -1;
              for (let i = 0; i < currentHeaders.length; i++) {
                const hText = currentHeaders[i].innerText.trim().toLowerCase();
                if (hText.includes('vé') || hText.includes('ticket')) {
                  fallbackTicketIdx = i;
                  break;
                }
              }
              if (fallbackTicketIdx !== -1 && rowCells[fallbackTicketIdx]) {
                descText = rowCells[fallbackTicketIdx].innerText.trim();
              }
            }
            
            if (descText) {
              const parts = descText.split('-');
              if (parts.length > 0) {
                let result = parts[0].trim();
                for (let i = 1; i < parts.length; i++) {
                  const currentPart = parts[i].trim();
                  if (currentPart.length < 3) {
                    result = result + '-' + currentPart;
                  } else {
                    break;
                  }
                }
                clickedTicketNum = result;
              }
            }
          }
          
          fetchOrderData(orderCode, btn, clickedTicketNum);
        });
        
        td.appendChild(btn);
      }
    }
  });
}

// Gọi API ngầm để lấy thông tin chi tiết vé
function fetchOrderData(orderCode, btnElement, clickedTicketNum) {
  const originalHtml = btnElement.innerHTML;
  btnElement.disabled = true;
  btnElement.innerHTML = `
    <span class="skyjet-spinner"></span>
    <span>${orderCode}</span>
`;
  
  // Tạo hoặc hiển thị cửa sổ overlay đang tải thông tin
  showOrCreateModalLoading(orderCode);
  
  // Gửi request POST trực tiếp lên ERP tại trang tìm kiếm vé
  fetch('/OrderReportArea/OrderReport/SearchAllOrder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: 'OrderReferenceId=' + encodeURIComponent(orderCode)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Lỗi máy chủ (' + response.status + ')');
    }
    return response.text();
  })
  .then(htmlText => {
    btnElement.disabled = false;
    btnElement.innerHTML = originalHtml;
    
    // Sử dụng DOMParser để bóc tách bảng dữ liệu trong HTML trả về
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const searchTable = doc.querySelector('#gridItem') || doc.querySelector('table');
    
    if (searchTable) {
      const rows = searchTable.querySelectorAll('tbody tr');
      const hasNoData = rows.length === 0 || 
                        (rows.length === 1 && (rows[0].innerText.includes('không có dữ liệu') || rows[0].innerText.includes('Không tìm thấy')));
      
      if (hasNoData) {
        showModalError(orderCode, 'Không tìm thấy dữ liệu vé nào khớp với mã đơn hàng "' + orderCode + '". Vui lòng kiểm tra lại.');
      } else {
        // Hiển thị bảng vé sạch đẹp lên modal popup
        showModalResults(orderCode, searchTable, clickedTicketNum);
      }
    } else {
      // Xác minh xem có phải lỗi đăng nhập hay không tìm thấy thẻ bảng nào
      const isLoginRedirect = htmlText.includes('LoginArea') || htmlText.includes('Đăng nhập');
      if (isLoginRedirect) {
        showModalError(orderCode, 'Phiên đăng nhập của bạn đã hết hạn. Vui lòng tải lại trang ERP và đăng nhập lại.');
      } else {
        showModalError(orderCode, 'Không tìm thấy bảng kết quả tra cứu. Có thể định dạng ERP đã thay đổi.');
      }
    }
  })
  .catch(error => {
    console.error('Skyjet ERP Helper Error:', error);
    btnElement.disabled = false;
    btnElement.innerHTML = originalHtml;
    showModalError(orderCode, 'Lỗi kết nối: ' + error.message + '. Vui lòng thử lại!');
  });
}

// Helper: Hiển thị hộp thoại Đang Tải
function showOrCreateModalLoading(orderCode) {
  let overlay = document.getElementById('skyjet-modal-overlay');
  if (overlay) overlay.remove();
  
  overlay = document.createElement('div');
  overlay.id = 'skyjet-modal-overlay';
  overlay.className = 'skyjet-modal-overlay';
  
  overlay.innerHTML = `
    <div class="skyjet-modal-container" style="max-width: 480px !important;">
      <div class="skyjet-modal-header">
        <h3 class="skyjet-modal-title">
          <span>Tra cứu: ${orderCode}</span>
        </h3>
        <button type="button" class="skyjet-modal-close-btn">&times;</button>
      </div>
      <div class="skyjet-modal-body" style="text-align: center; padding: 40px !important;">
        <div class="skyjet-spinner" style="width: 32px; height: 32px; border-width: 3px; border-top-color: #12243d; display: inline-block; margin-bottom: 16px;"></div>
        <div style="font-size: 14px; font-weight: 500; color: #495057;">Đang tìm kiếm thông tin vé chạy ngầm...</div>
        <div style="font-size: 11px; color: #888; margin-top: 6px;">Tiến trình này kết nối trực tiếp với Database Skyjet</div>
      </div>
    </div>
`;
  
  overlay.querySelector('.skyjet-modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// Helper: Hiển thị lỗi hoặc thông báo trống
function showModalError(orderCode, message) {
  const overlay = document.getElementById('skyjet-modal-overlay');
  if (!overlay) return;
  
  const container = overlay.querySelector('.skyjet-modal-container');
  container.style.maxWidth = '480px';
  
  overlay.querySelector('.skyjet-modal-body').innerHTML = `
    <div style="text-align: center; padding: 15px 0;">
      <div style="background: #fdf2f2; width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e02424" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 6px;">Tra cứu kết quả</div>
      <div style="font-size: 12.5px; color: #6b7280; line-height: 1.5; padding: 0 10px;">${message}</div>
    </div>
`;
  
  let footer = container.querySelector('.skyjet-modal-footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'skyjet-modal-footer';
    container.appendChild(footer);
  }
  footer.innerHTML = '<button type="button" class="skyjet-close-modal-btn">Đóng hộp thoại</button>';
  footer.querySelector('.skyjet-close-modal-btn').addEventListener('click', () => overlay.remove());
}

// Helper: Tái cấu trúc và ẩn động các cột có mọi giá trị trùng nhau 100% trong bảng chi tiết
function optimizeHtmlTable(table) {
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  if (rows.length <= 1) return [];
  
  const lastRow = rows[rows.length - 1];
  const hasSummaryRow = lastRow && (lastRow.innerText.toLowerCase().includes('tổng') || lastRow.querySelectorAll('td.text-danger').length > 0 || lastRow.cells.length < 5);
  const dataRows = hasSummaryRow ? rows.slice(0, -1) : rows;
  if (dataRows.length <= 1) return [];
  
  const headRow = table.querySelector('thead tr');
  if (!headRow) return [];
  const colCount = headRow.cells.length;
  
  // Tag columns that are passenger/description/notes so we can style them (e.g. wrap text to 2 lines max)
  for (let c = 0; c < colCount; c++) {
    const headCell = headRow.cells[c];
    if (headCell) {
      const headText = headCell.innerText?.trim()?.toLowerCase() || '';
      if (headText.includes('diễn giải') || headText.includes('hành khách') || headText.includes('tên khách') || headText.includes('ghi chú')) {
        headCell.classList.add('skyjet-col-passenger');
        rows.forEach(tr => {
          if (tr.cells[c]) {
            tr.cells[c].classList.add('skyjet-col-passenger');
          }
        });
      }
    }
  }
  
  const commonCols = [];
  const commonInfo = [];
  
  // Ánh xạ meta labels cho các cột thường gặp của Skyjet ERP jambo_table
  const colMetadata = {
    1: { icon: '🏢', label: 'Đại lý' },
    2: { icon: '🔑', label: 'Mã PNR' },
    4: { icon: '🎟️', label: 'Loại vé' },
    5: { icon: '📦', label: 'Sản phẩm' },
    6: { icon: '🌐', label: 'Kênh bán' },
    7: { icon: '🔢', label: 'Qty' },
    8: { icon: '📍', label: 'Hành trình' },
    9: { icon: '🌎', label: 'ND/QT' },
    10: { icon: '✈️', label: 'Hãng bay' },
    11: { icon: '💺', label: 'Hạng đặt' },
    12: { icon: '🏢', label: 'Nhà cung cấp' },
    13: { icon: '📅', label: 'Ngày xuất' },
    27: { icon: '👥', label: 'ĐL Cấp 2' },
    29: { icon: '👤', label: 'Booker' }
  };
  
  for (let c = 0; c < colCount; c++) {
    // Không bao giờ ẩn các cột quan trọng nhất: STT, Số vé, Diễn giải/Hành khách
    if (c === 0) continue;
    
    const headText = headRow.cells[c]?.innerText?.trim()?.toLowerCase() || '';
    if (headText.includes('số vé') || headText.includes('diễn giải') || headText.includes('ghi chú')) {
      continue;
    }
    
    const values = dataRows.map(row => {
      const cell = row.cells[c];
      return cell ? cell.innerText.trim() : '';
    });
    
    const isNumericString = (str) => {
      if (!str) return false;
      const clean = str.replace(/[., đ%vN]/gi, '').trim();
      if (clean === '') return false;
      return /^-?[0-9]+$/.test(clean);
    };
    const getNumericValue = (str) => {
      if (!str) return 0;
      const clean = str.replace(/[., đ%vN]/gi, '').trim();
      return parseInt(clean, 10) || 0;
    };
    
    // Check if the column is entirely blank OR entirely zero (or mix of empty and zero)
    const isColBlankOrZero = values.every(v => {
      if (!v) return true;
      const clean = v.replace(/[., đ%vN-]/gi, '').trim();
      return clean === '' || clean === '0' || /^0+$/.test(clean);
    });
    
    const firstVal = values[0];
    const isAllSame = values.every(v => v === firstVal);
    
    let shouldOptimize = false;
    let badgeValue = '';
    
    if (isColBlankOrZero) {
      shouldOptimize = true;
      const nonEmptys = values.filter(v => v !== '');
      badgeValue = nonEmptys.length > 0 ? nonEmptys[0] : '0';
    } else if (isAllSame && firstVal !== '') {
      // 2 cột đặc thù: phần trăm VAT và mã Booker không tính là số, nên có thể gộp
      const isPercentVat = headText.includes('%') || headText.includes('phần trăm');
      const isVatAmount = headText.includes('thuế vat') || headText.includes('tiền thuế vat');
      const isExcludedFromNumeric = isPercentVat || headText.includes('booker') || (headText.includes('vat') && !isVatAmount);
      const isNumeric = isNumericString(firstVal) && !isExcludedFromNumeric;
      
      if (!isNumeric) {
        shouldOptimize = true;
        badgeValue = firstVal;
      }
    }
    
    if (shouldOptimize) {
      commonCols.push(c);
      const meta = colMetadata[c] || { icon: '📝', label: headRow.cells[c]?.innerText?.trim() || ('Cột ' + c) };
      commonInfo.push({
        index: c,
        icon: meta.icon,
        label: meta.label,
        value: badgeValue
      });
    }
  }
  
  // Tiến hành xóa các cell của cột trùng lặp để thu gọn bảng
  if (commonCols.length > 0) {
    // Duyệt ngược từ index lớn về nhỏ tránh bị lệch chỉ mục khi xóa
    commonCols.sort((a, b) => b - a);
    
    // Xóa trong thead
    const theadRows = table.querySelectorAll('thead tr');
    theadRows.forEach(tr => {
      commonCols.forEach(c => {
        if (tr.cells[c]) tr.deleteCell(c);
      });
    });
    
    // Xóa trong tfoot (nếu có)
    const tfootRows = table.querySelectorAll('tfoot tr');
    tfootRows.forEach(tr => {
      commonCols.forEach(c => {
        if (tr.cells[c]) tr.deleteCell(c);
      });
    });
    
    // Xóa trong tbody
    rows.forEach(tr => {
      commonCols.forEach(c => {
        if (tr.cells[c]) tr.deleteCell(c);
      });
    });
  }
  
  return commonInfo;
}

// Helper: Tính toán cộng dồn và điền dòng tổng cộng cho toàn bộ cột số trong bảng chi tiết
function addOrUpdateHtmlSummaryRow(table) {
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  if (rows.length === 0) return;
  
  const lastRow = rows[rows.length - 1];
  const hasSummaryRow = lastRow && (lastRow.innerText.toLowerCase().includes('tổng') || lastRow.querySelectorAll('td.text-danger').length > 0 || lastRow.cells.length < 5);
  const dataRows = hasSummaryRow ? rows.slice(0, -1) : rows;
  if (dataRows.length === 0) return;
  
  const headRow = table.querySelector('thead tr');
  if (!headRow) return;
  const colCount = headRow.cells.length;
  
  const isNumericString = (str) => {
    if (!str) return false;
    const clean = str.replace(/[., đ%vN]/gi, '').trim();
    if (clean === '') return false;
    return /^-?[0-9]+$/.test(clean);
  };

  const getNumericValue = (str) => {
    if (!str) return 0;
    const clean = str.replace(/[., đ%vN]/gi, '').trim();
    return parseInt(clean, 10) || 0;
  };
  
  const columnsToSum = [];
  for (let c = 1; c < colCount; c++) {
    const headText = headRow.cells[c]?.innerText?.trim()?.toLowerCase() || '';
    const isVatAmount = headText.includes('thuế vat') || headText.includes('tiền thuế vat');
    const isExcluded = headText.includes('số vé') || 
                       headText.includes('ngày') || 
                       headText.includes('ghi chú') || 
                       headText.includes('stt') || 
                       headText.includes('mã pnr') || 
                       headText.includes('booker') || 
                       headText.includes('%') || 
                       (headText.includes('vat') && !isVatAmount);
    if (isExcluded) {
      continue;
    }
    
    const vals = dataRows.map(row => row.cells[c] ? row.cells[c].innerText.trim() : '');
    const nonEmpties = vals.filter(v => v !== '');
    if (nonEmpties.length === 0) continue;
    
    const allNumeric = nonEmpties.every(v => isNumericString(v));
    if (allNumeric) {
      let sum = 0;
      nonEmpties.forEach(v => {
        sum += getNumericValue(v);
      });
      columnsToSum.push({ index: c, total: sum });
    }
  }
  
  const formatValue = (num, colIdx) => {
    const sampleVal = dataRows.find(r => r.cells[colIdx] && r.cells[colIdx].innerText.trim() !== '')?.cells[colIdx]?.innerText || '';
    if (sampleVal.includes('%')) {
      return num + '%';
    }
    return new Intl.NumberFormat('vi-VN').format(num);
  };
  
  let summaryRowElement;
  if (hasSummaryRow) {
    summaryRowElement = lastRow;
  } else {
    summaryRowElement = document.createElement('tr');
    summaryRowElement.style.fontWeight = 'bold';
    summaryRowElement.style.background = '#f8fafc';
    summaryRowElement.className = 'skyjet-auto-summary-row';
    
    for (let c = 0; c < colCount; c++) {
      const td = document.createElement('td');
      td.style.padding = '10px 8px';
      summaryRowElement.appendChild(td);
    }
    table.querySelector('tbody').appendChild(summaryRowElement);
  }
  
  // Fill values in summary row
  for (let c = 0; c < colCount; c++) {
    const cell = summaryRowElement.cells[c];
    if (!cell) continue;
    
    // Nếu đã có dòng tổng hợp của ERP, ta chỉ cập nhật các cột số tiền cần tính tổng
    if (hasSummaryRow) {
      const sumInfo = columnsToSum.find(item => item.index === c);
      if (sumInfo) {
        cell.innerText = formatValue(sumInfo.total, c);
        cell.style.color = '#10b981';
        cell.style.fontWeight = 'bold';
      }
    } else {
      // Nếu chưa có dòng tổng hợp/mới tinh, ta điền các nhãn và giá trị tổng cộng
      if (c === 0) {
        cell.innerText = '∑';
        cell.style.color = '#1e3a8a';
        cell.style.fontWeight = 'bold';
        cell.style.textAlign = 'center';
      } else if (c === 1) {
        cell.innerText = 'Tổng cộng';
        cell.style.color = '#1e3a8a';
        cell.style.fontWeight = 'bold';
      } else {
        const sumInfo = columnsToSum.find(item => item.index === c);
        if (sumInfo) {
          cell.innerText = formatValue(sumInfo.total, c);
          cell.style.color = '#10b981';
          cell.style.fontWeight = 'bold';
        } else {
          cell.innerText = '';
        }
      }
    }
  }
}

// Helper: Thiết kế bảng thông tin kết quả vé cực kỳ đẹp mắt
function showModalResults(orderCode, parsedTable, clickedTicketNum) {
  const overlay = document.getElementById('skyjet-modal-overlay');
  if (!overlay) return;
  
  const container = overlay.querySelector('.skyjet-modal-container');
  container.style.maxWidth = '1400px';
  container.style.width = '95%';
  
  const rows = Array.from(parsedTable.querySelectorAll('tbody tr'));
  let totalAmountStr = '0';
  let ticketCount = rows.length;
  let airlines = [];
  let routes = [];
  
  // Phân tích dữ liệu trong bảng để xuất thống kê thẻ thông minh
  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length > 10) {
      const route = cells[8]?.innerText?.trim() || '';
      const air = cells[10]?.innerText?.trim() || '';
      if (route && !routes.includes(route)) routes.push(route);
      if (air && !airlines.includes(air)) airlines.push(air);
    }
  });
  
  // Tính tổng tiền dựa trên dòng cuối (nếu có dòng summary) hoặc cộng dồn thủ công
  const lastRow = rows[rows.length - 1];
  const hasSummaryRow = lastRow && (lastRow.innerText.toLowerCase().includes('tổng') || lastRow.querySelectorAll('td.text-danger').length > 0 || lastRow.cells.length < 5);
  
  if (hasSummaryRow) {
    ticketCount = Math.max(0, ticketCount - 1);
    const cells = Array.from(lastRow.querySelectorAll('td'));
    if (cells.length > 25) {
      totalAmountStr = cells[25]?.innerText?.trim() || '0';
    }
  } else {
    let sum = 0;
    rows.forEach(r => {
      const cells = r.querySelectorAll('td');
      if (cells.length > 25) {
        const valStr = cells[25].innerText.replace(/[^0-9]/g, '');
        sum += parseInt(valStr) || 0;
      }
    });
    totalAmountStr = new Intl.NumberFormat('vi-VN').format(sum);
  }

  // Đánh dấu nổi bật dòng vé được chọn từ bảng công nợ tương ứng TRƯỚC KHI tối ưu xóa cột
  if (clickedTicketNum) {
    const cleanClicked = clickedTicketNum.replace(/s+/g, '').toLowerCase();
    
    // Lưu vào biến toàn cục để người dùng debug console
    window.skyjetLastClickedTicket = clickedTicketNum;
    window.skyjetCleanClicked = cleanClicked;
    console.log('[Skyjet Debug] Clicked ticket original/extracted:', clickedTicketNum);
    console.log('[Skyjet Debug] Clicked ticket normalized (target):', cleanClicked);
    
    const detailRows = parsedTable.querySelectorAll('tbody tr');
    detailRows.forEach((dRow, rowIndex) => {
      const cells = Array.from(dRow.cells);
      // Tìm ô chứa số vé
      const numberCell = cells.find((cell, cellIndex) => {
        const cellText = cell.innerText.trim().replace(/s+/g, '').toLowerCase();
        
        console.log('[Skyjet Debug] Row ' + rowIndex + ' Cell ' + cellIndex + ': text="' + cellText + '" vs target="' + cleanClicked + '" -> ' + (cellText === cleanClicked ? 'MATCH!' : 'NO'));
        // So khớp chính xác tuyệt đối sau khi loại bỏ khoảng trắng
        return cellText === cleanClicked;
      });

      if (numberCell) {
        dRow.classList.add('skyjet-highlighted-row');
        dRow.style.backgroundColor = '#fef3c7'; // Màu nền vàng dịu nhẹ sang trọng
        dRow.style.color = '#1e293b';
        dRow.style.fontWeight = 'bold';
        
        const originalText = numberCell.innerText.trim();
        numberCell.innerHTML = '<span style="color: #b45309; font-weight: 800; font-family: monospace;">' + originalText + '</span>';
      }
    });
  }

  // Tối ưu các giá trị trùng lặp 100% trong bảng chi tiết của Skyjet ERP jambo_table
  const commonColsInfo = optimizeHtmlTable(parsedTable);
  addOrUpdateHtmlSummaryRow(parsedTable);
  
  let commonFieldsHtml = '';
  // Chỉ hiển thị DỮ LIỆU ĐỒNG BỘ CHUNG nếu có từ 2 vé trở lên
  if (ticketCount > 1 && commonColsInfo && commonColsInfo.length > 0) {
    const badges = commonColsInfo.map(meta => {
      return `
        <div class="skyjet-sync-badge">
          <span style="font-size: 12px;">${meta.icon}</span>
          <span class="skyjet-sync-badge-label">${meta.label}:</span>
          <span class="skyjet-sync-badge-value">${meta.value}</span>
        </div>
      `;
    }).join('');
    
    commonFieldsHtml = `
      <div class="skyjet-sync-container">
        <div class="skyjet-sync-header">
          <span style="display: inline-block; width: 6px; height: 6px; background: #22c55e; border-radius: 50%;"></span>
          DỮ LIỆU ĐỒNG BỘ CHUNG (Đã tối ưu ẩn khỏi bảng bên dưới để tránh lặp dư thừa):
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${badges}
        </div>
      </div>
    `;
  }
  
  // RENDER EMBED CONTENT CHẤT LƯỢNG CAO
  let embedHtmlContent = '';
  if (ticketCount === 1) {
    const headRow = parsedTable.querySelector('thead tr');
    const dataRows = hasSummaryRow ? rows.slice(0, -1) : rows;
    const singleRow = dataRows[0];
    const colCount = headRow ? headRow.cells.length : 0;
    
    const infoFields = [];
    const priceFields = [];
    let totalPriceVal = totalAmountStr;
    let supplierPriceVal = '';
    
    if (headRow && singleRow) {
      for (let c = 0; c < colCount; c++) {
        const label = headRow.cells[c]?.innerText?.trim() || "";
        const value = singleRow.cells[c]?.innerText?.trim() || "";
        if (!label || label.toLowerCase() === 'stt' || label === '∑') continue;
        
        const lowerLabel = label.toLowerCase();
        
        if (lowerLabel.includes('tổng tiền') || lowerLabel.includes('tổng thanh toán')) {
          totalPriceVal = value || totalPriceVal;
        } else if (lowerLabel.includes('giá ncc') || lowerLabel.includes('giá net')) {
          supplierPriceVal = value;
        }
        
        const isPriceField = lowerLabel.includes('giá') || 
                             lowerLabel.includes('phí') || 
                             lowerLabel.includes('thuế') || 
                             lowerLabel.includes('vat') || 
                             lowerLabel.includes('tạm tính') || 
                             lowerLabel.includes('phải trả') || 
                             lowerLabel.includes('hoa hồng') || 
                             lowerLabel.includes('tiền');
                             
        const icon = lowerLabel.includes('vé') ? '🎟️' :
                     lowerLabel.includes('pnr') ? '🔑' :
                     (lowerLabel.includes('hướng') || lowerLabel.includes('hành trình')) ? '📍' :
                     lowerLabel.includes('hãng') ? '✈️' :
                     lowerLabel.includes('hạng') ? '💺' :
                     lowerLabel.includes('ngày') ? '📅' :
                     lowerLabel.includes('booker') ? '👥' :
                     lowerLabel.includes('khách') || lowerLabel.includes('diễn giải') || lowerLabel.includes('ghi chú') ? '👤' : '📄';
                     
        const fieldData = { label, value, icon };
        
        if (isPriceField) {
          priceFields.push(fieldData);
        } else {
          infoFields.push(fieldData);
        }
      }
    }
    
    const infoHtml = infoFields.map(f => {
      const isFull = f.label.toLowerCase().includes('khách') || f.label.toLowerCase().includes('diễn giải') || f.label.toLowerCase().includes('ghi chú');
      return `
        <div class="skyjet-single-card-field ${isFull ? 'skyjet-single-card-field-full' : ''}">
          <span class="skyjet-single-card-field-label">${f.icon} ${f.label}</span>
          <span class="skyjet-single-card-field-value ${f.label.toLowerCase().includes('vé') || f.label.toLowerCase().includes('pnr') ? 'skyjet-single-card-field-value-mono' : ''}">${f.value || '—'}</span>
        </div>
      `;
    }).join('');
    
    const priceHtml = priceFields.filter(f => {
      const lower = f.label.toLowerCase();
      return !lower.includes('tổng tiền') && !lower.includes('tổng thanh toán') && !lower.includes('giá ncc') && !lower.includes('giá net');
    }).map(f => {
      return `
        <div class="skyjet-single-card-field">
          <span class="skyjet-single-card-field-label">💰 ${f.label}</span>
          <span class="skyjet-single-card-field-value skyjet-single-card-field-value-mono">${f.value || '0'}</span>
        </div>
      `;
    }).join('');
    
    const supplierPriceDiv = supplierPriceVal ? `
      <div style="text-align: right;">
        <span class="skyjet-single-card-field-label" style="color: #64748b; display: block !important; margin-bottom: 2px !important; text-align: right !important;">Giá Net Nhà Cung Cấp</span>
        <span class="skyjet-single-card-field-value skyjet-single-card-field-value-mono" style="color: #475569; font-size: 13px !important; display: block !important; text-align: right !important;">${supplierPriceVal}</span>
      </div>
    ` : '';
    
    embedHtmlContent = `
      <div class="skyjet-single-row-container">
        <div class="skyjet-single-card-block">
          <div class="skyjet-single-card-header" style="color: #1a56db; font-size: 12px !important;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"></path><path d="M2 21h20"></path><path d="M10 7h4"></path><path d="M10 11h4"></path><path d="M10 15h4"></path></svg>
            Thông tin đặt vé
          </div>
          <div class="skyjet-single-card-grid">
            ${infoHtml}
          </div>
        </div>
        
        <div class="skyjet-single-card-block">
          <div class="skyjet-single-card-header" style="color: #10b981; font-size: 12px !important;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="4" x2="12" y2="20"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>
            Tài chính &amp; Thanh toán
          </div>
          <div class="skyjet-single-card-grid">
            ${priceHtml}
            
            <div class="skyjet-single-card-total-box">
              <div style="text-align: left;">
                <span class="skyjet-single-card-field-label" style="color: #047857; display: block !important; margin-bottom: 2px !important; text-align: left !important;">Tổng thanh toán cuối</span>
                <span class="skyjet-single-card-field-value skyjet-single-card-field-value-mono" style="color: #10b981; font-size: 16px !important; font-weight: 800 !important; display: block !important; text-align: left !important;">${totalPriceVal} <span style="font-size: 11px !important; font-weight: normal !important; text-transform: lowercase;">vnđ</span></span>
              </div>
              ${supplierPriceDiv}
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    embedHtmlContent = `
      <div id="skyjet-embed-table" class="skyjet-clean-table-wrapper">
        <!-- Bảng gốc của Skyjet ERP được gắn vào đây -->
      </div>
    `;
  }
  
  const body = overlay.querySelector('.skyjet-modal-body');
  body.innerHTML = `
    ${commonFieldsHtml}
    
    <div class="skyjet-modal-section-title">
      <span class="skyjet-modal-section-title-bar"></span>
      ${ticketCount === 1 ? 'Báo cáo chi tiết vé đơn hàng (Tối ưu dạng thẻ gọn):' : 'Chi tiết báo cáo các vé của đơn hàng:'}
    </div>
    
    ${embedHtmlContent}
  `;
  
  const embedContainer = body.querySelector('#skyjet-embed-table');
  if (embedContainer) {
    embedContainer.appendChild(parsedTable);
    
    parsedTable.removeAttribute('style');
    parsedTable.className = 'table table-striped jambo_table bulk_action';
  }
  
  let footer = container.querySelector('.skyjet-modal-footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'skyjet-modal-footer';
    container.appendChild(footer);
  }
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.style.alignItems = 'center';
  footer.style.gap = '10px';
  footer.style.flexWrap = 'wrap';

  footer.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center;">
      <button type="button" data-url="/OrderReportArea/OrderReport/SearchAllOrder?&i=13&OrderReferenceId=${orderCode}${clickedTicketNum ? `&TicketNumber=${clickedTicketNum}` : ''}&skyjet_hide_nav=true" class="skyjet-open-origin-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        Mở đơn hàng gốc
      </button>
      <button type="button" class="skyjet-close-modal-btn">Đóng cửa sổ</button>
    </div>
  `;
  footer.querySelector('.skyjet-close-modal-btn').addEventListener('click', () => overlay.remove());
  const openOriginBtn = footer.querySelector('.skyjet-open-origin-btn');
  if (openOriginBtn) {
    openOriginBtn.addEventListener('click', () => {
      const url = openOriginBtn.getAttribute('data-url');
      if (url) window.open(url, '_blank');
    });
  }
}

function handleSplitDescription() {
  const table = document.getElementById('tableContent');
  if (!table) return;

  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    if (!chrome.runtime || !chrome.runtime.id) return;

    chrome.storage.local.get(['skyjet_split_desc'], (res) => {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
      if (chrome.runtime.lastError) return;

      const active = !!res.skyjet_split_desc;
      if (active) {
        applySplitDescription(table);
      } else {
        revertSplitDescription(table);
      }
    });
  } catch (e) {
    // Ignore context invalidation error
  }
}

function applySplitDescription(table) {
  if (!table.dataset.originalHtml) {
    table.dataset.originalHtml = table.innerHTML;
  }

  function cleanItinerary(s) {
    if (!s) return '';
    
    const parts = s.split(/[^A-Za-z]+/).filter(Boolean).map(p => p.toUpperCase());
    const airports = [];
    
    for (const p of parts) {
      if (p.length === 2) {
        continue;
      }
      if (p.length >= 3 && (p.length - 3) % 5 === 0) {
        const k = (p.length - 3) / 5;
        for (let j = 0; j <= k; j++) {
          airports.push(p.substring(j * 5, j * 5 + 3));
        }
      } else {
        for (let i = 0; i < p.length; i += 3) {
          const chunk = p.substring(i, i + 3);
          if (chunk.length === 3) {
            airports.push(chunk);
          }
        }
      }
    }
    
    if (airports.length >= 2) {
      return airports.join('-');
    }
    return s.replace(/[^A-Za-z]/g, '').toUpperCase();
  }

  const headers = Array.from(table.querySelectorAll('thead th'));
  let descColIndex = -1;
  let loaiVeColIdx = -1;
  for (let i = 0; i < headers.length; i++) {
    const text = headers[i].innerText.trim().toLowerCase();
    if (text === 'diễn giải' || text.includes('nội dung') || text.includes('description')) {
      descColIndex = i;
    } else if (text === 'loại vé' || text === 'loai ve') {
      loaiVeColIdx = i;
    }
  }

  if (descColIndex === -1) {
    return;
  }

  const theadTr = table.querySelector('thead tr');
  if (theadTr) {
    const thDesc = theadTr.cells[descColIndex];
    const thLoaiVe = loaiVeColIdx !== -1 ? theadTr.cells[loaiVeColIdx] : null;

    const thTicket = document.createElement('th');
    thTicket.innerText = 'Số vé';
    thTicket.style.textAlign = 'center';
    
    const thRoute = document.createElement('th');
    thRoute.innerText = 'Hành trình';
    thRoute.style.textAlign = 'center';
    
    const thGuest = document.createElement('th');
    thGuest.innerText = 'Tên khách';
    thGuest.style.textAlign = 'center';
    thGuest.classList.add('skyjet-col-passenger');

    theadTr.insertBefore(thTicket, thDesc);
    theadTr.insertBefore(thRoute, thDesc);
    theadTr.insertBefore(thGuest, thDesc);
    thDesc.remove();

    if (thLoaiVe) {
      theadTr.insertBefore(thLoaiVe, thRoute);
    }
  }

  const currentHeaders = Array.from(table.querySelectorAll('thead th'));
  let orderCodeIndex = -1;
  for (let i = 0; i < currentHeaders.length; i++) {
    const text = currentHeaders[i].innerText.trim().toLowerCase();
    if (text === 'mã đơn hàng' || text.includes('đơn hàng') || text.includes('mã đh')) {
      orderCodeIndex = i;
      break;
    }
  }
  if (orderCodeIndex === -1) orderCodeIndex = 5;

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  
  rows.forEach(row => {
    const rowText = row.innerText.toLowerCase();
    if (rowText.includes('tổng cộng') || rowText.includes('cộng') || row.classList.contains('skyjet-auto-summary-row')) {
      return;
    }
    
    if (row.dataset.splitDescProcessed === "true") {
      return;
    }

    const cells = Array.from(row.cells);
    const orderCodeVal = cells[orderCodeIndex]?.innerText?.trim() || '';
    let cleanCode = cells[orderCodeIndex]?.querySelector('.skyjet-btn span')?.innerText?.trim() || orderCodeVal;
    if (cleanCode) cleanCode = cleanCode.split('*')[0].trim();
    const hasOrderCode = cleanCode && cleanCode !== '0' && cleanCode.length >= 3 && !cleanCode.includes('Tổng') && !cleanCode.includes('TỔNG');

    const descCell = cells[descColIndex];
    const loaiVeCell = loaiVeColIdx !== -1 ? cells[loaiVeColIdx] : null;
    if (!descCell) return;
    
    const descText = descCell.innerText.trim();

    let ticketNum = '';
    let itinerary = '';
    let guestName = '';

    if (hasOrderCode) {
      const majorParts = descText.split(' - ').map(p => p.trim());
      if (majorParts.length >= 2) {
        ticketNum = majorParts[0];
        itinerary = cleanItinerary(majorParts[1]);
        if (majorParts.length >= 3) {
          guestName = majorParts.slice(2).join(' - ');
        }
      } else {
        const parts = descText.split('-');
        if (parts.length > 0) {
          let ticketParts = [parts[0].trim()];
          let currentIdx = 1;
          for (; currentIdx < parts.length; currentIdx++) {
            const currentPart = parts[currentIdx].trim();
            if (currentPart.length < 3) {
              ticketParts.push(currentPart);
            } else {
              break;
            }
          }
          ticketNum = ticketParts.join('-');
          
          if (currentIdx < parts.length) {
            itinerary = cleanItinerary(parts[currentIdx].trim());
            currentIdx++;
          }
          
          if (currentIdx < parts.length) {
            guestName = parts.slice(currentIdx).map(p => p.trim()).join(' - ');
          }
        }
      }
    } else {
      guestName = descText;
    }

    const tdTicket = document.createElement('td');
    tdTicket.innerText = ticketNum;
    tdTicket.style.textAlign = 'center';
    
    const tdRoute = document.createElement('td');
    tdRoute.innerText = itinerary;
    tdRoute.style.textAlign = 'center';
    
    const tdGuest = document.createElement('td');
    tdGuest.innerText = guestName;
    tdGuest.style.textAlign = 'left';
    tdGuest.classList.add('skyjet-col-passenger');

    row.insertBefore(tdTicket, descCell);
    row.insertBefore(tdRoute, descCell);
    row.insertBefore(tdGuest, descCell);
    descCell.remove();

    if (loaiVeCell) {
      row.insertBefore(loaiVeCell, tdRoute);
    }

    row.dataset.splitDescProcessed = "true";
    decorateLoaiVeWithAsterisk(row, table);
  });

  table.dataset.splitDescActive = "true";
  ensureHangVePosition(table);
}
function revertSplitDescription(table) {
  if (table.dataset.splitDescActive === "true" && table.dataset.originalHtml) {
    table.innerHTML = table.dataset.originalHtml;
    delete table.dataset.originalHtml;
    delete table.dataset.splitDescActive;
    delete table.dataset.decoratedBySkyjet;
    processTransactionTable();
  }
}
