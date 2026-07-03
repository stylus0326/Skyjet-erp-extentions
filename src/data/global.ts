import { ExtensionFile } from '../types';

export const globalFile: ExtensionFile = {
  name: 'global.js',
  path: 'global.js',
  language: 'javascript',
  description: 'Script tiện ích dùng chung, quản lý trạng thái hiển thị Dashboard và MutationObserver.',
  content: `/**
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
    window.skyjetTimeout = setTimeout(() => {
      if (typeof processTransactionTable === 'function') processTransactionTable();
      if (typeof processAgencySalesTable === 'function') processAgencySalesTable();
      if (typeof removeCustomerCodeColumn === 'function') removeCustomerCodeColumn();
      if (typeof hideDuplicateDates === 'function') hideDuplicateDates();
      if (typeof shortenDocumentPrefix === 'function') shortenDocumentPrefix();
      if (typeof handleSearchTransactionCheck === 'function') handleSearchTransactionCheck();
      if (typeof handleSplitDescription === 'function') handleSplitDescription();
      if (typeof injectFundLimitInfo === 'function') injectFundLimitInfo();
    }, 150);
  }
});

// Chạy lần đầu tiên khi trang web được tải xong
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkConsentAndInit, 0);
  });
} else {
  setTimeout(checkConsentAndInit, 0);
}


function initSkyjetHelper() {
  if (window.skyjetHelperInitialized) return;
  window.skyjetHelperInitialized = true;

  if (window.location.hostname.includes('erp.skyjet.vn') || window.location.hostname.includes('agent.skyjet.vn') || window.location.hostname.includes('flightvn.com')) {
    const isHomepage = window.location.pathname === '/' || window.location.pathname === '';
    const cameFromLogin = document.referrer && (document.referrer.includes('/LoginArea/Login/Index') || document.referrer.includes('/Account/Login'));
    
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      if ((isHomepage && cameFromLogin) || safeGetSession('skyjet_session_config_refreshed') !== 'true') {
        chrome.runtime.sendMessage({ action: 'refresh_skyjet_config' }, (response) => {
          if (response && response.success) {
            safeSetSession('skyjet_session_config_refreshed', 'true');
            console.log('[Skyjet Helper] Config database refreshed successfully on login transition.');
          }
        });
      }
    }
  }

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
      try {
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
      } catch (e) {
        console.warn('[Skyjet Helper] Failed to replace state (possibly in data URI or sandboxed environment):', e);
      }
    }
    const tryHide = collapseLeftSidebar;
    tryHide();
    setTimeout(tryHide, 100);
    setTimeout(tryHide, 300);
    setTimeout(tryHide, 800);
    setTimeout(tryHide, 1500);
  }

  if (typeof handleAutoSearchQuery === 'function') handleAutoSearchQuery();
  if (typeof handleSearchTransactionQuery === 'function') handleSearchTransactionQuery();
  if (typeof handleSearchAllOrderQuery === 'function') handleSearchAllOrderQuery();
  if (typeof processTransactionTable === 'function') processTransactionTable();
  if (typeof processAgencySalesTable === 'function') processAgencySalesTable();
  if (typeof removeCustomerCodeColumn === 'function') removeCustomerCodeColumn();
  if (typeof hideDuplicateDates === 'function') hideDuplicateDates();
  if (typeof shortenDocumentPrefix === 'function') shortenDocumentPrefix();
  if (typeof handleSearchTransactionCheck === 'function') handleSearchTransactionCheck();
  if (typeof handleSplitDescription === 'function') handleSplitDescription();
  if (typeof injectFundLimitInfo === 'function') injectFundLimitInfo();
  
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
    if (typeof processTransactionTable === 'function') processTransactionTable();
    if (typeof processAgencySalesTable === 'function') processAgencySalesTable();
    if (typeof removeCustomerCodeColumn === 'function') removeCustomerCodeColumn();
    if (typeof hideDuplicateDates === 'function') hideDuplicateDates();
    if (typeof shortenDocumentPrefix === 'function') shortenDocumentPrefix();
    if (typeof handleSearchTransactionCheck === 'function') handleSearchTransactionCheck();
    if (typeof handleSplitDescription === 'function') handleSplitDescription();
    if (typeof injectFundLimitInfo === 'function') injectFundLimitInfo();
    if (typeof applyVisibilitySettings === 'function') {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        applyVisibilitySettings();
      }
    }
  }, 1500);
}

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
      if (typeof handleSplitDescription === 'function') handleSplitDescription();
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

  // Create temporary transparent cover masks for all visible iframes
  const iframeMasks = [];
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    const rect = iframe.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const mask = document.createElement('div');
      mask.className = 'skyjet-picker-iframe-mask';
      mask.style.cssText = \`
        position: fixed;
        left: \${rect.left}px;
        top: \${rect.top}px;
        width: \${rect.width}px;
        height: \${rect.height}px;
        z-index: 2147483646;
        background: transparent;
        cursor: crosshair;
      \`;
      document.body.appendChild(mask);
      iframeMasks.push(mask);
    }
  });
  
  const onMouseMove = (e) => {
    e.stopPropagation();
    
    // Temporarily hide masks so document.elementFromPoint can hit the underlying iframe
    iframeMasks.forEach(mask => mask.style.display = 'none');
    const el = document.elementFromPoint(e.clientX, e.clientY);
    iframeMasks.forEach(mask => mask.style.display = 'block');
    
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
    
    // Remove all temporary iframe masks
    iframeMasks.forEach(mask => {
      if (mask.parentNode) mask.parentNode.removeChild(mask);
    });
  }
  
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
}

function captureTab() {
  if (window.skyjetExtensionInvalidated) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: 'capture_tab_rect' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          resolve(null);
        } else {
          resolve(response.dataUrl);
        }
      });
    } catch (e) {
      if (e.message && e.message.includes('Extension context invalidated')) {
        window.skyjetExtensionInvalidated = true;
        console.warn('[Skyjet Helper] Extension context invalidated.');
      } else {
        console.error('Lỗi gửi tin nhắn captureTab:', e);
      }
      resolve(null);
    }
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
        statusText.innerText = \`Đang chụp cuộn: \${Math.round((currentScrollTop / totalHeight) * 100)}%\`;
        
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
        statusText.innerText = \`Đang chụp cuộn trang: \${progress}%\`;
        
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
    if (window.skyjetExtensionInvalidated) {
      if (statusText.parentNode) statusText.parentNode.removeChild(statusText);
      const styleEl = document.getElementById('skyjet-disable-hover-style');
      if (styleEl) styleEl.remove();
      alert('Tiện ích mở rộng đã được cập nhật hoặc tải lại. Vui lòng tải lại trang (F5) để tiếp tục sử dụng tính năng chụp ảnh.');
      return;
    }
    setTimeout(() => {
      try {
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
      } catch (e) {
        if (statusText.parentNode) {
          statusText.parentNode.removeChild(statusText);
        }
        const styleEl = document.getElementById('skyjet-disable-hover-style');
        if (styleEl) styleEl.remove();

        if (e.message && e.message.includes('Extension context invalidated')) {
          window.skyjetExtensionInvalidated = true;
          alert('Tiện ích mở rộng đã được cập nhật hoặc tải lại. Vui lòng tải lại trang (F5) để tiếp tục sử dụng tính năng chụp ảnh.');
        } else {
          console.error('Lỗi gửi tin nhắn capture_tab_rect:', e);
        }
      }
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
  window.showImagePreviewModal = showImagePreviewModal;
  let overlay = document.getElementById('skyjet-preview-overlay');
  if (overlay) overlay.remove();
  
  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  
  overlay = document.createElement('div');
  overlay.id = 'skyjet-preview-overlay';
  overlay.style.cssText = \`
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
  \`;

  overlay.innerHTML = \`
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
  \`;

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
    
    chrome.storage.local.get(['hiddenSections', 'sectionOrder', 'customShortcuts', 'skyjet_hide_nav'], (result) => {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
      if (chrome.runtime.lastError) return;
      
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

      // 1. Xóa phím tắt tự tạo cũ nếu có để dọn dẹp sạch sẽ
      document.querySelectorAll('.skyjet-custom-shortcut').forEach(el => el.remove());

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

function checkConsentAndInit() {
  const isMatchHost = window.location.hostname.includes('erp.skyjet.vn') || window.location.hostname.includes('agent.skyjet.vn') || window.location.hostname.includes('flightvn.com');
  if (!isMatchHost) return;

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['skyjet_user_consent', 'extensionDisabled'], (data) => {
      if (data && data.extensionDisabled === true) {
        console.log('[Skyjet Helper] Extension is disabled via popup toggle.');
        const overlay = document.getElementById('skyjet-consent-overlay');
        if (overlay) overlay.remove();
        return;
      }
      if (data && data.skyjet_user_consent === true) {
        initSkyjetHelper();
      } else {
        showConsentOverlay();
      }
    });
  } else {
    initSkyjetHelper();
  }
}

function showConsentOverlay() {
  if (document.getElementById('skyjet-consent-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'skyjet-consent-overlay';
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;';

  const card = document.createElement('div');
  card.style.cssText = 'background-color: #ffffff; color: #0f172a; width: 90%; max-width: 480px; padding: 24px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; box-sizing: border-box;';

  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;';

  const logo = document.createElement('div');
  logo.innerText = 'SJ';
  logo.style.cssText = 'background: #0284c7; color: #ffffff; font-weight: 800; border-radius: 6px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;';

  const title = document.createElement('div');
  title.innerHTML = '<h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1.2;">Skyjet ERP Helper</h3><span style="font-size: 11px; color: #64748b; font-weight: 500;">Thông báo quyền riêng tư & dữ liệu</span>';

  header.appendChild(logo);
  header.appendChild(title);

  const content = document.createElement('div');
  content.style.cssText = 'font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 24px; text-align: left;';
  content.innerHTML = '<p style="margin: 0 0 12px 0; font-weight: 600; color: #0f172a;">Tiện ích cần sự đồng ý của bạn để hoạt động:</p><ul style="margin: 0 0 16px 0; padding-left: 20px; list-style-type: disc;"><li style="margin-bottom: 6px;"><b>Đọc nội dung trang web:</b> Nhận diện mã đơn hàng, PNR, số vé hiển thị trên trang này để tạo phím tắt tra cứu nhanh.</li><li style="margin-bottom: 6px;"><b>Lưu trữ cấu hình cục bộ:</b> Lưu các cài đặt hiển thị, chiến dịch và chính sách trên thiết bị của bạn.</li><li style="margin-bottom: 6px;"><b>Truyền tải dữ liệu an toàn:</b> Gửi mã vé hoặc PNR để đối chiếu với cơ sở dữ liệu Supabase được cấp quyền của doanh nghiệp (không lưu trữ thông tin nhạy cảm bên ngoài).</li></ul><p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">Chúng tôi cam kết bảo mật thông tin và KHÔNG chia sẻ dữ liệu của bạn cho bất kỳ bên thứ ba nào. Bạn có thể thay đổi tùy chọn này bất cứ lúc nào trong cài đặt tiện ích.</p>';

  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; justify-content: flex-end; gap: 12px;';

  const declineBtn = document.createElement('button');
  declineBtn.innerText = 'Từ chối';
  declineBtn.style.cssText = 'padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background-color: #ffffff; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; transition: background-color 0.15s; outline: none;';
  declineBtn.onmouseover = () => declineBtn.style.backgroundColor = '#f8fafc';
  declineBtn.onmouseout = () => declineBtn.style.backgroundColor = '#ffffff';
  declineBtn.onclick = () => {
    overlay.remove();
  };

  const acceptBtn = document.createElement('button');
  acceptBtn.innerText = 'Tôi đồng ý';
  acceptBtn.style.cssText = 'padding: 8px 16px; border-radius: 6px; border: none; background-color: #0284c7; color: #ffffff; font-size: 13px; font-weight: 600; cursor: pointer; transition: background-color 0.15s; outline: none;';
  acceptBtn.onmouseover = () => acceptBtn.style.backgroundColor = '#0369a1';
  acceptBtn.onmouseout = () => acceptBtn.style.backgroundColor = '#0284c7';
  acceptBtn.onclick = () => {
    chrome.storage.local.set({ skyjet_user_consent: true }, () => {
      overlay.remove();
      initSkyjetHelper();
    });
  };

  actions.appendChild(declineBtn);
  actions.appendChild(acceptBtn);

  card.appendChild(header);
  card.appendChild(content);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.skyjet_user_consent && changes.skyjet_user_consent.newValue === true) {
      const overlay = document.getElementById('skyjet-consent-overlay');
      if (overlay) overlay.remove();
      initSkyjetHelper();
    }
  });
}
`
};
