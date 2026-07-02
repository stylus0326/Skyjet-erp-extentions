import { ExtensionFile } from '../types';

export const popupJsFile: ExtensionFile = {
  name: 'popup.js',
  path: 'popup.js',
  language: 'javascript',
  description: 'Script điều khiển các chức năng và tương tác trên màn hình popup.',
  content: `document.addEventListener('DOMContentLoaded', () => {
  const consentScreen = document.getElementById('consent-screen');
  const mainAppUi = document.getElementById('main-app-ui');
  const consentAcceptBtn = document.getElementById('consent-accept-btn');
  const consentDeclineBtn = document.getElementById('consent-decline-btn');

  function checkConsent() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['skyjet_user_consent'], (result) => {
        if (result && result.skyjet_user_consent === true) {
          consentScreen.style.display = 'none';
          mainAppUi.style.display = 'block';
        } else {
          consentScreen.style.display = 'flex';
          mainAppUi.style.display = 'none';
        }
      });
    } else {
      consentScreen.style.display = 'none';
      mainAppUi.style.display = 'block';
    }
  }

  if (consentAcceptBtn && consentDeclineBtn) {
    consentAcceptBtn.addEventListener('click', () => {
      chrome.storage.local.set({ skyjet_user_consent: true }, () => {
        checkConsent();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'update_visibility' });
          }
        });
      });
    });
    consentDeclineBtn.addEventListener('click', () => {
      window.close();
    });
  }

  checkConsent();

  // Extension activation toggle logic
  const extensionActiveToggle = document.getElementById('extension-active-toggle');
  if (extensionActiveToggle && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['extensionDisabled'], (result) => {
      extensionActiveToggle.checked = !result.extensionDisabled;
    });

    extensionActiveToggle.addEventListener('change', () => {
      const isDisabled = !extensionActiveToggle.checked;
      chrome.storage.local.set({ extensionDisabled: isDisabled }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].url) {
            const url = tabs[0].url;
            if (url.includes('erp.skyjet.vn') || url.includes('flightvn.com')) {
              chrome.tabs.reload(tabs[0].id);
            }
          }
        });
      });
    });
  }

  const versionEl = document.getElementById('ext-version');
  if (versionEl && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    versionEl.textContent = 'v' + chrome.runtime.getManifest().version;
  }
  const listEl = document.getElementById('sections-list');
  if (listEl) {
    listEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingItem = listEl.querySelector('.dragging');
      if (!draggingItem) return;
      const siblings = [...listEl.querySelectorAll('.drag-item:not(.dragging)')];
      const nextSibling = siblings.find(sibling => {
        const box = sibling.getBoundingClientRect();
        const offset = e.clientY - box.top - box.height / 2;
        return offset < 0;
      });
      listEl.insertBefore(draggingItem, nextSibling);
    });
  }
  const toggleHideChecksBtn = document.getElementById('toggle-hide-checks');
  if (toggleHideChecksBtn && listEl) {
    toggleHideChecksBtn.addEventListener('click', () => {
      const isHidden = listEl.classList.contains('hide-checkboxes');
      if (isHidden) {
        listEl.classList.remove('hide-checkboxes');
        toggleHideChecksBtn.textContent = 'Ẩn check ẩn';
      } else {
        listEl.classList.add('hide-checkboxes');
        toggleHideChecksBtn.textContent = 'Hiện check ẩn';
      }
    });
  }
  const customListEl = document.getElementById('custom-links-list');
  const addBtn = document.getElementById('add-custom-btn');
  const titleInput = document.getElementById('custom-title-input');
  const urlInput = document.getElementById('custom-url-input');
  const customGridEl = document.getElementById('custom-menu-grid');
  const customContainer = document.getElementById('custom-menu-container');
  const iconPickerGrid = document.getElementById('icon-picker-grid');
  const startPickerBtn = document.getElementById('start-picker-btn');

  if (startPickerBtn) {
    startPickerBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'start_picker' });
          window.close();
        }
      });
    });
  }

  // 50 CRM and ERP related icons (plain SVGs using currentColor)
  const crmIcons = {
    'user': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>\`,
    'users': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>\`,
    'user-plus': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>\`,
    'phone': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72(12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>\`,
    'mail': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>\`,
    'message-square': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>\`,
    'briefcase': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>\`,
    'dollar-sign': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>\`,
    'shopping-cart': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>\`,
    'shopping-bag': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>\`,
    'trending-up': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>\`,
    'trending-down': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>\`,
    'bar-chart-2': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>\`,
    'pie-chart': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>\`,
    'activity': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>\`,
    'target': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>\`,
    'award': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>\`,
    'percent': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>\`,
    'gift': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>\`,
    'calendar': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>\`,
    'clock': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>\`,
    'file-text': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>\`,
    'folder': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\`,
    'database': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>\`,
    'server': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>\`,
    'credit-card': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>\`,
    'landmark': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><path d="m12 2 8 4H4z"/></svg>\`,
    'shield': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>\`,
    'key': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>\`,
    'lock': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>\`,
    'unlock': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>\`,
    'settings': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>\`,
    'bell': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>\`,
    'help-circle': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>\`,
    'search': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>\`,
    'send': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>\`,
    'star': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>\`,
    'heart': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>\`,
    'globe': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>\`,
    'link': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>\`,
    'tag': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>\`,
    'truck': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>\`,
    'check-square': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>\`,
    'map-pin': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>\`,
    'edit': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>\`,
    'trash': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>\`,
    'tool': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>\`,
    'cloud': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-.79A7 7 0 0 0 4 6c0 3.87 3.13 7 7 7h9a5 5 0 0 0 0-10H18z"/></svg>\`,
    'terminal': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>\`,
    'compass': \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>\`
  };

  let selectedIconKey = 'link';

  // Initialize Icon Picker Grid
  function initIconPicker() {
    iconPickerGrid.innerHTML = '';
    Object.entries(crmIcons).forEach(([key, svgContent]) => {
      const btn = document.createElement('div');
      btn.className = 'icon-choice' + (key === selectedIconKey ? ' selected' : '');
      btn.dataset.key = key;
      btn.innerHTML = svgContent;
      
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedIconKey = key;
        document.querySelectorAll('.icon-choice').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
      });
      iconPickerGrid.appendChild(btn);
    });
  }

  function updateQuickMenu() {
    chrome.storage.local.get(['customShortcuts', 'hiddenSections'], (result) => {
      const custom = result.customShortcuts || [];
      const hidden = result.hiddenSections || [];

      // RENDER CUSTOM SHORTCUTS MENU
      const customItems = custom.filter(item => !hidden.includes(item.title));
      const displayCustom = customItems.slice(0, 9);
      customGridEl.innerHTML = '';

      if (displayCustom.length > 0) {
        displayCustom.forEach(item => {
          const gridItem = document.createElement('a');
          gridItem.className = 'grid-item';
          gridItem.href = item.url || '#';
          
          const circle = document.createElement('div');
          circle.className = 'grid-icon-circle';
          
          // Use chosen icon or fallback
          const matchedIcon = crmIcons[item.iconKey] || crmIcons['link'];
          circle.innerHTML = matchedIcon;

          const label = document.createElement('span');
          label.className = 'grid-label';
          label.textContent = item.title;

          gridItem.appendChild(circle);
          gridItem.appendChild(label);

          gridItem.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.url) {
              let targetUrl = item.url;
              if (targetUrl.includes('?')) {
                targetUrl += '&skyjet_hide_nav=true';
              } else {
                targetUrl += '?skyjet_hide_nav=true';
              }
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url) {
                  try {
                    const urlObj = new URL(tabs[0].url);
                    if (urlObj.hostname === 'erp.skyjet.vn') {
                      chrome.tabs.update(tabs[0].id, { url: targetUrl });
                      window.close();
                      return;
                    }
                  } catch (err) {}
                }
                chrome.tabs.create({ url: targetUrl });
              });
            }
          });

          customGridEl.appendChild(gridItem);
        });
        customContainer.style.display = 'block';
      } else {
        customContainer.style.display = 'none';
      }
    });
  }

  function getNormalizedUrl(urlStr) {
    if (!urlStr) return '';
    try {
      const urlObj = new URL(urlStr);
      urlObj.searchParams.delete('skyjet_hide_nav');
      urlObj.searchParams.sort();
      let path = urlObj.pathname.toLowerCase();
      if (path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      return urlObj.hostname + path + '?' + urlObj.searchParams.toString();
    } catch (e) {
      return urlStr.toLowerCase();
    }
  }

  function checkShortcutBuilderVisibility(activeTabUrl) {
    if (!activeTabUrl) return;
    
    let isMenuPage = false;
    try {
      const urlObj = new URL(activeTabUrl);
      const path = urlObj.pathname.toLowerCase();
      isMenuPage = urlObj.hostname === 'erp.skyjet.vn' && 
                   (path === '/' || 
                    path === '/home' || 
                    path === '/home/index' || 
                    path === '/menuarea' || 
                    path === '/menuarea/index');
    } catch (e) {}

    const detailsCustomLinks = document.getElementById('details-custom-links');
    if (!detailsCustomLinks) return;

    if (isMenuPage) {
      detailsCustomLinks.style.display = 'none';
    } else {
      chrome.storage.local.get(['customShortcuts'], (res) => {
        const shortcuts = res.customShortcuts || [];
        const currentNorm = getNormalizedUrl(activeTabUrl);
        const alreadyAdded = shortcuts.some(sc => getNormalizedUrl(sc.url) === currentNorm);
        detailsCustomLinks.style.display = alreadyAdded ? 'none' : 'block';
      });
    }
  }

  // Tải danh sách menu nhanh lần đầu
  initIconPicker();
  updateQuickMenu();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const activeTab = tabs[0];
    
    // Auto fill custom link inputs if the active tab is erp.skyjet.vn
    if (activeTab.url && activeTab.url.includes('erp.skyjet.vn')) {
      if (urlInput) {
        let tabUrl = activeTab.url;
        try {
          const urlObj = new URL(tabUrl);
          urlObj.searchParams.set('skyjet_hide_nav', 'true');
          tabUrl = urlObj.toString();
        } catch (e) {}
        urlInput.value = tabUrl;
      }
      if (titleInput && activeTab.title) {
        const cleanTitle = activeTab.title.replace(/\\s*-\\s*Skyjet\\s*(ERP)?/i, '').trim();
        titleInput.value = cleanTitle;
      }
    }
    
    const settingsContainer = document.getElementById('settings-container');
    
    let isMenuPage = false;
    try {
      if (activeTab.url) {
        const urlObj = new URL(activeTab.url);
        const path = urlObj.pathname.toLowerCase();
        isMenuPage = urlObj.hostname === 'erp.skyjet.vn' && 
                     (path === '/' || 
                      path === '/home' || 
                      path === '/home/index' || 
                      path === '/menuarea' || 
                      path === '/menuarea/index');
      }
    } catch (e) {}

    checkShortcutBuilderVisibility(activeTab.url);

    if (isMenuPage) {
      if (settingsContainer) settingsContainer.style.display = 'block';
      chrome.tabs.sendMessage(activeTab.id, { action: 'get_sections' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.sections) {
          listEl.innerHTML = '<div style="font-size: 10.5px; color: #dc2626; padding: 4px 0; text-align: center;">Vui lòng F5 tải lại trang ERP để liên kết!</div>';
          return;
        }

        const sections = response.sections;
        if (sections.length === 0) {
          listEl.innerHTML = '<div style="font-size: 10.5px; color: #64748b; padding: 4px 0; text-align: center;">Không tìm thấy mục nào ở trang này.</div>';
          return;
        }

        chrome.storage.local.get(['hiddenSections', 'sectionOrder'], (result) => {
          const hiddenSections = result.hiddenSections || [];
          const sectionOrder = result.sectionOrder || [];
          listEl.innerHTML = ''; 

          function saveNewOrder() {
            const order = [];
            const items = listEl.querySelectorAll('.drag-item');
            items.forEach(item => {
              if (item.dataset.title) {
                order.push(item.dataset.title);
              }
            });
            chrome.storage.local.set({ sectionOrder: order }, () => {
              chrome.tabs.sendMessage(activeTab.id, { action: 'update_visibility' });
            });
          }
          // Sắp xếp các mục theo thứ tự đã lưu trước khi hiển thị
          sections.sort((a, b) => {
            let idxA = sectionOrder.indexOf(a.title);
            let idxB = sectionOrder.indexOf(b.title);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
          });

          sections.forEach((sec) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'drag-item';
            itemDiv.setAttribute('draggable', 'false');
            itemDiv.dataset.index = sec.index;
            itemDiv.dataset.title = sec.title;

            const handle = document.createElement('span');
            handle.className = 'drag-handle';
            handle.textContent = '☰';
            handle.style.cursor = 'grab';
            
            handle.addEventListener('mousedown', () => {
              itemDiv.setAttribute('draggable', 'true');
            });
            handle.addEventListener('mouseup', () => {
              itemDiv.setAttribute('draggable', 'false');
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'sec-' + sec.index;
            checkbox.checked = !hiddenSections.includes(sec.title);
            checkbox.style.cursor = 'pointer';
            checkbox.style.margin = '0';
            
            checkbox.addEventListener('change', () => {
              chrome.storage.local.get(['hiddenSections'], (res) => {
                let currentHiddens = res.hiddenSections || [];
                if (checkbox.checked) {
                  currentHiddens = currentHiddens.filter(h => h !== sec.title);
                } else {
                  if (!currentHiddens.includes(sec.title)) {
                    currentHiddens.push(sec.title);
                  }
                }
                chrome.storage.local.set({ hiddenSections: currentHiddens }, () => {
                  chrome.tabs.sendMessage(activeTab.id, { action: 'update_visibility' });
                  updateQuickMenu();
                });
              });
            });

            const label = document.createElement('label');
            label.htmlFor = 'sec-' + sec.index;
            label.textContent = sec.title;
            label.style.cursor = 'pointer';
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            label.style.whiteSpace = 'nowrap';
            label.style.flexGrow = '1';
            label.style.margin = '0';

            itemDiv.appendChild(handle);
            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);

            // Kéo thả HTML5
            itemDiv.addEventListener('dragstart', (e) => {
              itemDiv.classList.add('dragging');
              e.dataTransfer.setData('text/plain', sec.title);
            });

            itemDiv.addEventListener('dragend', () => {
              itemDiv.classList.remove('dragging');
              itemDiv.setAttribute('draggable', 'false');
              saveNewOrder();
            });

            listEl.appendChild(itemDiv);
          });
        });
      });
    } else {
      if (settingsContainer) settingsContainer.style.display = 'none';
    }

    let isSearchTransactionPage = false;
    try {
      if (activeTab.url) {
        const urlObj = new URL(activeTab.url);
        isSearchTransactionPage = urlObj.pathname.toLowerCase() === '/agentarea/agent/searchtransaction';
      }
    } catch (e) {}

    const searchTransContainer = document.getElementById('search-transaction-container');
    const splitDescCheckbox = document.getElementById('split-desc-checkbox');


    if (isSearchTransactionPage) {
      if (searchTransContainer) searchTransContainer.style.display = 'block';
      chrome.storage.local.get(['skyjet_split_desc'], (res) => {
        if (splitDescCheckbox) {
          splitDescCheckbox.checked = !!res.skyjet_split_desc;
        }
      });
      if (splitDescCheckbox) {
        splitDescCheckbox.onchange = () => {
          chrome.storage.local.set({ skyjet_split_desc: splitDescCheckbox.checked }, () => {
            chrome.tabs.sendMessage(activeTab.id, { action: 'update_split_desc' });
          });
        };
      }
    } else {
      if (searchTransContainer) searchTransContainer.style.display = 'none';
    }
  });

  // Quản lý Phím tắt tự tạo
  function renderCustomShortcuts() {
    chrome.storage.local.get(['customShortcuts'], (result) => {
      const shortcuts = result.customShortcuts || [];
      customListEl.innerHTML = '';
      if (shortcuts.length === 0) {
        customListEl.innerHTML = '<div style="font-size: 10px; color: var(--text-muted); text-align: center; padding: 4px 0;">Chưa có phím tắt tự tạo nào</div>';
        return;
      }
      shortcuts.forEach((sc, idx) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.background = 'var(--panel-bg)';
        item.style.padding = '4px 6px';
        item.style.borderRadius = '4px';
        item.style.fontSize = '11px';
        item.style.border = '1px solid var(--border)';
        
        const info = document.createElement('div');
        info.style.overflow = 'hidden';
        info.style.textOverflow = 'ellipsis';
        info.style.whiteSpace = 'nowrap';
        info.style.maxWidth = '180px';
        info.style.display = 'flex';
        info.style.alignItems = 'center';
        info.style.gap = '6px';

        const thumb = document.createElement('div');
        thumb.style.width = '18px';
        thumb.style.height = '18px';
        thumb.style.color = 'var(--logo-bg)';
        thumb.innerHTML = crmIcons[sc.iconKey] || crmIcons['link'];
        
        const textWrapper = document.createElement('div');
        
        const titleEl = document.createElement('strong');
        titleEl.style.color = 'var(--text-primary)';
        titleEl.textContent = sc.title;
        
        const brEl = document.createElement('br');
        
        const urlEl = document.createElement('span');
        urlEl.style.fontSize = '9px';
        urlEl.style.color = 'var(--text-muted)';
        urlEl.textContent = sc.url;
        
        textWrapper.appendChild(titleEl);
        textWrapper.appendChild(brEl);
        textWrapper.appendChild(urlEl);
        
        info.appendChild(thumb);
        info.appendChild(textWrapper);

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Xóa';
        delBtn.style.background = '#ef4444';
        delBtn.style.color = '#ffffff';
        delBtn.style.border = 'none';
        delBtn.style.borderRadius = '3px';
        delBtn.style.padding = '2px 6px';
        delBtn.style.fontSize = '9px';
        delBtn.style.cursor = 'pointer';
        
        delBtn.addEventListener('click', () => {
          const updated = shortcuts.filter((_, i) => i !== idx);
          chrome.storage.local.set({ customShortcuts: updated }, () => {
            renderCustomShortcuts();
            updateQuickMenu();
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'update_visibility' });
                if (tabs[0].url) {
                  checkShortcutBuilderVisibility(tabs[0].url);
                }
              }
            });
          });
        });
        
        item.appendChild(info);
        item.appendChild(delBtn);
        customListEl.appendChild(item);
      });
    });
  }

  addBtn.addEventListener('click', () => {
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    if (!title || !url) return;
    
    // Standardize URL and validate erp.skyjet.vn host
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (targetUrl.startsWith('erp.skyjet.vn')) {
        targetUrl = 'https://' + targetUrl;
      } else {
        if (!targetUrl.startsWith('/')) {
          targetUrl = '/' + targetUrl;
        }
        targetUrl = 'https://erp.skyjet.vn' + targetUrl;
      }
    }

    let isValid = false;
    try {
      const parsed = new URL(targetUrl);
      if (parsed.hostname === 'erp.skyjet.vn') {
        isValid = true;
      }
    } catch (e) {
      isValid = false;
    }

    if (!isValid) {
      alert('Lỗi: Đường dẫn phím tắt phải thuộc trang erp.skyjet.vn!');
      return;
    }

    chrome.storage.local.get(['customShortcuts'], (result) => {
      const shortcuts = result.customShortcuts || [];
      shortcuts.push({ title, url: targetUrl, iconKey: selectedIconKey });
      chrome.storage.local.set({ customShortcuts: shortcuts }, () => {
        titleInput.value = '';
        urlInput.value = '';
        selectedIconKey = 'link';
        initIconPicker();
        renderCustomShortcuts();
        updateQuickMenu();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'update_visibility' });
            if (tabs[0].url) {
              checkShortcutBuilderVisibility(tabs[0].url);
            }
          }
        });
      });
    });
  });

  renderCustomShortcuts();

});`
};
