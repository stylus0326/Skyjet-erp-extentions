import { ExtensionFile } from './types';
import { manifestFile } from './data/manifest';
import { globalFile } from './data/global';
import { searchTransactionFile } from './data/searchTransaction';
import { agencySalesFile } from './data/agencySales';
import { importBookingFile } from './data/importBooking';
import { backgroundFile } from './data/background';
import { injectCssFile } from './data/injectCss';
import { popupHtmlFile } from './data/popupHtml';
import { popupJsFile } from './data/popupJs';
import { mainWorldFile } from './data/mainWorld';

// Raw Chrome Extension Files to display and package
export const extensionFiles: ExtensionFile[] = [
  manifestFile,
  globalFile,
  searchTransactionFile,
  agencySalesFile,
  importBookingFile,
  backgroundFile,
  injectCssFile,
  popupHtmlFile,
  popupJsFile,
  mainWorldFile
];
