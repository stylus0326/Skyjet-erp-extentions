import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Check, 
  AlertCircle, 
  Play, 
  RefreshCw, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Eye, 
  HelpCircle, 
  Sliders, 
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Upload,
  X,
  Camera
} from 'lucide-react';
import { Campaign, CampaignBlackoutPeriod, CampaignDetail, Policy, Threshold, Airport } from '../types';
import { CustomSelect } from './CustomSelect';

declare const chrome: any;

interface Transaction {
  stt: number;
  carrier: string; // E.g. "VN", "VJ", "9G", "VU", or "ACB..."
  bookingDate: string; // "DD/MM/YYYY"
  appliedDate?: string; // "DD/MM/YYYY"
  ticketType: string; // "Vé", "Vé*", "Hoàn", "Đổi" or ""
  orderCode: string;
  ticketNumber: string;
  bookingClass: string;
  journey: string;
  flightTime: string;
  passengerName: string;
  fare: number; // Giá vé
  sellingPrice: number; // Giá bán
  discount: number; // Chiết khấu (initially 0 or calculated)
  originalDiscount: number; // Chiết khấu ban đầu từ ảnh
  debt: number; // Nợ (sellingPrice - discount)
  credit: number; // Có
  balance: number; // Lũy kế
  balanceBefore?: number; // Số dư ngay trước giao dịch
  originalBalance?: number; // Lũy kế cũ từ ảnh/nguyên bản
  channel?: string;
  useOriginalDiscount?: boolean; // Khóa giữ chiết khấu gốc thay vì tính tự động
}

// Exactly represent the sample transactions from Image 2
const RAW_DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    stt: 1,
    carrier: "VN",
    bookingDate: "02/06/2026",
    ticketType: "Vé",
    orderCode: "E6F77K",
    ticketNumber: "7382321383143",
    bookingClass: "R",
    journey: "MNL-SGN",
    flightTime: "",
    passengerName: "COMIA PERMENTILLA SAMUEL MR",
    fare: 3168000,
    sellingPrice: 4362000,
    discount: 0,
    originalDiscount: 0,
    debt: 4362000,
    credit: 0,
    balance: 357200
  },
  {
    stt: 2,
    carrier: "ACB100620260007",
    bookingDate: "10/06/2026",
    ticketType: "",
    orderCode: "",
    ticketNumber: "",
    bookingClass: "",
    journey: "",
    flightTime: "",
    passengerName: "MBVCB.14606167826.271992.NGUYEN THI... (Nạp quỹ)",
    fare: 0,
    sellingPrice: 0,
    discount: 0,
    originalDiscount: 0,
    debt: 0,
    credit: 34000000,
    balance: 34357200
  },
  {
    stt: 3,
    carrier: "VJ",
    bookingDate: "10/06/2026",
    ticketType: "Vé",
    orderCode: "YGZFRE",
    ticketNumber: "VJAYGZFRE",
    bookingClass: "J",
    journey: "NRT-HAN",
    flightTime: "16:30 04/09/2026",
    passengerName: "NGUYEN THI NHU MRS",
    fare: 12638000,
    sellingPrice: 12648000,
    discount: 0,
    originalDiscount: 0,
    debt: 12648000,
    credit: 0,
    balance: 21709200
  },
  {
    stt: 4,
    carrier: "VJ",
    bookingDate: "10/06/2026",
    ticketType: "Vé",
    orderCode: "ZUAYR2",
    ticketNumber: "VJAZUAYR2",
    bookingClass: "I",
    journey: "HAN-NRT",
    flightTime: "07:55 26/08/2026",
    passengerName: "NGUYEN THI NHU MRS",
    fare: 20751000,
    sellingPrice: 20766000,
    discount: 0,
    originalDiscount: 0,
    debt: 20766000,
    credit: 0,
    balance: 943200
  },
  {
    stt: 5,
    carrier: "VN",
    bookingDate: "10/06/2026",
    ticketType: "Hoàn",
    orderCode: "E6F77K",
    ticketNumber: "7382321383143-H",
    bookingClass: "R",
    journey: "MNV-SGN",
    flightTime: "",
    passengerName: "COMIA PERMENTILLA SAMUEL MR",
    fare: 0,
    sellingPrice: 1985000,
    discount: 0,
    originalDiscount: 0,
    debt: -1985000,
    credit: 0,
    balance: 2928200
  },
  {
    stt: 6,
    carrier: "VN",
    bookingDate: "13/06/2026",
    ticketType: "Vé",
    orderCode: "DMDAHD",
    ticketNumber: "7382321711697",
    bookingClass: "N",
    journey: "SGN-HAN",
    flightTime: "19:35 17/06/2026",
    passengerName: "NGUYEN THANH HANG MRS",
    fare: 2106481,
    sellingPrice: 2394000,
    discount: 0,
    originalDiscount: 0,
    debt: 2394000,
    credit: 0,
    balance: 534200
  },
  {
    stt: 7,
    carrier: "9G",
    bookingDate: "15/06/2026",
    ticketType: "Vé*",
    orderCode: "EFR8T3",
    ticketNumber: "8092451264541",
    bookingClass: "T",
    journey: "DAD-HAN",
    flightTime: "08:15 08/07/2026",
    passengerName: "NGUYEN TRONG MINH DUC MSTR",
    fare: 932407,
    sellingPrice: 1066500,
    discount: 0,
    originalDiscount: 10000,
    debt: 1066500,
    credit: 0,
    balance: -522300
  },
  {
    stt: 8,
    carrier: "9G",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "EFR8T3",
    ticketNumber: "8092451264539",
    bookingClass: "T",
    journey: "DAD-HAN",
    flightTime: "08:15 08/07/2026",
    passengerName: "DANH THI TRANG MRS",
    fare: 1095370,
    sellingPrice: 1302000,
    discount: 0,
    originalDiscount: 10000,
    debt: 1302000,
    credit: 0,
    balance: -1814300
  },
  {
    stt: 9,
    carrier: "9G",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "ETHFYV",
    ticketNumber: "8092451264546",
    bookingClass: "T",
    journey: "DAD-HAN",
    flightTime: "08:15 08/07/2026",
    passengerName: "DUONG NGOC DIEP MS",
    fare: 1095370,
    sellingPrice: 1302000,
    discount: 0,
    originalDiscount: 10000,
    debt: 1302000,
    credit: 0,
    balance: -3106300
  },
  {
    stt: 10,
    carrier: "9G",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "EFR8T3",
    ticketNumber: "8092451264536",
    bookingClass: "T",
    journey: "DAD-HAN",
    flightTime: "08:15 08/07/2026",
    passengerName: "NGUYEN THI NGOC MRS",
    fare: 1095370,
    sellingPrice: 1302000,
    discount: 0,
    originalDiscount: 10000,
    debt: 1302000,
    credit: 0,
    balance: -4398300
  },
  {
    stt: 11,
    carrier: "9G",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "EFR8T3",
    ticketNumber: "8092451264538",
    bookingClass: "T",
    journey: "DAD-HAN",
    flightTime: "08:15 08/07/2026",
    passengerName: "NGUYEN TRONG THANH MR",
    fare: 1095370,
    sellingPrice: 1302000,
    discount: 0,
    originalDiscount: 10000,
    debt: 1302000,
    credit: 0,
    balance: -5690300
  },
  {
    stt: 12,
    carrier: "9G",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "ETHFYV",
    ticketNumber: "8092451264544",
    bookingClass: "T",
    journey: "DAD-HAN",
    flightTime: "08:15 08/07/2026",
    passengerName: "NGUYEN THI YEN MRS",
    fare: 1095370,
    sellingPrice: 1302000,
    discount: 0,
    originalDiscount: 10000,
    debt: 1302000,
    credit: 0,
    balance: -6982300
  },
  {
    stt: 13,
    carrier: "9G",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "EFR8T3",
    ticketNumber: "8092451264537",
    bookingClass: "T",
    journey: "DAD-HAN",
    flightTime: "08:15 08/07/2026",
    passengerName: "DAO XUAN THINH MR",
    fare: 1095370,
    sellingPrice: 1302000,
    discount: 0,
    originalDiscount: 10000,
    debt: 1302000,
    credit: 0,
    balance: -8274300
  },
  {
    stt: 14,
    carrier: "9G",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "ETHFYV",
    ticketNumber: "8092451264545",
    bookingClass: "T",
    journey: "DAD-HAN",
    flightTime: "08:15 08/07/2026",
    passengerName: "NGUYEN TRONG YEN MR",
    fare: 1095370,
    sellingPrice: 1302000,
    discount: 0,
    originalDiscount: 10000,
    debt: 1302000,
    credit: 0,
    balance: -9566300
  },
  {
    stt: 15,
    carrier: "9G",
    bookingDate: "15/06/2026",
    ticketType: "Vé*",
    orderCode: "EFR8T3",
    ticketNumber: "8092451264540",
    bookingClass: "T",
    journey: "DAD-HAN",
    flightTime: "08:15 08/07/2026",
    passengerName: "NGUYEN TRONG KHOI NGUYEN MSTR",
    fare: 932407,
    sellingPrice: 1066500,
    discount: 0,
    originalDiscount: 10000,
    debt: 1066500,
    credit: 0,
    balance: -10622800
  },
  {
    stt: 16,
    carrier: "ACB150620260006",
    bookingDate: "15/06/2026",
    ticketType: "",
    orderCode: "",
    ticketNumber: "",
    bookingClass: "",
    journey: "",
    flightTime: "",
    passengerName: "MBVCB.14682667255... (Nạp quỹ)",
    fare: 0,
    sellingPrice: 0,
    discount: 0,
    originalDiscount: 0,
    debt: 0,
    credit: 30000000,
    balance: 19377200
  },
  {
    stt: 17,
    carrier: "ACB150620260014",
    bookingDate: "15/06/2026",
    ticketType: "",
    orderCode: "",
    ticketNumber: "",
    bookingClass: "",
    journey: "",
    flightTime: "",
    passengerName: "Avac thanh toan... (Nạp quỹ)",
    fare: 0,
    sellingPrice: 0,
    discount: 0,
    originalDiscount: 0,
    debt: 0,
    credit: 5234000,
    balance: 24611200
  },
  {
    stt: 18,
    carrier: "ACB150620260015",
    bookingDate: "15/06/2026",
    ticketType: "",
    orderCode: "",
    ticketNumber: "",
    bookingClass: "",
    journey: "",
    flightTime: "",
    passengerName: "Avac thanh toan... (Nạp quỹ)",
    fare: 0,
    sellingPrice: 0,
    discount: 0,
    originalDiscount: 0,
    debt: 0,
    credit: 5428000,
    balance: 30039200
  },
  {
    stt: 19,
    carrier: "ACB150620260016",
    bookingDate: "15/06/2026",
    ticketType: "",
    orderCode: "",
    ticketNumber: "",
    bookingClass: "",
    journey: "",
    flightTime: "",
    passengerName: "Avac thanh toan... (Nạp quỹ)",
    fare: 0,
    sellingPrice: 0,
    discount: 0,
    originalDiscount: 0,
    debt: 0,
    credit: 4600000,
    balance: 34639200
  },
  {
    stt: 20,
    carrier: "VJ",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "W63XG2",
    ticketNumber: "VJAW63XG2",
    bookingClass: "J",
    journey: "HAN-DAD-HAN",
    flightTime: "17:45 04/07/2026 | 08:25 08/07/2026",
    passengerName: "NGUYEN THI OANH MRS",
    fare: 9997037,
    sellingPrice: 11512800,
    discount: 0,
    originalDiscount: 0,
    debt: 11512800,
    credit: 0,
    balance: 23126400
  },
  {
    stt: 21,
    carrier: "VJ",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "HJFWZ5",
    ticketNumber: "VJAHJFWZ5",
    bookingClass: "W",
    journey: "HAN-CXR",
    flightTime: "20:15 17/06/2026",
    passengerName: "CAO VAN CHINH MR",
    fare: 2889259,
    sellingPrice: 3358400,
    discount: 0,
    originalDiscount: 0,
    debt: 3358400,
    credit: 0,
    balance: 19768000
  },
  {
    stt: 22,
    carrier: "VN",
    bookingDate: "15/06/2026",
    ticketType: "Vé*",
    orderCode: "EFPE7N",
    ticketNumber: "7382321760831",
    bookingClass: "R",
    journey: "HAN-DAD",
    flightTime: "18:20 04/07/2026",
    passengerName: "NGUYEN TRONG KHOI NGUYEN MSTR",
    fare: 1121296,
    sellingPrice: 1270500,
    discount: 0,
    originalDiscount: 0,
    debt: 1270500,
    credit: 0,
    balance: 18497500
  },
  {
    stt: 23,
    carrier: "VN",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "ERI7RX",
    ticketNumber: "7382321785036",
    bookingClass: "N",
    journey: "HAN-DAD",
    flightTime: "18:20 04/07/2026",
    passengerName: "DUONG NGOC DIEP MRS",
    fare: 1325926,
    sellingPrice: 1551000,
    discount: 0,
    originalDiscount: 0,
    debt: 1551000,
    credit: 0,
    balance: 16946500
  },
  {
    stt: 24,
    carrier: "VN",
    bookingDate: "15/06/2026",
    ticketType: "Vé*",
    orderCode: "EFPE7N",
    ticketNumber: "7382321760832",
    bookingClass: "R",
    journey: "HAN-DAD",
    flightTime: "18:20 04/07/2026",
    passengerName: "NGUYEN TRONG MINH DUC MSTR",
    fare: 1121296,
    sellingPrice: 1270500,
    discount: 0,
    originalDiscount: 0,
    debt: 1270500,
    credit: 0,
    balance: 15676000
  },
  {
    stt: 25,
    carrier: "VN",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "ERI7RX",
    ticketNumber: "7382321785038",
    bookingClass: "N",
    journey: "HAN-DAD",
    flightTime: "18:20 04/07/2026",
    passengerName: "NGUYEN TRONG YEN MR",
    fare: 1325926,
    sellingPrice: 1551000,
    discount: 0,
    originalDiscount: 0,
    debt: 1551000,
    credit: 0,
    balance: 14125000
  },
  {
    stt: 26,
    carrier: "VN",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "EFPE7N",
    ticketNumber: "7382321760829",
    bookingClass: "R",
    journey: "HAN-DAD",
    flightTime: "18:20 04/07/2026",
    passengerName: "NGUYEN THI NGOC MRS",
    fare: 1199074,
    sellingPrice: 1414000,
    discount: 0,
    originalDiscount: 0,
    debt: 1414000,
    credit: 0,
    balance: 12711000
  },
  {
    stt: 27,
    carrier: "VN",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "ERI7RX",
    ticketNumber: "7382321785037",
    bookingClass: "N",
    journey: "HAN-DAD",
    flightTime: "18:20 04/07/2026",
    passengerName: "NGUYEN THI YEN MR",
    fare: 1325926,
    sellingPrice: 1551000,
    discount: 0,
    originalDiscount: 0,
    debt: 1551000,
    credit: 0,
    balance: 11160000
  },
  {
    stt: 28,
    carrier: "VN",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "EFPE7N",
    ticketNumber: "7382321760828",
    bookingClass: "R",
    journey: "HAN-DAD",
    flightTime: "18:20 04/07/2026",
    passengerName: "DAO XUAN THINH MR",
    fare: 1199074,
    sellingPrice: 1414000,
    discount: 0,
    originalDiscount: 0,
    debt: 1414000,
    credit: 0,
    balance: 9746000
  },
  {
    stt: 29,
    carrier: "VN",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "EFPE7N",
    ticketNumber: "7382321760830",
    bookingClass: "R",
    journey: "HAN-DAD",
    flightTime: "18:20 04/07/2026",
    passengerName: "NGUYEN TRONG THANH MR",
    fare: 1199074,
    sellingPrice: 1414000,
    discount: 0,
    originalDiscount: 0,
    debt: 1414000,
    credit: 0,
    balance: 8332000
  },
  {
    stt: 30,
    carrier: "VN",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "EFPE7N",
    ticketNumber: "7382321760827",
    bookingClass: "R",
    journey: "HAN-DAD",
    flightTime: "18:20 04/07/2026",
    passengerName: "DANH THI TRANG MRS",
    fare: 1199074,
    sellingPrice: 1414000,
    discount: 0,
    originalDiscount: 0,
    debt: 1414000,
    credit: 0,
    balance: 6918000
  },
  {
    stt: 31,
    carrier: "VU",
    bookingDate: "15/06/2026",
    ticketType: "Vé",
    orderCode: "P39PIQ",
    ticketNumber: "VUAP39PIQ",
    bookingClass: "L",
    journey: "CXR-HAN",
    flightTime: "20:30 20/06/2026",
    passengerName: "CAO VAN CHINH MR",
    fare: 2976000,
    sellingPrice: 3462080,
    discount: 0,
    originalDiscount: 0,
    debt: 3462080,
    credit: 0,
    balance: 3455920
  },
  {
    stt: 32,
    carrier: "VJ",
    bookingDate: "17/06/2026",
    ticketType: "Đổi",
    orderCode: "HJFWZ5",
    ticketNumber: "VJAHJFWZ5*1",
    bookingClass: "W",
    journey: "HAN-CXR",
    flightTime: "20:15 17/06/2026",
    passengerName: "CAO VAN CHINH MR",
    fare: 0,
    sellingPrice: 270000,
    discount: 0,
    originalDiscount: 0,
    debt: 270000,
    credit: 0,
    balance: 3185920
  },
  {
    stt: 33,
    carrier: "ACB180620260004",
    bookingDate: "18/06/2026",
    ticketType: "",
    orderCode: "",
    ticketNumber: "",
    bookingClass: "",
    journey: "",
    flightTime: "",
    passengerName: "MBVCB.14728013028.922221.NGUYEN THI... (Nạp quỹ)",
    fare: 0,
    sellingPrice: 0,
    discount: 0,
    originalDiscount: 0,
    debt: 0,
    credit: 1000000,
    balance: 4185920
  },
  {
    stt: 34,
    carrier: "ACB180620260014",
    bookingDate: "18/06/2026",
    ticketType: "",
    orderCode: "",
    ticketNumber: "",
    bookingClass: "",
    journey: "",
    flightTime: "",
    passengerName: "MBVCB.14732475266.749992.NGUYEN THI... (Nạp quỹ)",
    fare: 0,
    sellingPrice: 0,
    discount: 0,
    originalDiscount: 0,
    debt: 0,
    credit: 2500000,
    balance: 6685920
  },
  {
    stt: 35,
    carrier: "ACB180620260024",
    bookingDate: "18/06/2026",
    ticketType: "",
    orderCode: "",
    ticketNumber: "",
    bookingClass: "",
    journey: "",
    flightTime: "",
    passengerName: "MBVCB.14734832573.242062.NGUYEN THI... (Nạp quỹ)",
    fare: 0,
    sellingPrice: 0,
    discount: 0,
    originalDiscount: 0,
    debt: 0,
    credit: 4000000,
    balance: 10685920
  },
  {
    stt: 36,
    carrier: "VJ",
    bookingDate: "18/06/2026",
    ticketType: "Vé",
    orderCode: "MSS93Y",
    ticketNumber: "VJAMSS93Y",
    bookingClass: "H",
    journey: "SGN-HAN",
    flightTime: "15:55 19/06/2026",
    passengerName: "NGUYEN VAN DIEP MR",
    fare: 2224630,
    sellingPrice: 2521600,
    discount: 0,
    originalDiscount: 0,
    debt: 2521600,
    credit: 0,
    balance: 8164320
  },
  {
    stt: 37,
    carrier: "VN",
    bookingDate: "18/06/2026",
    ticketType: "Vé",
    orderCode: "DD5PSX",
    ticketNumber: "7382321885458",
    bookingClass: "B",
    journey: "HAN-SGN",
    flightTime: "19:00 18/06/2026",
    passengerName: "SAI VAN HUNG MR",
    fare: 3353704,
    sellingPrice: 3741000,
    discount: 24685,
    originalDiscount: 24685,
    debt: 3716315,
    credit: 0,
    balance: 4448005
  },
  {
    stt: 38,
    carrier: "VN",
    bookingDate: "18/06/2026",
    ticketType: "Vé",
    orderCode: "D6V64X",
    ticketNumber: "7382321861921",
    bookingClass: "B",
    journey: "HAN-SGN",
    flightTime: "11:00 18/06/2026",
    passengerName: "SAI VAN HUNG MR",
    fare: 3353704,
    sellingPrice: 3741000,
    discount: 0,
    originalDiscount: 0,
    debt: 3741000,
    credit: 0,
    balance: 731690
  },
  {
    stt: 39,
    carrier: "VU",
    bookingDate: "19/06/2026",
    ticketType: "Đổi",
    orderCode: "P39PIQ",
    ticketNumber: "VUAP39PIQ*1",
    bookingClass: "L",
    journey: "CXR-HAN",
    flightTime: "20:30 20/06/2026",
    passengerName: "CAO VAN CHINH MR",
    fare: 0,
    sellingPrice: 302400,
    discount: 0,
    originalDiscount: 0,
    debt: 302400,
    credit: 0,
    balance: 429290
  },
  {
    stt: 40,
    carrier: "VN",
    bookingDate: "22/06/2026",
    ticketType: "Vé",
    orderCode: "F8LQUX",
    ticketNumber: "7382321986993",
    bookingClass: "Q",
    journey: "HAN-SGN",
    flightTime: "18:30 25/06/2026",
    passengerName: "NGUYEN THANH HANG MRS",
    fare: 1869000,
    sellingPrice: 2588000,
    discount: 0,
    originalDiscount: 0,
    debt: 2588000,
    credit: 0,
    balance: -2158710
  }
];

const DEFAULT_TRANSACTIONS: Transaction[] = RAW_DEFAULT_TRANSACTIONS.map(tx => ({
  ...tx,
  originalBalance: tx.balance
}));

function detectColumnIndices(table: Element | null) {
  const indices = {
    stt: 0,
    channel: -1,
    carrier: 2,
    bookingDate: 3,
    ticketType: 4,
    orderCode: 6,
    ticketNumber: 7,
    bookingClass: 8,
    journey: 9,
    flightTime: 10,
    passengerName: 11,
    fare: 12,
    sellingPrice: 13,
    originalDiscount: 14,
    debt: 15,
    credit: 16,
    balance: 17
  };

  if (!table) return indices;

  const headerTr = table.querySelector('thead tr') || table.querySelector('tr');
  if (!headerTr) return indices;

  const cells = Array.from(headerTr.querySelectorAll('th, td'));
  if (cells.length === 0) return indices;

  cells.forEach((cell, idx) => {
    const text = cell.textContent?.trim().toLowerCase() || "";
    if (text === "stt") {
      indices.stt = idx;
    } else if (text.includes("kênh") || text === "channel") {
      indices.channel = idx;
    } else if (text.includes("ngày chứng từ") || text === "ngày" || (text.includes("ngày") && !text.includes("xuất") && !text.includes("thanh toán"))) {
      indices.bookingDate = idx;
    } else if ((text.includes("chứng từ") && !text.includes("ngày")) || text === "hãng" || text === "carrier") {
      indices.carrier = idx;
    } else if (text.includes("loại") || text.includes("type")) {
      indices.ticketType = idx;
    } else if (text.includes("mã đh") || text.includes("mã đơn hàng") || text.includes("đơn hàng") || text.includes("order")) {
      indices.orderCode = idx;
    } else if (text.includes("số vé") || text.includes("ticket number")) {
      indices.ticketNumber = idx;
    } else if (text.includes("hạng") || text.includes("class")) {
      indices.bookingClass = idx;
    } else if (text.includes("hành trình") || text.includes("journey")) {
      indices.journey = idx;
    } else if (text.includes("thời gian") || text.includes("flight time")) {
      indices.flightTime = idx;
    } else if (text.includes("tên khách") || text.includes("passenger")) {
      indices.passengerName = idx;
    } else if (text.includes("giá vé") || text.includes("fare")) {
      indices.fare = idx;
    } else if (text.includes("giá bán") || text.includes("selling price")) {
      indices.sellingPrice = idx;
    } else if (text.includes("chiết khấu") || text.includes("discount")) {
      indices.originalDiscount = idx;
    } else if (text.includes("nợ") || text.includes("debt")) {
      indices.debt = idx;
    } else if (text.includes("có") || text.includes("credit")) {
      indices.credit = idx;
    } else if (text.includes("lũy kế") || text.includes("balance")) {
      indices.balance = idx;
    }
  });

  return indices;
}

function parseTableRow(tds: Element[], sttVal: number, indices?: any): Transaction | null {
  if (tds.length < 11) return null;

  const tx: Transaction = {
    stt: sttVal,
    carrier: "",
    bookingDate: "",
    ticketType: "",
    orderCode: "",
    ticketNumber: "",
    bookingClass: "",
    journey: "",
    flightTime: "",
    passengerName: "",
    fare: 0,
    sellingPrice: 0,
    discount: 0,
    originalDiscount: 0,
    debt: 0,
    credit: 0,
    balance: 0,
    originalBalance: 0,
    channel: "PARTNER"
  };

  if (indices && indices.channel !== -1) {
    tx.carrier = tds[indices.carrier]?.textContent?.trim() || "";
    tx.bookingDate = tds[indices.bookingDate]?.textContent?.trim() || "";
    
    const typeColText = tds[indices.ticketType]?.textContent?.trim() || "";
    if (typeColText === "" || typeColText === "-" || typeColText === "–" || typeColText === "—") {
      tx.ticketType = "";
    } else if (typeColText.includes("Hoàn")) {
      tx.ticketType = "Hoàn";
    } else if (typeColText.toLowerCase().includes("void")) {
      tx.ticketType = "Void";
    } else if (typeColText.includes("Đổi")) {
      tx.ticketType = "Đổi";
    } else if (typeColText.includes("Vé*")) {
      tx.ticketType = "Vé*";
    } else if (typeColText.includes("Vé")) {
      tx.ticketType = "Vé";
    } else {
      tx.ticketType = "";
    }

    let chanText = tds[indices.channel]?.textContent?.trim().toUpperCase() || "";
    if (chanText === "" || chanText === "-" || chanText === "–" || chanText === "—") {
      tx.channel = "PARTNER";
    } else if (chanText.includes("FLIGHT") || chanText.includes("FLI")) {
      tx.channel = "FLIGHTVN";
    } else if (chanText.includes("PARTNER") || chanText.includes("PAR")) {
      tx.channel = "PARTNER";
    } else if (chanText === "ALL") {
      tx.channel = "ALL";
    } else {
      tx.channel = "PARTNER";
    }

    const btn = tds[indices.orderCode]?.querySelector('button');
    tx.orderCode = btn ? btn.textContent?.trim() || "" : tds[indices.orderCode]?.textContent?.trim() || "";
    tx.ticketNumber = tds[indices.ticketNumber]?.textContent?.trim() || "";
    tx.bookingClass = tds[indices.bookingClass]?.textContent?.trim() || "";
    tx.journey = tds[indices.journey]?.textContent?.trim() || "";
    
    const flightTimeText = tds[indices.flightTime]?.textContent?.trim() || "";
    tx.flightTime = flightTimeText === "-" ? "" : flightTimeText;
    tx.passengerName = tds[indices.passengerName]?.textContent?.trim() || "";
    
    tx.fare = parseInt(tds[indices.fare]?.textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
    tx.sellingPrice = parseInt(tds[indices.sellingPrice]?.textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
    tx.originalDiscount = parseInt(tds[indices.originalDiscount]?.textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
    tx.discount = tx.originalDiscount;
    tx.debt = parseInt(tds[indices.debt]?.textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
    tx.credit = parseInt(tds[indices.credit]?.textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
    tx.balance = parseInt(tds[indices.balance]?.textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
    tx.originalBalance = tx.balance;
  } else {
    if (tds.length >= 17) {
      const rawChan = tds[1].textContent?.trim().toUpperCase() || "";
      if (rawChan.includes("FLIGHT") || rawChan.includes("FLI")) {
        tx.channel = "FLIGHTVN";
      } else if (rawChan.includes("PARTNER") || rawChan.includes("PAR")) {
        tx.channel = "PARTNER";
      } else if (rawChan === "ALL") {
        tx.channel = "ALL";
      } else {
        tx.channel = "PARTNER";
      }
      tx.carrier = tds[2].textContent?.trim() || "";
      tx.bookingDate = tds[3].textContent?.trim() || "";
      const typeColText = tds[4].textContent?.trim() || "";
      if (typeColText === "" || typeColText === "-" || typeColText === "–" || typeColText === "—") {
        tx.ticketType = "";
      } else if (typeColText.includes("Hoàn")) {
        tx.ticketType = "Hoàn";
      } else if (typeColText.toLowerCase().includes("void")) {
        tx.ticketType = "Void";
      } else if (typeColText.includes("Đổi")) {
        tx.ticketType = "Đổi";
      } else if (typeColText.includes("Vé*")) {
        tx.ticketType = "Vé*";
      } else if (typeColText.includes("Vé")) {
        tx.ticketType = "Vé";
      } else {
        tx.ticketType = "";
      }
      
      const btn = tds[6].querySelector('button');
      tx.orderCode = btn ? btn.textContent?.trim() || "" : tds[6].textContent?.trim() || "";
      
      tx.ticketNumber = tds[7].textContent?.trim() || "";
      tx.bookingClass = tds[8].textContent?.trim() || "";
      tx.journey = tds[9].textContent?.trim() || "";
      const flightTimeText = tds[10].textContent?.trim() || "";
      tx.flightTime = flightTimeText === "-" ? "" : flightTimeText;
      tx.passengerName = tds[11].textContent?.trim() || "";
      tx.fare = parseInt(tds[12].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.sellingPrice = parseInt(tds[13].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.originalDiscount = parseInt(tds[14].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.discount = tx.originalDiscount;
      tx.debt = parseInt(tds[15].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.credit = parseInt(tds[16].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.balance = parseInt(tds[17].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.originalBalance = tx.balance;
    } else if (tds.length === 16 || tds.length === 15) {
      // 16-column layout (as in user's screenshot)
      tx.carrier = tds[1].textContent?.trim() || "";
      tx.bookingDate = tds[2].textContent?.trim() || "";
      const typeColText = tds[3].textContent?.trim() || "";
      if (typeColText === "" || typeColText === "-" || typeColText === "–" || typeColText === "—") {
        tx.ticketType = "";
      } else if (typeColText.includes("Hoàn")) {
        tx.ticketType = "Hoàn";
      } else if (typeColText.toLowerCase().includes("void")) {
        tx.ticketType = "Void";
      } else if (typeColText.includes("Đổi")) {
        tx.ticketType = "Đổi";
      } else if (typeColText.includes("Vé*")) {
        tx.ticketType = "Vé*";
      } else if (typeColText.includes("Vé")) {
        tx.ticketType = "Vé";
      } else {
        tx.ticketType = "";
      }
      
      const btn = tds[4].querySelector('button');
      tx.orderCode = btn ? btn.textContent?.trim() || "" : tds[4].textContent?.trim() || "";
      
      tx.ticketNumber = tds[5].textContent?.trim() || "";
      tx.bookingClass = tds[6].textContent?.trim() || "";
      tx.journey = tds[7].textContent?.trim() || "";
      const flightTimeText = tds[8].textContent?.trim() || "";
      tx.flightTime = flightTimeText === "-" ? "" : flightTimeText;
      tx.passengerName = tds[9].textContent?.trim() || "";
      tx.fare = parseInt(tds[10].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.sellingPrice = parseInt(tds[11].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.originalDiscount = parseInt(tds[12].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.discount = tx.originalDiscount;
      tx.debt = parseInt(tds[13].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.credit = parseInt(tds[14].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.balance = tds.length === 16 ? parseInt(tds[15].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0 : 0;
      tx.originalBalance = tx.balance;
    } else {
      // 12-column layout (old format)
      tx.carrier = tds[2].textContent?.trim() || "";
      tx.bookingDate = tds[3].textContent?.trim() || "";
      const btn = tds[5].querySelector('button');
      tx.orderCode = btn ? btn.textContent?.trim() || "" : tds[5].textContent?.trim() || "";

      const desc = tds[6].textContent?.trim() || "";
      const parts = desc.split(" - ");
      if (parts.length >= 3) {
        tx.ticketNumber = parts[0].trim();
        tx.journey = parts[1].trim();
        tx.passengerName = parts[2].trim();
      } else if (parts.length === 2) {
        tx.journey = parts[0].trim();
        tx.passengerName = parts[1].trim();
      } else {
        tx.passengerName = desc;
      }

      if (desc.includes("-H ") || desc.includes("hoan") || desc.includes("Hoàn")) {
        tx.ticketType = "Hoàn";
      } else if (desc.includes("doi") || desc.includes("Đổi") || tx.carrier.includes("doi") || tx.carrier.includes("Đổi")) {
        tx.ticketType = "Đổi";
      } else if (desc.toLowerCase().includes("void")) {
        tx.ticketType = "Void";
      }

      tx.sellingPrice = parseInt(tds[7].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.originalDiscount = parseInt(tds[8].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.discount = tx.originalDiscount;
      tx.debt = parseInt(tds[9].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.credit = parseInt(tds[10].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.balance = parseInt(tds[11].textContent?.replace(/[^0-9-]/g, "") || "0", 10) || 0;
      tx.originalBalance = tx.balance;
    }
  }

  if (!tx.channel || tx.channel.trim() === "") {
    tx.channel = "PARTNER";
  }

  return tx;
}

function parseHtmlDebtData(htmlString: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  let agencyName = "";
  let agencyCode = "";
  let agencyEmail = "";
  let creditLimit = 0;

  // Try to find credit limit from text
  const allText = doc.body ? doc.body.textContent || "" : htmlString;
  const limitM = allText.match(/Hạn mức:\s*([\d.,]+)/i);
  if (limitM) {
    const cleanNum = limitM[1].replace(/[.,]/g, '');
    creditLimit = parseInt(cleanNum, 10) || 0;
  }

  // 1. Target the exact paragraph containing the agency details
  const pElements = Array.from(doc.querySelectorAll('p'));
  const targetP = pElements.find(p => {
    const txt = p.textContent || "";
    return (txt.includes("Phòng vé:") || txt.includes("Đại lý:")) && txt.includes("Mã KH:");
  });

  if (targetP) {
    const spans = targetP.querySelectorAll('span');
    if (spans.length >= 3) {
      const pName = spans[0].textContent?.trim();
      const pCode = spans[1].textContent?.trim();
      const pEmail = spans[2].textContent?.trim();
      
      if (pName && pName !== "Chưa có") agencyName = pName;
      if (pCode && pCode !== "Chưa có") agencyCode = pCode;
      if (pEmail && pEmail !== "Chưa có") agencyEmail = pEmail;
    } else {
      const txt = targetP.textContent || "";
      const nameM = txt.match(/(?:Phòng vé|Đại lý):\s*([^–|-]+)/i);
      const codeM = txt.match(/Mã KH:\s*([^–|-]+)/i);
      const emailM = txt.match(/Email:\s*([^\s–|-]+)/i);
      
      if (nameM && nameM[1].trim() && nameM[1].trim() !== "Chưa có") agencyName = nameM[1].trim();
      if (codeM && codeM[1].trim() && codeM[1].trim() !== "Chưa có") agencyCode = codeM[1].trim();
      if (emailM && emailM[1].trim() && emailM[1].trim() !== "Chưa có") agencyEmail = emailM[1].trim();
    }
  }

  // 2. Fallbacks (e.g. from dropdown selects or input fields) if still empty or "Chưa có"
  if (!agencyCode || !agencyName || agencyCode === "Chưa có" || agencyName === "Chưa có") {
    // Extract selected agency from dropdown selects (including user selectors)
    const selects = Array.from(doc.querySelectorAll('select[id*="agent" i], select[name*="agent" i], select[id*="customer" i], select[name*="customer" i], select[id*="user" i], select[name*="user" i]'));
    selects.forEach(select => {
      const selectedOpt = select.querySelector('option[selected], option:checked') as HTMLOptionElement;
      if (selectedOpt && selectedOpt.value) {
        const optVal = selectedOpt.value.trim();
        if (optVal && optVal !== "Chưa có") {
          agencyCode = optVal;
        }
        const optText = selectedOpt.textContent || "";
        if (optText && !optText.includes("--")) {
          const codeInParen = optText.match(/\(([^)]+)\)/);
          if (codeInParen) {
            agencyCode = codeInParen[1].trim();
          }
          agencyName = optText.replace(/^(Đại lý|Phòng vé|KH)\s*/i, "").replace(/\([^)]+\)/g, "").trim();
        }
      }
    });

    // Extract agency code from inputs
    const inputs = Array.from(doc.querySelectorAll('input[id*="agent" i], input[name*="agent" i], input[id*="customer" i], input[name*="customer" i]'));
    inputs.forEach(input => {
      const val = input.getAttribute('value') || "";
      if (val && val.trim() && val.length >= 3 && val.trim() !== "Chưa có") {
        agencyCode = val.trim();
      }
    });

    // Method 2: Sidebar/Header user profile elements (e.g. circle text circle showing SJNMGO)
    if (!agencyCode || agencyCode === "Chưa có") {
      const profileEl = doc.querySelector('.user-profile, .profile_info h2, .user-panel .info a, .profile-username, a.user-profile span, .sidebar-user .info');
      if (profileEl) {
        const textVal = profileEl.textContent?.trim();
        if (textVal) {
          const match = textVal.match(/[A-Z0-9]{3,12}/);
          if (match) {
            agencyCode = match[0];
            if (!agencyName || agencyName === "Chưa có") {
              agencyName = textVal;
            }
          }
        }
      }
    }
  }

  let startingBalance = 4719200;
  const items = Array.from(doc.querySelectorAll('.item, p, div'));
  items.forEach(item => {
    const text = item.textContent || "";
    if (text.includes("Số dư đầu kỳ:")) {
      const strongs = item.querySelectorAll('strong');
      if (strongs.length > 1) {
        const balText = strongs[1].textContent || "";
        const cleaned = balText.replace(/[^0-9-]/g, "");
        if (cleaned) {
          startingBalance = parseInt(cleaned, 10);
        }
      }
    }
  });

  const parsedTransactions: Transaction[] = [];
  const table = doc.querySelector('table');
  const indices = detectColumnIndices(table);

  if (table) {
    const tbody = table.querySelector('tbody');
    if (tbody) {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.forEach(row => {
        const tds = Array.from(row.querySelectorAll('td'));
        if (tds.length >= 11) {
          const sttText = tds[0].textContent?.trim() || "";
          const sttVal = parseInt(sttText, 10);
          if (isNaN(sttVal)) return;

          const parsedTx = parseTableRow(tds, sttVal, indices);
          if (parsedTx) {
            parsedTransactions.push(parsedTx);
          }
        }
      });
    }
  }

  if (table) {
    const dataOrigHtml = table.getAttribute('data-original-html');
    if (dataOrigHtml) {
      const decoded = dataOrigHtml
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');
      
      const subDoc = parser.parseFromString(`<table>${decoded}</table>`, 'text/html');
      const subTable = subDoc.querySelector('table');
      const subIndices = detectColumnIndices(subTable);
      const subTbody = subDoc.querySelector('tbody');
      if (subTbody) {
        const rows = Array.from(subTbody.querySelectorAll('tr'));
        const subParsed: Transaction[] = [];
        rows.forEach(row => {
          const tds = Array.from(row.querySelectorAll('td'));
          if (tds.length >= 11) {
            const sttText = tds[0].textContent?.trim() || "";
            const sttVal = parseInt(sttText, 10);
            if (isNaN(sttVal)) return;

            const subTx = parseTableRow(tds, sttVal, subIndices);
            if (subTx) {
              subParsed.push(subTx);
            }
          }
        });

        if (subParsed.length > 0) {
          subParsed.forEach(subTx => {
            const match = parsedTransactions.find(t => t.stt === subTx.stt);
            if (match) {
              if (!match.bookingClass) match.bookingClass = subTx.bookingClass;
              if (!match.journey) match.journey = subTx.journey;
              if (!match.passengerName) match.passengerName = subTx.passengerName;
              if (!match.ticketNumber) match.ticketNumber = subTx.ticketNumber;
              if (!match.channel) match.channel = subTx.channel || "PARTNER";
            } else {
              parsedTransactions.push(subTx);
            }
          });
        }
      }
    }
  }

  parsedTransactions.sort((a, b) => a.stt - b.stt);

  return {
    agencyName,
    agencyCode,
    agencyEmail,
    startingBalance,
    creditLimit,
    transactions: parsedTransactions
  };
}

export function CalculatorTab() {
  const isAgent = new URLSearchParams(window.location.search).get('isAgent') === 'true';
  const startScrollCaptureRef = React.useRef<() => void>();

  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [details, setDetails] = useState<CampaignDetail[]>([]);
  const [blackouts, setBlackouts] = useState<CampaignBlackoutPeriod[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector modal state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [debugLog, setDebugLog] = useState<any[]>([]);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<'info' | 'log'>('info');
  const [inspectorResult, setInspectorResult] = useState<{
    simulatedDiscount: number;
    cumulativeDiscount: number;
    activeThreshold: Threshold | null;
    multiplier: number;
    primaryReason: string;
    hasChecked: boolean;
    appliedCampaigns?: any[];
    hasMatchedCampaigns?: boolean;
    skippedSegments?: {
      segmentFromTo: string;
      segmentClass: string;
      reason: string;
      segmentDirection: string;
      campaignId?: number;
      campaignName?: string;
    }[];
  }>({
    simulatedDiscount: 0,
    cumulativeDiscount: 0,
    activeThreshold: null,
    multiplier: 1,
    primaryReason: '',
    hasChecked: false,
    appliedCampaigns: [],
    hasMatchedCampaigns: false,
    skippedSegments: []
  });

  // Import HTML data and Agency information
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importHtmlText, setImportHtmlText] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('');
  const [agencyCode, setAgencyCode] = useState<string>('');
  const [agencyEmail, setAgencyEmail] = useState<string>('');

  const passedAgencyInfoRef = React.useRef<{ code: string; name: string; email: string }>({ code: '', name: '', email: '' });

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);

  useEffect(() => {
    loadDatabase();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.action === 'import_x_content') {
        const html = event.data.html;
        if (html) {
          passedAgencyInfoRef.current = {
            code: event.data.agencyCode || '',
            name: event.data.agencyName || '',
            email: event.data.agencyEmail || ''
          };
          setPendingHtml(html);
        }
        if (event.data.iframeRect) {
          (window as any).skyjetIframeRect = event.data.iframeRect;
        }
      } else if (event.data && event.data.action === 'skyjet_trigger_scroll_capture') {
        startScrollCaptureRef.current?.();
      }
    };

    window.addEventListener('message', handleMessage);
    
    if (window.opener) {
      window.opener.postMessage('skyjet_calculator_ready', '*');
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage('skyjet_calculator_ready', '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const matchedPolicies = useMemo(() => {
    if (policies.length === 0) return [];
    if (!agencyCode || agencyCode === 'Chưa có' || agencyCode.trim() === '') {
      const globalPol = policies.filter(p => !p.agents || p.agents.length === 0);
      if (globalPol.length > 0) return globalPol;
      return [policies[0]];
    }
    const trimmedCode = agencyCode.trim().toUpperCase();
    const specific = policies.filter(p => p.agents && p.agents.some(ag => ag.trim().toUpperCase() === trimmedCode));
    if (specific.length > 0) return specific;
    return policies.filter(p => !p.agents || p.agents.length === 0);
  }, [agencyCode, policies]);

  const activePolicyName = useMemo(() => {
    const selected = policies.find(p => p.id === selectedPolicyId);
    if (selected) return selected.name;
    if (matchedPolicies.length > 0) return matchedPolicies.map(p => p.name).join(', ');
    return 'Không có';
  }, [matchedPolicies, selectedPolicyId, policies]);

  const lastInitializedAgencyRef = React.useRef<string>('');

  useEffect(() => {
    const currentCode = agencyCode || '';
    if (matchedPolicies.length > 0) {
      if (currentCode !== lastInitializedAgencyRef.current) {
        lastInitializedAgencyRef.current = currentCode;
        setSelectedPolicyId(matchedPolicies[0].id);
      }
    }
  }, [agencyCode, matchedPolicies]);

  useEffect(() => {
    const payload = {
      action: 'skyjet_update_agency_info',
      agencyName,
      agencyCode,
      agencyEmail,
      policyName: activePolicyName
    };
    if (window.opener) {
      window.opener.postMessage(payload, '*');
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, '*');
    }
  }, [agencyName, agencyCode, agencyEmail, activePolicyName]);

  useEffect(() => {
    if (pendingHtml && !loading) {
      const parsed = parseHtmlDebtData(pendingHtml);
      if (parsed && parsed.transactions) {
        const startingBal = parsed.startingBalance !== undefined ? parsed.startingBalance : 0;
        setStartingBalance(startingBal);
        
        const finalCode = passedAgencyInfoRef.current.code || parsed.agencyCode || '';
        const finalName = passedAgencyInfoRef.current.name || parsed.agencyName || '';
        const finalEmail = passedAgencyInfoRef.current.email || parsed.agencyEmail || '';
        
        setAgencyName(finalName);
        setAgencyCode(finalCode);
        setAgencyEmail(finalEmail);
        
        // Reset the ref
        passedAgencyInfoRef.current = { code: '', name: '', email: '' };

        if (parsed.creditLimit !== undefined) {
          setCreditLimit(parsed.creditLimit);
        }
        
        const computed = recalculateBalancesAndDiscounts(parsed.transactions, startingBal);
        setTransactions(computed);
        showToast(`Nhập dữ liệu tự động thành công ${computed.length} giao dịch từ ERP!`);
      }
      setPendingHtml(null); // Reset after processing
    }
  }, [pendingHtml, loading]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadDatabase = async () => {
    setLoading(true);
    let hasCache = false;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const cached = await new Promise<any>((resolve) => {
        chrome.storage.local.get([
          'skyjet_campaign',
          'skyjet_campaign_details',
          'skyjet_campaign_blackout_periods',
          'skyjet_policies',
          'skyjet_thresholds',
          'skyjet_airports',
          'skyjet_selected_policy_id'
        ], (res) => {
          resolve(res);
        });
      });

      if (cached && cached.skyjet_campaign && cached.skyjet_campaign_details) {
        setCampaigns(cached.skyjet_campaign);
        setDetails(cached.skyjet_campaign_details);
        setBlackouts(cached.skyjet_campaign_blackout_periods || []);
        setPolicies(cached.skyjet_policies || []);
        setThresholds(cached.skyjet_thresholds || []);
        if (cached.skyjet_selected_policy_id) {
          setSelectedPolicyId(cached.skyjet_selected_policy_id);
        } else if (cached.skyjet_policies && cached.skyjet_policies.length > 0) {
          setSelectedPolicyId(cached.skyjet_policies[0].id);
        }
        setAirports(cached.skyjet_airports || []);
        setLoading(false);
        hasCache = true;
      }
    }

    if (hasCache) {
      return;
    }

    try {
      const [
        { data: campData, error: campErr },
        { data: detData, error: detErr },
        { data: blkData, error: blkErr },
        { data: polData, error: polErr },
        { data: thData, error: thErr },
        { data: airData, error: airErr }
      ] = await Promise.all([
        supabase.from('campaign').select('*'),
        supabase.from('campaign_details').select('*'),
        supabase.from('campaign_blackout_periods').select('*'),
        supabase.from('policies').select('*'),
        supabase.from('thresholds').select('*'),
        supabase.from('airports').select('*')
      ]);

      if (campErr) throw campErr;
      if (detErr) throw detErr;
      if (blkErr) throw blkErr;
      if (polErr) throw polErr;
      if (thErr) throw thErr;
      if (airErr) throw airErr;

      setCampaigns(campData || []);
      setDetails(detData || []);
      setBlackouts(blkData || []);
      setPolicies(polData || []);
      setThresholds(thData || []);
      
      let nextPolicyId = selectedPolicyId;
      if (polData && polData.length > 0) {
        if (!selectedPolicyId || !polData.some(p => p.id === selectedPolicyId)) {
          const globalPol = polData.find(p => !p.agents || p.agents.length === 0);
          nextPolicyId = globalPol ? globalPol.id : polData[0].id;
          setSelectedPolicyId(nextPolicyId);
        }
      }
      setAirports(airData || []);
      setError(null);

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          skyjet_campaign: campData || [],
          skyjet_campaign_details: detData || [],
          skyjet_campaign_blackout_periods: blkData || [],
          skyjet_policies: polData || [],
          skyjet_thresholds: thData || [],
          skyjet_airports: airData || [],
          skyjet_selected_policy_id: nextPolicyId
        });
      }
    } catch (err: any) {
      console.error('Error loading config database:', err);
      if (campaigns.length === 0) {
        setError('Không thể kết nối cơ sở dữ liệu để lấy cấu hình chiết khấu.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (policies.length > 0 && selectedPolicyId === null) {
      const globalPol = policies.find(p => !p.agents || p.agents.length === 0);
      setSelectedPolicyId(globalPol ? globalPol.id : policies[0].id);
    }
  }, [policies]);

  // Automatically recalculate debt & discounts when configuration is loaded or key states change
  useEffect(() => {
    if (transactions.length > 0 && !loading) {
      setTransactions(prev => recalculateBalancesAndDiscounts(prev, startingBalance, creditLimit));
    }
  }, [campaigns, details, thresholds, startingBalance, creditLimit, selectedPolicyId, loading]);

  const parseDDMMYYYY = (str?: string | null): string | null => {
    if (!str) return null;
    const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return null;
  };

  const extractAllFlyDates = (str?: string | null): string[] => {
    if (!str) return [];
    const regex = /(\d{2})\/(\d{2})\/(\d{4})/g;
    const results: string[] = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      results.push(`${match[3]}-${match[2]}-${match[1]}`);
    }
    return results;
  };

  const getAirportsFromJourney = (journey: string): string[] => {
    const matches = journey.toUpperCase().match(/[A-Z]{3}/g) || [];
    const unique: string[] = [];
    for (const m of matches) {
      if (!unique.includes(m)) {
        unique.push(m);
      }
    }
    return unique;
  };

  const isGroupTagMatch = (aTags: string[], bTags: string[], detailGroupsTag: string[]): { matched: boolean; combination: string } => {
    if (!detailGroupsTag || detailGroupsTag.length === 0) return { matched: false, combination: '' };
    const normalizedDetailTags = detailGroupsTag.map(t => t.toLowerCase().trim());
    
    for (const ta of aTags) {
      for (const tb of bTags) {
        const combo1 = `${ta} <-> ${tb}`.toLowerCase().trim();
        const combo2 = `${tb} <-> ${ta}`.toLowerCase().trim();
        if (normalizedDetailTags.includes(combo1)) {
          return { matched: true, combination: combo1 };
        }
        if (normalizedDetailTags.includes(combo2)) {
          return { matched: true, combination: combo2 };
        }
      }
    }
    return { matched: false, combination: '' };
  };

  const mapTagToGroupCol = (tag: string): string => {
    if (!tag) return '';
    const normalized = tag.toLowerCase()
      .replace(/<->/g, '↔')
      .replace(/->/g, '→')
      .replace(/<=>/g, '↔')
      .replace(/=>/g, '→')
      .trim();

    if (
      normalized.includes('bắc mỹ') || 
      normalized.includes('châu âu') || 
      normalized.includes('châu đại dương') || 
      normalized.includes('úc') || 
      normalized.includes('mỹ') ||
      normalized.includes('europe') ||
      normalized.includes('america') ||
      normalized.includes('oceania') ||
      normalized.includes('australia')
    ) {
      return 'Âu, Úc, Mỹ';
    }

    if (
      normalized.includes('đông bắc á') ||
      normalized.includes('nam á') ||
      normalized.includes('trung đông') ||
      normalized.includes('châu phi') ||
      normalized.includes('northeast asia') ||
      normalized.includes('south asia') ||
      normalized.includes('middle east') ||
      normalized.includes('africa')
    ) {
      return 'Đông Bắc Á, Nam Á và Trung Đông - Châu Phi';
    }

    if (
      normalized.includes('đông nam á') ||
      normalized.includes('đông dương') ||
      normalized.includes('southeast asia') ||
      normalized.includes('indochina')
    ) {
      return 'Đông Nam Á và Đông Dương';
    }

    if (tag.includes(' ↔ ')) {
      return tag.split(' ↔ ')[1];
    }
    if (tag.includes(' → ')) {
      return tag.split(' → ')[1];
    }
    return tag;
  };

  const customRound = (val: number): number => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const floorVal = Math.floor(absVal);
    const diff = absVal - floorVal;
    // Làm tròn: dưới .6 (.5999...) làm tròn xuống, từ .6 trở lên làm tròn lên
    // Do dùng Math.abs nên đối với số âm, "tròn xuống" là về hướng 0 (giảm độ lớn tuyệt đối)
    const roundedAbs = diff < 0.6 ? floorVal : Math.ceil(absVal);
    return isNegative ? -roundedAbs : roundedAbs;
  };

  // CORE DISCOUNT engine
  const computeDiscountAndBuildLogs = (
    tx: Transaction, 
    runningBalanceBefore: number,
    customCreditLimit?: number
  ): { 
    discount: number; 
    logs: any[];
    cumulativeDiscount: number;
    activeThreshold: Threshold | null;
    multiplier: number;
    appliedCampaigns?: { campaignName: string; amount: number; description: string }[];
    skippedSegments?: {
      segmentFromTo: string;
      segmentClass: string;
      reason: string;
      segmentDirection: string;
      campaignId?: number;
      campaignName?: string;
    }[];
  } => {
    const cl = customCreditLimit !== undefined ? customCreditLimit : creditLimit;
    const logs: any[] = [];
    const skippedSegments: {
      segmentFromTo: string;
      segmentClass: string;
      reason: string;
      segmentDirection: string;
      campaignId?: number;
      campaignName?: string;
    }[] = [];
    
    // Nếu người dùng ép buộc dùng chiết khấu nguyên bản (Phát sinh đặc biệt)
    if (tx.useOriginalDiscount) {
      logs.push({
        status: 'success',
        title: 'Sử dụng chiết khấu nguyên bản (Ép buộc)',
        details: `Người dùng đã bật tính năng khóa sử dụng chiết khấu nguyên bản từ dữ liệu gốc: +${tx.originalDiscount.toLocaleString()}đ.`
      });
      return { 
        discount: tx.originalDiscount, 
        logs, 
        cumulativeDiscount: tx.originalDiscount, 
        activeThreshold: null, 
        multiplier: 1, 
        appliedCampaigns: [{
          campaignName: "Ép buộc giữ chiết khấu gốc",
          amount: tx.originalDiscount,
          description: "Được kích hoạt thủ công cho trường hợp phát sinh đặc biệt"
        }]
      };
    }

    // Riêng loại vé Void: Giữ nguyên chiết khấu gốc
    if (tx.ticketType && tx.ticketType.trim().toLowerCase() === 'void') {
      logs.push({
        status: 'success',
        title: 'Giữ chiết khấu gốc cho vé Void',
        details: `Giao dịch là vé Void. Tự động giữ nguyên chiết khấu gốc: +${tx.originalDiscount.toLocaleString()}đ.`
      });
      return { 
        discount: tx.originalDiscount, 
        logs, 
        cumulativeDiscount: tx.originalDiscount, 
        activeThreshold: null, 
        multiplier: 1, 
        appliedCampaigns: [{
          campaignName: "Giữ chiết khấu gốc (Vé Void)",
          amount: tx.originalDiscount,
          description: "Vé Void tự động giữ nguyên chiết khấu gốc"
        }]
      };
    }

    // Yêu cầu cứng: Chỉ áp dụng cho "Vé", "Vé*" không được tính là "Vé"
    const isValidType = tx.ticketType && tx.ticketType.trim().toLowerCase() === 'vé';
    if (!isValidType) {
      logs.push({
        status: 'skipped',
        title: 'Bỏ qua dòng này',
        details: `Loại vé là "${tx.ticketType || 'Trống'}" (không thuộc diện tính chiết khấu tự động, yêu cầu cứng là "Vé").`
      });
      return { discount: 0, logs, cumulativeDiscount: 0, activeThreshold: null, multiplier: 1, appliedCampaigns: [] };
    }

    // MÃ ĐH KHÔNG CÓ TẮT PHÂN TÍCH (Trừ khi có Ngày áp dụng chỉ định thủ công)
    if ((!tx.orderCode || !tx.orderCode.trim()) && !tx.appliedDate) {
      logs.push({
        status: 'skipped',
        title: 'Tắt phân tích chiết khấu',
        details: 'Giao dịch không có Mã Đơn Hàng (Mã ĐH trống) và không có Ngày áp dụng. Tự động tắt phân tích chiết khấu.'
      });
      return { discount: 0, logs, cumulativeDiscount: 0, activeThreshold: null, multiplier: 1, appliedCampaigns: [] };
    }

    // Nếu hãng không có trong bất kỳ cấu hình chiến dịch nào thì bỏ qua tự tính, giữ nguyên chiết khấu gốc
    const carrierHasNoCampaigns = !campaigns.some(camp => camp.carrier?.toUpperCase() === tx.carrier?.toUpperCase());
    if (carrierHasNoCampaigns) {
      logs.push({
        status: 'skipped',
        title: 'Hãng không có trong danh sách chiến dịch',
        details: `Hãng hàng không "${tx.carrier}" không tồn tại trong bất kỳ cấu hình chiến dịch nào của hệ thống. Bỏ qua tự động tính chiết khấu và giữ nguyên chiết khấu nguyên bản: +${tx.originalDiscount.toLocaleString()}đ.`
      });
      return { 
        discount: tx.originalDiscount, 
        logs, 
        cumulativeDiscount: tx.originalDiscount, 
        activeThreshold: null, 
        multiplier: 1, 
        appliedCampaigns: [] 
      };
    }

    // Step 1: Tìm campaigns hợp lệ
    const calcDate = tx.appliedDate || tx.bookingDate;
    const bookingDateYMD = parseDDMMYYYY(calcDate);
    if (!bookingDateYMD) {
      logs.push({
        status: 'error',
        title: 'Lỗi định dạng ngày',
        details: `Không thể định dạng Ngày "${calcDate}" thành YYYY-MM-DD.`
      });
      return { discount: 0, logs, cumulativeDiscount: 0, activeThreshold: null, multiplier: 1 };
    }

    const txChannel = (tx.channel || 'PARTNER').trim().toUpperCase();

    logs.push({
      status: 'info',
      title: 'Thông tin kiểm tra',
      details: `Hãng bay (Chứng từ): ${tx.carrier} | Ngày mua: ${tx.bookingDate}${tx.appliedDate ? ` (Ngày áp dụng: ${tx.appliedDate})` : ''} (${bookingDateYMD}) | Kênh hiện tại: ${txChannel}`
    });

    const selectedPolicy = policies.find(p => p.id === selectedPolicyId);
    const hasPolicy = selectedPolicyId !== null && selectedPolicy;
    const allowedCampaignIds = hasPolicy && selectedPolicy.thresholds
      ? thresholds
          .filter(t => selectedPolicy.thresholds.includes(String(t.id)))
          .map(t => t.campaign_id)
          .filter((id): id is number => id !== null)
      : [];

    // Match campaigns criteria:
    // - policy linkage (only campaigns linked to thresholds of selected policy)
    // - carrier
    // - channel
    // - validity dates
    const matchedCampaigns = campaigns.filter(camp => {
      // If a policy is active, restrict campaigns to only those linked to this policy's thresholds
      if (hasPolicy) {
        if (!allowedCampaignIds.includes(camp.id)) return false;
      }

      // Channel check
      const chan = camp.channel || 'ALL';
      const isChannelMatch = chan === 'ALL' || chan === txChannel;
      if (!isChannelMatch) return false;

      // Carrier check
      const isCarrierMatch = camp.carrier?.toUpperCase() === tx.carrier?.toUpperCase();
      if (!isCarrierMatch) return false;

      // Date check
      if (camp.valid_from && bookingDateYMD < camp.valid_from) return false;
      if (camp.valid_to && bookingDateYMD > camp.valid_to) return false;

      return true;
    });

    if (matchedCampaigns.length === 0) {
      logs.push({
        status: 'skipped',
        title: 'Không tìm thấy chiến dịch phù hợp',
        details: `Không có chiến dịch nào cho hãng "${tx.carrier}" hoạt động vào ngày ${tx.bookingDate} trên kênh ${txChannel} (hoặc áp dụng cho tất cả các kênh).`
      });
      return { discount: 0, logs, cumulativeDiscount: 0, activeThreshold: null, multiplier: 1 };
    }

    logs.push({
      status: 'success',
      title: `Tìm thấy ${matchedCampaigns.length} chiến dịch thô`,
      details: `Danh sách: ${matchedCampaigns.map(c => `[ID ${c.id}] ${c.name}`).join(', ')}`
    });

    // Parse journey and first airport
    const journeyAirports = getAirportsFromJourney(tx.journey);
    const firstAirportIata = journeyAirports[0];
    let firstAirportObj = airports.find(a => a.iata?.toUpperCase() === firstAirportIata?.toUpperCase());
    const firstAirportTags = firstAirportObj?.tags || [];

    // Filter by excluded_first_tag
    const finalMatchingCampaigns = matchedCampaigns.filter(camp => {
      if (camp.excluded_first_tag) {
        const hasExcludedTag = firstAirportTags.some(t => t.toLowerCase() === camp.excluded_first_tag?.toLowerCase());
        if (hasExcludedTag) {
          logs.push({
            status: 'excluded',
            title: `Chiến dịch #${camp.id} bị loại`,
            details: `Sân bay đầu tiên ${firstAirportIata} có nhãn tags [${firstAirportTags.join(', ')}] chứa nhãn loại trừ: "${camp.excluded_first_tag}".`
          });
          return false;
        }
      }
      return true;
    });

    if (finalMatchingCampaigns.length === 0) {
      logs.push({
        status: 'skipped',
        title: 'Mọi chiến dịch đều bị loại trừ',
        details: `Tất cả chiến dịch phù hợp đều bị loại bởi bộ lọc Sân bay đầu tiên loại trừ (${firstAirportIata}).`
      });
      return { discount: 0, logs, cumulativeDiscount: 0, activeThreshold: null, multiplier: 1 };
    }

    // Evaluate groups for campaigns:
    // INDEX CHỈ ÁP DỤNG KHI GROUP = 0, KHI GROUP KHÁC 0 THÌ SẼ CỘNG DỒN. INDEX BẰNG NHAU THÌ CỘNG DỒN.
    const group0Camps = finalMatchingCampaigns.filter(c => !c.group || c.group === 0);
    const nonGroup0Camps = finalMatchingCampaigns.filter(c => c.group && c.group !== 0);

    const selectedCampaigns: Campaign[] = [];

    if (group0Camps.length > 0) {
      let minIdx = 999999;
      group0Camps.forEach(c => {
        const idx = c.index !== null && c.index !== undefined ? c.index : 999999;
        if (idx < minIdx) {
          minIdx = idx;
        }
      });

      group0Camps.forEach(c => {
        const idx = c.index !== null && c.index !== undefined ? c.index : 999999;
        if (idx === minIdx) {
          selectedCampaigns.push(c);
        }
      });

      logs.push({
        status: 'info',
        title: 'Xử lý nhóm Group 0 (Áp dụng Index)',
        details: `Tìm thấy ${group0Camps.length} chiến dịch thuộc Group 0. Index thấp nhất là ${minIdx}. Chọn được ${selectedCampaigns.filter(c => !c.group || c.group === 0).length} chiến dịch có index bằng ${minIdx} (INDEX bằng nhau thì cộng dồn).`
      });
    }

    if (nonGroup0Camps.length > 0) {
      nonGroup0Camps.forEach(c => {
        selectedCampaigns.push(c);
      });
      logs.push({
        status: 'info',
        title: 'Xử lý nhóm Group khác 0 (Cộng dồn)',
        details: `Tìm thấy ${nonGroup0Camps.length} chiến dịch thuộc nhóm khác 0. Tất cả được cộng dồn (không lọc theo index).`
      });
    }

    let cumulativeDiscount = 0;
    let appliedCampaignDetailsList: { 
      camp: Campaign; 
      detail: CampaignDetail; 
      amountCalculated: number;
      segmentDirection?: string;
      segmentFromTo?: string;
      segmentClass?: string;
    }[] = [];

    for (const selectedCamp of selectedCampaigns) {
      logs.push({
        status: 'info',
        title: `Đánh giá Chiến dịch #${selectedCamp.id}`,
        details: `Đang xét chiến dịch "${selectedCamp.name}" (Group: ${selectedCamp.group ?? 0}, Index: ${selectedCamp.index ?? 'N/A'}).`
      });

      // Lắp hành trình: Blackout check
      // 1. Booking blackout
      const isBookingBlackout = blackouts.some(b => 
        Number(b.campaign_id) === Number(selectedCamp.id) && 
        b.type === 'BOOKING' && 
        bookingDateYMD >= b.start_date && 
        bookingDateYMD <= b.end_date
      );
      if (isBookingBlackout) {
        logs.push({
          status: 'blackout',
          title: `Bị chặn bởi Giai đoạn tạm dừng (Booking)`,
          details: `Chiến dịch #${selectedCamp.id} tạm dừng đặt vé từ ngày mua.`
        });
        continue;
      }

      // 2. Fly blackout
      const flyDates = extractAllFlyDates(tx.flightTime);
      const isFlyBlackout = blackouts.some(b => 
        Number(b.campaign_id) === Number(selectedCamp.id) && 
        b.type === 'FLY' && 
        flyDates.some(fd => fd >= b.start_date && fd <= b.end_date)
      );
      if (isFlyBlackout && flyDates.length > 0) {
        logs.push({
          status: 'blackout',
          title: `Bị chặn bởi Giai đoạn tạm dừng (Fly)`,
          details: `Chiến dịch #${selectedCamp.id} tạm dừng bay vào ngày trong chuyến bay.`
        });
        continue;
      }

      // Find campaign details matching booking_class and groups_tag
      const campDetails = details.filter(d => Number(d.campaign_id) === Number(selectedCamp.id));
      if (campDetails.length === 0) {
        logs.push({
          status: 'info',
          title: `Không có chi tiết cho chiến dịch #${selectedCamp.id}`,
          details: `Bỏ qua do chiến dịch không có cấu hình chi tiết.`
        });
        continue;
      }

      // Parse journey segments
      const journeyAirportsFull = tx.journey.toUpperCase().match(/[A-Z]{3}/g) || [];
      let rawBookingClass = tx.bookingClass || "";
      let classes = rawBookingClass.toUpperCase().split(/[-/,\s]+/).map(c => c.trim()).filter(Boolean);
      if (classes.length === 0) {
        classes = [""];
      }

      interface SegmentInfo {
        from: string;
        to: string;
        bookingClass: string;
        fare: number;
        sellingPrice: number;
        index: number;
      }

      const segments: SegmentInfo[] = [];
      if (journeyAirportsFull.length >= 2) {
        const numSegments = journeyAirportsFull.length - 1;
        if (classes.length === 1 && classes[0].length === numSegments) {
          classes = classes[0].split('');
        }
        for (let i = 0; i < numSegments; i++) {
          const segClass = classes[i] || classes[classes.length - 1] || "";
          segments.push({
            from: journeyAirportsFull[i],
            to: journeyAirportsFull[i + 1],
            bookingClass: segClass,
            fare: tx.fare / numSegments,
            sellingPrice: tx.sellingPrice / numSegments,
            index: i + 1
          });
        }
      } else {
        segments.push({
          from: journeyAirports[0] || "",
          to: journeyAirports[journeyAirports.length - 1] || "",
          bookingClass: classes[0] || "",
          fare: tx.fare,
          sellingPrice: tx.sellingPrice,
          index: 1
        });
      }

      logs.push({
        status: 'info',
        title: 'Bóc tách hành trình theo chặng',
        details: `Phát hiện ${segments.length} chặng bay: ` + segments.map(s => `${s.from}-${s.to} (Hạng: ${s.bookingClass})`).join(', ')
      });

      let campaignHasMatchedAnySegment = false;

      for (const seg of segments) {
        const airportA = seg.from;
        const airportB = seg.to;
        
        const objA = airports.find(a => a.iata?.toUpperCase() === airportA?.toUpperCase());
        const objB = airports.find(a => a.iata?.toUpperCase() === airportB?.toUpperCase());
        
        const tagsA = objA?.tags || [];
        const tagsB = objB?.tags || [];

        let segmentDirectionLabel = '';
        if (segments.length === 1) {
          segmentDirectionLabel = 'Một chiều';
        } else if (segments.length === 2) {
          segmentDirectionLabel = seg.index === 1 ? 'Chiều đi' : 'Chiều về';
        } else {
          segmentDirectionLabel = `Chặng ${seg.index}`;
        }

        let matchedDetails: { d: CampaignDetail; tagMatchCombo: string }[] = [];

        for (const d of campDetails) {
          // Class check
          const isClassMatched = !d.booking_class || d.booking_class.length === 0 || 
            d.booking_class.some(bc => bc.toUpperCase() === seg.bookingClass?.toUpperCase());
          if (!isClassMatched) continue;

          // Group tag check
          const tagMatch = isGroupTagMatch(tagsA, tagsB, d.groups_tag);
          if (tagMatch.matched) {
            matchedDetails.push({ d, tagMatchCombo: tagMatch.combination });
          }
        }

        if (matchedDetails.length === 0) {
          // Diagnose why it failed to find a matching campaign detail
          let hasRouteMatch = false;
          let routeMatchCombo = '';
          let classesInRoute = new Set<string>();

          for (const d of campDetails) {
            const tagMatch = isGroupTagMatch(tagsA, tagsB, d.groups_tag);
            if (tagMatch.matched) {
              hasRouteMatch = true;
              routeMatchCombo = tagMatch.combination;
              if (d.booking_class) {
                d.booking_class.forEach(c => classesInRoute.add(c.toUpperCase()));
              }
            }
          }

          let diagDetails = '';
          if (hasRouteMatch) {
            if (classesInRoute.size > 0 && !classesInRoute.has(seg.bookingClass?.toUpperCase())) {
              diagDetails = `Hạng vé: ${seg.bookingClass || 'Trống'} | Nhãn khớp: "${routeMatchCombo.toUpperCase()}" | Không áp dụng cho hạng này`;
            } else {
              diagDetails = `Hạng vé: ${seg.bookingClass || 'Trống'} | Nhãn khớp: "${routeMatchCombo.toUpperCase()}" | Cấu hình chiết khấu trống hoặc bằng 0`;
            }
          } else {
            diagDetails = `Hành trình: ${seg.from}-${seg.to} | Không khớp với bất kỳ vùng bay nào trong chiến dịch #${selectedCamp.id}`;
          }

          skippedSegments.push({
            segmentFromTo: `${seg.from}-${seg.to}`,
            segmentClass: seg.bookingClass || '',
            reason: diagDetails,
            segmentDirection: segmentDirectionLabel,
            campaignId: selectedCamp.id,
            campaignName: selectedCamp.name
          });

          logs.push({
            status: 'skipped',
            title: `${segmentDirectionLabel} (${seg.from}-${seg.to}) - ID #${selectedCamp.id}`,
            details: diagDetails
          });
          continue;
        }

        campaignHasMatchedAnySegment = true;

        // "NẾU CÓ HƠN 1 campaign_details ĐỦ ĐIỀU KIỆN TA SẼ SET THEO INDEX"
        const sortedDetails = [...matchedDetails].sort((a, b) => {
          const idxA = a.d.index !== null && a.d.index !== undefined ? a.d.index : 999999;
          const idxB = b.d.index !== null && b.d.index !== undefined ? b.d.index : 999999;
          return idxA - idxB;
        });

        const bestDetail = sortedDetails[0].d;
        const matchCombo = sortedDetails[0].tagMatchCombo;

        // Calculate amount
        let amt = 0;
        let calcStr = '';
        if (bestDetail.discount_percentage === 0 || !bestDetail.discount_percentage) {
          amt = bestDetail.amount || 0;
          calcStr = `Chiết khấu số tiền cố định: ${amt.toLocaleString()}đ`;
        } else {
          const pct = bestDetail.discount_percentage;
          if (bestDetail.discount_base === 'FARE') {
            const baseFare = selectedCamp.ticket ? tx.fare : seg.fare;
            amt = (pct * baseFare) / 100;
            calcStr = selectedCamp.ticket
              ? `Phần trăm vé (${pct}% của Tổng giá vé: ${customRound(tx.fare).toLocaleString()}đ) = ${customRound(amt).toLocaleString()}đ`
              : `Phần trăm vé (${pct}% của Giá vé chặng: ${customRound(seg.fare).toLocaleString()}đ) = ${customRound(amt).toLocaleString()}đ`;
          } else {
            const baseSellingPrice = selectedCamp.ticket ? tx.sellingPrice : seg.sellingPrice;
            amt = (pct * baseSellingPrice) / 100;
            calcStr = selectedCamp.ticket
              ? `Phần trăm bán (${pct}% của Tổng giá bán: ${customRound(tx.sellingPrice).toLocaleString()}đ) = ${customRound(amt).toLocaleString()}đ`
              : `Phần trăm bán (${pct}% của Giá bán chặng: ${customRound(seg.sellingPrice).toLocaleString()}đ) = ${customRound(amt).toLocaleString()}đ`;
          }
        }

        logs.push({
          status: 'success',
          title: `${segmentDirectionLabel} (${seg.from}-${seg.to}) - ID #${bestDetail.id}`,
          details: `Hạng vé: ${seg.bookingClass} | Nhãn khớp: "${matchCombo.toUpperCase()}" | Tính toán: ${calcStr}`
        });

        cumulativeDiscount += amt;
        appliedCampaignDetailsList.push({ 
          camp: selectedCamp, 
          detail: bestDetail, 
          amountCalculated: amt,
          segmentDirection: segmentDirectionLabel,
          segmentFromTo: `${seg.from}-${seg.to}`,
          segmentClass: seg.bookingClass
        });

        if (selectedCamp.ticket) {
          logs.push({
            status: 'info',
            title: 'Dừng quét các chặng tiếp theo (CK theo Vé)',
            details: `Chiến dịch #${selectedCamp.id} được cấu hình tính theo Vé và chặng "${seg.from}-${seg.to}" đã thoả mãn điều kiện. Bỏ qua quét các chặng còn lại.`
          });
          break;
        }
      }

      if (!campaignHasMatchedAnySegment) {
        continue;
      }
    }

    if (cumulativeDiscount === 0) {
      return { discount: 0, logs, cumulativeDiscount: 0, activeThreshold: null, multiplier: 1, appliedCampaigns: [] };
    }

    logs.push({
      status: 'info',
      title: 'Tổng cộng chiết khấu trước ngưỡng',
      details: `Lũy kế các vòng lặp nhóm chiến dịch = ${cumulativeDiscount.toLocaleString()}đ`
    });

    // Step 2: Apply Threshold modifier per applied campaign
    const policy = policies.find(p => p.id === selectedPolicyId);
    const activeThresholdIds = policy?.thresholds || [];

    const balanceBeforeWithLimit = runningBalanceBefore + cl;
    const balanceBeforeMinusPrice = balanceBeforeWithLimit - tx.sellingPrice;

    let totalFinalDiscount = 0;
    let firstActiveThreshold: Threshold | null = null;
    let firstMultiplier = 1.0;
    const appliedCampaigns: any[] = [];

    logs.push({
      status: 'info',
      title: 'Đánh giá ngưỡng số dư cho từng chiến dịch',
      details: `Số dư sau vé: Lũy kế trước + Công nợ - Giá bán = ${runningBalanceBefore.toLocaleString()} + ${cl.toLocaleString()} - ${tx.sellingPrice.toLocaleString()} = ${balanceBeforeMinusPrice.toLocaleString()}đ`
    });

    for (const app of appliedCampaignDetailsList) {
      // Find specific threshold containing this campaign ID
      let th = thresholds.find(t => 
        activeThresholdIds.includes(String(t.id)) && 
        t.campaign_id !== null && 
        String(t.campaign_id) === String(app.camp.id)
      );

      // Fallback to "Chung" (where campaign_id is null)
      if (!th) {
        th = thresholds.find(t => 
          activeThresholdIds.includes(String(t.id)) && 
          t.campaign_id === null
        ) || null;
      }

      let multiplier = 1.0;
      let thresholdReason = '';
      if (th) {
        if (!firstActiveThreshold) {
          firstActiveThreshold = th;
        }
        const isGreater = balanceBeforeMinusPrice >= th.threshold_value;
        multiplier = isGreater ? th.if_greater_value / 100 : th.if_less_value / 100;
        if (firstActiveThreshold === th) {
          firstMultiplier = multiplier;
        }

        const thName = th.campaign_id ? `Ngưỡng riêng [${app.camp.name}]` : 'Ngưỡng chung';
        const conditionLabel = isGreater ? 'Lớn hơn/Bằng' : 'Nhỏ hơn';
        const multPct = isGreater ? th.if_greater_value : th.if_less_value;

        logs.push({
          status: isGreater ? 'success' : 'warning',
          title: `Áp dụng ${thName} cho ${app.camp.name}`,
          details: `Ngưỡng: ${th.threshold_value.toLocaleString()}đ (${conditionLabel}). Nhân hệ số ${multPct}% lên khoản chiết khấu ${app.amountCalculated.toLocaleString()}đ.`
        });

        if (!isGreater) {
          thresholdReason = `Số dư ước tính sau mua (${balanceBeforeMinusPrice.toLocaleString()}đ) thấp hơn mức tối thiểu trong ${thName} (${th.threshold_value.toLocaleString()}đ). Nhân hệ số phạt ${multPct}%.`;
        }
      } else {
        logs.push({
          status: 'info',
          title: `Không có ngưỡng cho ${app.camp.name}`,
          details: `Giữ nguyên hệ số 100% cho khoản chiết khấu ${app.amountCalculated.toLocaleString()}đ.`
        });
      }

      const campaignFinalAmount = customRound(app.amountCalculated * multiplier);
      totalFinalDiscount += campaignFinalAmount;

      let desc = '';
      if (app.detail.discount_percentage === 0 || !app.detail.discount_percentage) {
        desc = `Cố định: ${app.detail.amount?.toLocaleString()}đ`;
      } else {
        const pct = app.detail.discount_percentage;
        const segDiv = app.segmentDirection === 'Một chiều' ? 1 : 2;
        if (app.detail.discount_base === 'FARE') {
          desc = `${pct}% Giá vé chặng (${customRound(tx.fare / segDiv).toLocaleString()}đ)`;
        } else {
          desc = `${pct}% Giá bán chặng (${customRound(tx.sellingPrice / segDiv).toLocaleString()}đ)`;
        }
      }
      const directionSuffix = app.segmentDirection ? ` - ${app.segmentDirection} (${app.segmentFromTo}) [Hạng ${app.segmentClass}]` : '';

      appliedCampaigns.push({
        campaignId: app.camp.id,
        campaignName: `${app.camp.name}${directionSuffix}`,
        amount: app.amountCalculated,
        description: desc,
        multiplier,
        finalAmount: campaignFinalAmount,
        thresholdReason,
        matchedDetailId: app.detail.id,
        matchedBookingClass: app.segmentClass,
        matchedJourney: app.segmentFromTo
      });
    }

    logs.push({
      status: 'success',
      title: 'Tổng chiết khấu cuối cùng sau ngưỡng',
      details: `Tổng chiết khấu của các chiến dịch đã điều chỉnh = ${totalFinalDiscount.toLocaleString()}đ`
    });

    return { 
      discount: totalFinalDiscount, 
      logs, 
      cumulativeDiscount, 
      activeThreshold: firstActiveThreshold, 
      multiplier: firstMultiplier, 
      appliedCampaigns,
      skippedSegments
    };
  };

  const convertDMYtoYMD = (dmy: string): string => {
    if (!dmy) return '';
    const parts = dmy.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dmy;
  };

  const convertYMDtoDMY = (ymd: string): string => {
    if (!ymd) return '';
    const parts = ymd.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return ymd;
  };

  // Group and calculate with deposits-first rule
  const recalculateBalancesAndDiscounts = (
    txList: Transaction[], 
    startBal: number,
    customCreditLimit?: number
  ): Transaction[] => {
    // Sort txList by effective date (appliedDate or bookingDate) chronologically, then by STT
    const sortedTxList = [...txList].sort((a, b) => {
      const dateA = parseDDMMYYYY(a.appliedDate || a.bookingDate) || '';
      const dateB = parseDDMMYYYY(b.appliedDate || b.bookingDate) || '';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      return a.stt - b.stt;
    });

    // Group transactions by effective date to treat deposits as occurring at the beginning of each day
    const uniqueDates: string[] = [];
    sortedTxList.forEach(tx => {
      const effDate = tx.appliedDate || tx.bookingDate;
      if (!uniqueDates.includes(effDate)) {
        uniqueDates.push(effDate);
      }
    });

    let currentBalance = startBal;
    let currentOriginalBalance = startBal;
    const computedMap = new Map<number, Transaction>();

    uniqueDates.forEach(date => {
      const dayTxs = sortedTxList.filter(tx => (tx.appliedDate || tx.bookingDate) === date);
      
      const deposits = dayTxs.filter(tx => tx.credit > 0);
      const others = dayTxs.filter(tx => tx.credit === 0);

      // Process deposits first!
      deposits.forEach(tx => {
        const balBefore = currentBalance;
        currentBalance += tx.credit;
        currentOriginalBalance += tx.credit;

        const isVoid = tx.ticketType && tx.ticketType.trim().toLowerCase() === 'void';
        const discountVal = isVoid ? tx.originalDiscount : 0;

        computedMap.set(tx.stt, {
          ...tx,
          discount: discountVal,
          debt: 0,
          balanceBefore: balBefore,
          balance: currentBalance,
          originalBalance: currentOriginalBalance
        });
      });

      // Process other transactions in original STT order
      const sortedOthers = [...others].sort((a, b) => a.stt - b.stt);
      sortedOthers.forEach(tx => {
        const balBefore = currentBalance;
        if (tx.ticketType === 'Hoàn') {
          const netRefund = tx.sellingPrice + tx.originalDiscount;
          currentBalance += netRefund;
          currentOriginalBalance += netRefund;
          computedMap.set(tx.stt, {
            ...tx,
            discount: 0,
            debt: -netRefund,
            balanceBefore: balBefore,
            balance: currentBalance,
            originalBalance: currentOriginalBalance
          });
        } else if (tx.ticketType === 'Đổi') {
          currentBalance -= tx.sellingPrice;
          currentOriginalBalance -= tx.sellingPrice;
          computedMap.set(tx.stt, {
            ...tx,
            discount: 0,
            debt: tx.sellingPrice,
            balanceBefore: balBefore,
            balance: currentBalance,
            originalBalance: currentOriginalBalance
          });
        } else {
          // Ticket / Ticket*
          const { discount } = computeDiscountAndBuildLogs(tx, currentBalance, customCreditLimit);
          const debt = tx.sellingPrice - discount;
          currentBalance -= debt;

          const origDebt = tx.sellingPrice - tx.originalDiscount;
          currentOriginalBalance -= origDebt;

          computedMap.set(tx.stt, {
            ...tx,
            discount,
            debt,
            balanceBefore: balBefore,
            balance: currentBalance,
            originalBalance: currentOriginalBalance
          });
        }
      });
    });

    return txList.map(tx => computedMap.get(tx.stt) || tx);
  };

  const handleUpdateOriginalDiscount = (stt: number, value: number) => {
    const updatedTxs = transactions.map(tx => {
      if (tx.stt === stt) {
        return {
          ...tx,
          originalDiscount: value
        };
      }
      return tx;
    });

    const finalComputed = recalculateBalancesAndDiscounts(updatedTxs, startingBalance);
    setTransactions(finalComputed);
  };

  const handleUpdateFare = (stt: number, value: number) => {
    const updatedTxs = transactions.map(tx => {
      if (tx.stt === stt) {
        return {
          ...tx,
          fare: value
        };
      }
      return tx;
    });

    const finalComputed = recalculateBalancesAndDiscounts(updatedTxs, startingBalance);
    setTransactions(finalComputed);
  };

  const handleToggleUseOriginalDiscount = (stt: number) => {
    const updatedTxs = transactions.map(tx => {
      if (tx.stt === stt) {
        return {
          ...tx,
          useOriginalDiscount: !tx.useOriginalDiscount
        };
      }
      return tx;
    });

    const finalComputed = recalculateBalancesAndDiscounts(updatedTxs, startingBalance);
    setTransactions(finalComputed);
    showToast(`Đã thay đổi chế độ giữ chiết khấu gốc cho STT ${stt}`);
  };

  const handleUpdateCreditLimit = (val: number) => {
    setCreditLimit(val);
    const computed = recalculateBalancesAndDiscounts(transactions, startingBalance, val);
    setTransactions(computed);
  };

  const startScrollCapture = async () => {
    const container = document.getElementById('skyjet-transactions-scroll-container');
    if (!container) {
      alert('Không tìm thấy container bảng cần chụp.');
      return;
    }

    const iframeRect = (window as any).skyjetIframeRect;
    if (!iframeRect) {
      alert('Không xác định được vị trí của bảng tính công nợ. Vui lòng tải lại trang (F5) và thử lại.');
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    const originalScrollTop = container.scrollTop;

    const statusText = document.createElement('div');
    statusText.innerText = 'Đang chuẩn bị chụp cuộn...';
    statusText.style.position = 'fixed';
    statusText.style.bottom = '20px';
    statusText.style.left = '20px';
    statusText.style.background = '#2aa7dd';
    statusText.style.color = '#fff';
    statusText.style.padding = '10px 15px';
    statusText.style.borderRadius = '5px';
    statusText.style.zIndex = '99999';
    statusText.style.fontFamily = 'sans-serif';
    statusText.style.fontSize = '12px';
    statusText.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    document.body.appendChild(statusText);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    let tfootEl: HTMLTableSectionElement | null = null;
    let stickyTds: any = [];
    let originalTfootPosition = '';
    let originalTdPositions: string[] = [];

    try {
      const captureTabRect = () => {
        return new Promise<{ success: boolean; dataUrl?: string; error?: string }>((resolve) => {
          chrome.runtime.sendMessage({ action: 'capture_tab_rect' }, (response: any) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else if (!response) {
              resolve({ success: false, error: 'Không phản hồi từ background' });
            } else {
              resolve(response);
            }
          });
        });
      };

      const loadImage = (src: string) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(new Error('Lỗi load ảnh: ' + e));
          img.src = src;
        });
      };

      const totalWidth = container.clientWidth;
      const totalHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      const headerEl = container.querySelector('thead');
      const headerHeight = headerEl ? headerEl.clientHeight : 0;

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth * devicePixelRatio;
      canvas.height = totalHeight * devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không tạo được canvas 2D');

      let prevScrollTop = 0;
      let cumulativeDrawnHeight = 0;
      container.scrollTop = 0;
      await sleep(250);

      // Temporarily change tfoot and all its td cells to static to prevent them from overlaying on every frame
      tfootEl = container.querySelector('tfoot');
      stickyTds = tfootEl ? Array.from(tfootEl.querySelectorAll('td')) : [];
      originalTfootPosition = tfootEl ? tfootEl.style.position : '';
      originalTdPositions = stickyTds.map((td: any) => td.style.position);

      if (tfootEl) {
        tfootEl.style.position = 'static';
      }
      stickyTds.forEach((td: any) => {
        td.style.position = 'static';
      });

      let frameIndex = 0;
      while (true) {
        const actualScrollTop = container.scrollTop;
        const diff = frameIndex === 0 ? clientHeight : (actualScrollTop - prevScrollTop);

        // Break if we are not the first frame and did not scroll anything new
        if (frameIndex > 0 && diff <= 0) break;

        const maxProgressScroll = totalHeight - clientHeight;
        const progress = maxProgressScroll > 0 
          ? Math.min(100, Math.round((actualScrollTop / maxProgressScroll) * 100))
          : 100;
        statusText.innerText = `Đang chụp cuộn: ${isNaN(progress) ? 100 : progress}%`;

        // Hide floating action buttons and status text during screen capture
        statusText.style.display = 'none';
        const floatBtns = document.querySelectorAll('.fixed');
        floatBtns.forEach((btn: any) => {
          if (btn !== statusText) btn.style.display = 'none';
        });

        await sleep(150); // Give the browser time to paint hidden elements
        const result = await captureTabRect();

        // Restore floating buttons and status text visibility
        statusText.style.display = 'block';
        floatBtns.forEach((btn: any) => {
          btn.style.display = '';
        });

        if (!result.success || !result.dataUrl) {
          throw new Error(result.error || 'Chụp ảnh màn hình thất bại');
        }
        const dataUrl = result.dataUrl;

        const img = await loadImage(dataUrl);
        const tableRect = container.getBoundingClientRect();

        let srcY = 0;
        let srcH = 0;
        let destY = cumulativeDrawnHeight * devicePixelRatio;

        if (frameIndex === 0) {
          srcY = (iframeRect.y + tableRect.top) * devicePixelRatio;
          srcH = clientHeight * devicePixelRatio;
          cumulativeDrawnHeight = clientHeight;
        } else {
          // Copy only the newly revealed bottom-most portion of the viewport
          srcY = (iframeRect.y + tableRect.top + clientHeight - diff) * devicePixelRatio;
          srcH = diff * devicePixelRatio;
          cumulativeDrawnHeight += diff;
        }

        const srcX = (iframeRect.x + tableRect.left) * devicePixelRatio;
        const srcW = tableRect.width * devicePixelRatio;

        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, destY, srcW, srcH);

        prevScrollTop = actualScrollTop;
        frameIndex++;

        // Try scrolling to the next position
        const scrollStep = clientHeight - headerHeight;
        const nextScrollTop = actualScrollTop + scrollStep;
        
        if (nextScrollTop >= totalHeight) break;

        container.scrollTop = nextScrollTop;
        await sleep(250); // Allow container to scroll and render new rows
      }

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = canvas.width;
      finalCanvas.height = Math.min(canvas.height, cumulativeDrawnHeight * devicePixelRatio);
      const finalCtx = finalCanvas.getContext('2d');
      if (finalCtx) {
        finalCtx.drawImage(canvas, 0, 0);
        const finalDataUrl = finalCanvas.toDataURL('image/png');
        window.parent.postMessage({ action: 'skyjet_show_preview', dataUrl: finalDataUrl }, '*');
      } else {
        const finalDataUrl = canvas.toDataURL('image/png');
        window.parent.postMessage({ action: 'skyjet_show_preview', dataUrl: finalDataUrl }, '*');
      }

    } catch (err: any) {
      console.error('Lỗi chụp cuộn: ', err);
      alert('Lỗi chụp cuộn: ' + err.message);
    } finally {
      // Guaranteed removal of status text first
      try {
        if (statusText) statusText.remove();
      } catch (e) {
        console.error('Lỗi khi xóa statusText:', e);
      }
      
      try {
        if (tfootEl) {
          tfootEl.style.position = originalTfootPosition;
        }
      } catch (e) {}

      try {
        stickyTds.forEach((td: any, i: number) => {
          td.style.position = originalTdPositions[i] || '';
        });
      } catch (e) {}

      try {
        const floatBtns = document.querySelectorAll('.fixed');
        floatBtns.forEach((btn: any) => {
          btn.style.display = '';
        });
      } catch (e) {}

      try {
        container.scrollTop = originalScrollTop;
      } catch (e) {}
    }
  };

  startScrollCaptureRef.current = startScrollCapture;

  // Run the full automatic calculation across the sheet!
  const runAutoCalculator = () => {
    const computed = recalculateBalancesAndDiscounts(transactions, startingBalance);
    setTransactions(computed);
    showToast('Hệ thống đã tự động tính và cập nhật chiết khấu dựa trên cấu hình hiện tại!');
  };

  const handleInspectRow = (tx: Transaction) => {
    const balanceBefore = tx.balanceBefore !== undefined ? tx.balanceBefore : startingBalance;
    const { discount, logs, cumulativeDiscount, activeThreshold, multiplier, appliedCampaigns, skippedSegments } = computeDiscountAndBuildLogs(tx, balanceBefore);
    
    // Determine the primary reason for the discount (or lack thereof)
    let primaryReason = '';
    let hasMatchedCampaigns = false;
    const carrierHasNoCampaigns = !campaigns.some(camp => camp.carrier?.toUpperCase() === tx.carrier?.toUpperCase());

    if (carrierHasNoCampaigns) {
      primaryReason = `Hãng hàng không "${tx.carrier}" không nằm trong bất kỳ cấu hình chiến dịch nào của hệ thống. Vì vậy, hệ thống bỏ qua việc tự động tính toán lại chiết khấu và giữ nguyên chiết khấu nguyên bản là +${tx.originalDiscount.toLocaleString()}đ.`;
    } else if (discount > 0) {
      hasMatchedCampaigns = true;
      if (multiplier !== 1) {
        const targetCamp = activeThreshold?.campaign_id ? campaigns.find(c => c.id === activeThreshold.campaign_id) : null;
        const thName = targetCamp ? `Ngưỡng ${targetCamp.name}` : 'Ngưỡng áp dụng chung';
        primaryReason = `Giao dịch đủ điều kiện hưởng chiết khấu ban đầu là +${cumulativeDiscount.toLocaleString()}đ. Tuy nhiên, do áp dụng quy tắc ${thName}, chiết khấu cuối cùng bị nhân với hệ số ${multiplier * 100}% để ra +${discount.toLocaleString()}đ.`;
      } else {
        primaryReason = `Giao dịch hoàn toàn hợp lệ và đủ điều kiện để nhận chiết khấu tự động là +${discount.toLocaleString()}đ.`;
      }
    } else {
      // 0 discount
      const isValidType = tx.ticketType && tx.ticketType.trim().toLowerCase() === 'vé';
      if (!isValidType) {
        primaryReason = `Hệ thống quy định chỉ tự động tính chiết khấu cho giao dịch có loại chính xác là "Vé". Hiện tại loại giao dịch của dòng này là "${tx.ticketType || 'Trống'}" (các loại "Vé*", "Hoàn", "Đổi" hoặc trống sẽ bị loại bỏ và không được áp dụng chiết khấu).`;
      } else if (!tx.orderCode || !tx.orderCode.trim()) {
        primaryReason = `Hệ thống quy định không tự động tính chiết khấu cho giao dịch không có Mã Đơn Hàng (Mã ĐH trống).`;
      } else {
        // Booking date parse check
        const bookingDateYMD = parseDDMMYYYY(tx.bookingDate);
        if (!bookingDateYMD) {
          primaryReason = `Lỗi hệ thống: Định dạng ngày chứng từ "${tx.bookingDate}" không hợp lệ, không thể đối soát.`;
        } else {
          const txChannel = (tx.channel || 'PARTNER').trim().toUpperCase();
          // Check if any campaign matched initially
          const matchedCampaigns = campaigns.filter(camp => {
            const chan = camp.channel || 'ALL';
            const isChannelMatch = chan === 'ALL' || chan === txChannel;
            if (!isChannelMatch) return false;
            const isCarrierMatch = camp.carrier?.toUpperCase() === tx.carrier?.toUpperCase();
            if (!isCarrierMatch) return false;
            if (camp.valid_from && bookingDateYMD < camp.valid_from) return false;
            if (camp.valid_to && bookingDateYMD > camp.valid_to) return false;
            return true;
          });

          if (matchedCampaigns.length === 0) {
            primaryReason = `Không tìm thấy bất kỳ chiến dịch chiết khấu nào hoạt động cho hãng "${tx.carrier}" vào ngày mua vé ${tx.bookingDate} trên kênh bán hàng "${txChannel}" (hoặc áp dụng cho tất cả các kênh).`;
          } else {
            hasMatchedCampaigns = true;
            // First airport check
            const journeyAirports = getAirportsFromJourney(tx.journey);
            const firstAirportIata = journeyAirports[0];
            const firstAirportObj = airports.find(a => a.iata?.toUpperCase() === firstAirportIata?.toUpperCase());
            const firstAirportTags = firstAirportObj?.tags || [];
            
            const firstAirportExcluded = matchedCampaigns.some(camp => {
              if (camp.excluded_first_tag) {
                return firstAirportTags.some(t => t.toLowerCase() === camp.excluded_first_tag?.toLowerCase());
              }
              return false;
            });

            if (firstAirportExcluded) {
              primaryReason = `Chiến dịch bị loại trừ bởi Sân bay đầu tiên: Sân bay khởi hành "${firstAirportIata}" chứa thẻ (tag) loại trừ [${firstAirportTags.join(', ')}] được quy định trong cấu hình chiến dịch.`;
            } else {
              // Blackout period check
              const isBookingBlackout = blackouts.some(b => 
                matchedCampaigns.some(camp => Number(camp.id) === Number(b.campaign_id)) && 
                b.type === 'BOOKING' && 
                bookingDateYMD >= b.start_date && 
                bookingDateYMD <= b.end_date
              );
              const flyDates = extractAllFlyDates(tx.flightTime);
              const isFlyBlackout = blackouts.some(b => 
                matchedCampaigns.some(camp => Number(camp.id) === Number(b.campaign_id)) && 
                b.type === 'FLY' && 
                flyDates.some(fd => fd >= b.start_date && fd <= b.end_date)
              );

              if (isBookingBlackout || isFlyBlackout) {
                primaryReason = `Giao dịch bị từ chối do rơi vào Giai đoạn tạm dừng (Blackout Period) của chiến dịch (bị chặn bởi thời gian mua vé hoặc thời gian bay trùng lịch tạm nghỉ).`;
              } else {
                // Check campaign details
                if (cumulativeDiscount === 0) {
                  primaryReason = `Hạng đặt chỗ "${tx.bookingClass || 'Trống'}" hoặc hành trình "${tx.journey}" không nằm trong danh mục chi tiết được ưu đãi chiết khấu của chiến dịch này.`;
                } else if (multiplier === 0) {
                  const balanceBeforeWithLimit = balanceBefore + creditLimit;
                  const balanceBeforeMinusPrice = balanceBeforeWithLimit - tx.sellingPrice;
                  const targetCamp = activeThreshold?.campaign_id ? campaigns.find(c => c.id === activeThreshold.campaign_id) : null;
                  const thName = targetCamp ? `Ngưỡng ${targetCamp.name}` : 'Ngưỡng áp dụng chung';
                  primaryReason = `Giao dịch ban đầu ĐỦ ĐIỀU KIỆN nhận mức chiết khấu gốc là +${cumulativeDiscount.toLocaleString()}đ. Tuy nhiên, sau khi cộng thêm bảo lãnh công nợ (+${creditLimit.toLocaleString()}đ) và trừ đi giá bán vé này, số dư tài khoản ước tính của bạn (${balanceBeforeMinusPrice.toLocaleString()}đ) vẫn thấp hơn mức tối thiểu quy định trong ${thName} (${activeThreshold?.threshold_value.toLocaleString()}đ). Vì vậy, hệ thống bắt buộc áp dụng hệ số phạt nhân 0% (if_less_value), triệt tiêu hoàn toàn chiết khấu thực tế về 0đ.`;
                } else {
                  primaryReason = `Không nhận được chiết khấu do các điều kiện ràng buộc khác của hệ thống.`;
                }
              }
            }
          }
        }
      }
    }

    setSelectedTx(tx);
    setInspectorResult({
      simulatedDiscount: discount,
      cumulativeDiscount,
      activeThreshold,
      multiplier,
      primaryReason,
      hasChecked: true,
      appliedCampaigns,
      hasMatchedCampaigns,
      skippedSegments
    });
    setDebugLog(logs);
    setInspectorTab('info');
    setIsInspectorOpen(true);
  };

  const handleResetToDefault = () => {
    setTransactions(DEFAULT_TRANSACTIONS);
    setStartingBalance(4719200);
    showToast('Đã khôi phục dữ liệu danh sách giao dịch mẫu.');
  };

  const handleClearAll = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách công nợ hiện tại? Hành động này không thể hoàn tác.")) {
      setTransactions([]);
      setStartingBalance(0);
      setAgencyName('');
      setAgencyCode('');
      setAgencyEmail('');
      showToast('Đã xóa toàn bộ dữ liệu danh sách công nợ.');
    }
  };

  const handleImportHtml = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importHtmlText.trim()) {
      showToast('Vui lòng nhập mã HTML hợp lệ!', 'error');
      return;
    }

    try {
      const parsed = parseHtmlDebtData(importHtmlText);
      if (parsed.transactions.length === 0) {
        showToast('Không tìm thấy giao dịch nào trong mã HTML. Vui lòng kiểm tra lại cấu trúc thẻ!', 'error');
        return;
      }

      setAgencyName(parsed.agencyName);
      setAgencyCode(parsed.agencyCode);
      setAgencyEmail(parsed.agencyEmail);
      setStartingBalance(parsed.startingBalance);
      if (parsed.creditLimit !== undefined) {
        setCreditLimit(parsed.creditLimit);
      }
      
      const finalTxs = parsed.transactions.map(t => ({
        ...t,
        originalBalance: t.balance
      }));

      setTransactions(finalTxs);
      setIsImportModalOpen(false);
      setImportHtmlText('');
      showToast(`Import thành công ${finalTxs.length} giao dịch và cập nhật thông tin phòng vé ${parsed.agencyName}!`);
    } catch (err: any) {
      console.error(err);
      showToast(`Lỗi khi phân tích HTML: ${err.message || err}`, 'error');
    }
  };

  // Math totals
  const totalSelling = transactions.reduce((sum, tx) => sum + (tx.ticketType !== 'Hoàn' ? tx.sellingPrice : 0), 0);
  const totalDiscounts = transactions.reduce((sum, tx) => sum + tx.discount, 0);
  const totalOriginalDiscounts = transactions.reduce((sum, tx) => sum + tx.originalDiscount, 0);
  const totalCredit = transactions.reduce((sum, tx) => sum + tx.credit, 0);
  const endBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : startingBalance;

  return (
    <div id="calculator-tab-root" className="space-y-3 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border transition-all animate-in slide-in-from-top ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' 
            : 'bg-rose-950/90 text-rose-300 border-rose-500/30'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm font-semibold">{toast.text}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-6 gap-1.5">
        {/* Policy Selector */}
        <div className="bg-zinc-900/15 border border-zinc-900/50 rounded px-2.5 py-1 flex items-center justify-between gap-1.5 min-h-[38px] col-span-2 md:col-span-1">
          <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider leading-none whitespace-nowrap mr-1">Chính sách</label>
          <div className="flex-1 min-w-0">
            <CustomSelect
              value={selectedPolicyId || ''}
              onChange={(val) => setSelectedPolicyId(val ? Number(val) : null)}
              disabled={isAgent}
              placeholder="-- Chọn CS --"
              options={policies.map(p => ({ value: p.id, label: p.name }))}
            />
          </div>
        </div>

        {/* Starting balance input */}
        <div className="bg-zinc-900/15 border border-zinc-900/50 rounded px-2.5 py-1 flex items-center justify-between gap-1.5 min-h-[38px]">
          <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider leading-none whitespace-nowrap">Số dư đầu kỳ</label>
          <div className="relative leading-none flex-1 min-w-0 max-w-[120px]">
            <input
              type="text"
              value={startingBalance.toLocaleString('en-US')}
              disabled
              className="block w-full py-0.5 px-1 pr-3 border border-zinc-850 rounded bg-zinc-900/30 font-mono text-emerald-500/70 font-extrabold text-[10px] text-right focus:outline-none cursor-not-allowed select-none"
            />
            <span className="absolute inset-y-0 right-1 flex items-center pointer-events-none text-zinc-500 font-bold text-[8px]">đ</span>
          </div>
        </div>

        {/* Hạn mức công nợ (creditLimit) */}
        <div className="bg-zinc-900/15 border border-zinc-900/50 rounded px-2.5 py-1 flex items-center justify-between gap-1.5 min-h-[38px]">
          <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider leading-none whitespace-nowrap">Hạn mức công nợ</label>
          <div className="relative leading-none flex-1 min-w-0 max-w-[120px]">
            <input
              type="text"
              value={creditLimit.toLocaleString('en-US')}
              onChange={(e) => {
                const rawVal = e.target.value.replace(/[^\d-]/g, '');
                const val = parseInt(rawVal, 10) || 0;
                handleUpdateCreditLimit(val);
              }}
              className="block w-full py-0.5 px-1 pr-3 border border-zinc-800/80 rounded bg-zinc-950/60 font-mono text-amber-400 font-extrabold text-[10px] text-right focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              placeholder="Hạn mức..."
            />
            <span className="absolute inset-y-0 right-1 flex items-center pointer-events-none text-zinc-500 font-bold text-[8px]">đ</span>
          </div>
        </div>

        {/* Total stats */}
        <div className="bg-zinc-900/15 border border-zinc-900/50 rounded px-2.5 py-1 flex items-center justify-between gap-1.5 min-h-[38px]">
          <div className="flex flex-col justify-center min-w-0">
            <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider leading-none whitespace-nowrap">Tổng chiết khấu</label>
          </div>
          <div className="text-[10px] font-bold font-mono leading-none shrink-0 text-right">
            {totalDiscounts !== totalOriginalDiscounts ? (
              <div className="flex flex-col items-end gap-0.5 leading-none">
                <span className="text-zinc-500 line-through text-[8px] font-normal">+{totalOriginalDiscounts.toLocaleString()}</span>
                <span className="text-rose-400 font-extrabold text-[9px] animate-pulse">+{totalDiscounts.toLocaleString()}</span>
              </div>
            ) : (
              <span className="text-amber-400">+{totalDiscounts.toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Remaining balance state (Quỹ) */}
        <div className="bg-zinc-900/15 border border-zinc-900/50 rounded px-2.5 py-1 flex items-center justify-between gap-1.5 min-h-[38px]">
          <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider leading-none whitespace-nowrap">Dư cuối kỳ (Quỹ)</label>
          <span className={`text-[10px] font-black font-mono shrink-0 text-right ${endBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {endBalance.toLocaleString()}
          </span>
        </div>

        {/* Ending balance state + Credit Limit */}
        <div className="bg-zinc-900/15 border border-zinc-900/50 rounded px-2.5 py-1 flex items-center justify-between gap-1.5 min-h-[38px]">
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1 leading-none">
              <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider leading-none whitespace-nowrap">Dư cuối + Công nợ</label>
              <span className={`text-[7px] font-bold leading-none shrink-0 ${
                (endBalance + creditLimit) >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'
              }`}>
                {(endBalance + creditLimit) >= 0 ? '✓ Đủ' : '✗ Vượt'}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-black font-mono shrink-0 text-right ${(endBalance + creditLimit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {(endBalance + creditLimit).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white border border-[#cbd5e1] rounded-md overflow-hidden shadow-sm flex flex-col min-h-0 flex-1 relative">

        {/* Responsive Table Scroll container */}
        <div id="skyjet-transactions-scroll-container" className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="skyjet-erp-table w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="text-center w-10">STT</th>
                <th>Ngày hạch toán</th>
                <th>Hãng</th>
                <th>Kênh</th>
                <th className="text-center">Loại vé</th>
                <th>Mã đơn hàng</th>
                <th>Số vé</th>
                <th className="text-center">Hạng vé</th>
                <th>Hành trình</th>
                <th>Thời gian bay</th>
                <th>Tên khách</th>
                <th className="text-right">Giá vé</th>
                <th className="text-right">Giá bán</th>
                <th className="text-right">Chiết khấu</th>
                <th className="text-right">Nợ</th>
                <th className="text-right">Có</th>
                <th className="text-right">Lũy kế</th>
                <th className="text-center">PT</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={18} className="p-12 text-center text-zinc-500 font-medium">
                    <div className="flex flex-col items-center justify-center space-y-3 py-6">
                      <div className="p-4 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-400">
                        <Upload className="w-8 h-8 text-amber-500/80 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-800 text-sm font-extrabold block">Bảng công nợ chưa có dữ liệu</span>
                        <p className="text-zinc-500 text-xs max-w-md mx-auto leading-relaxed">
                          Dữ liệu công nợ sẽ tự động được lấy và điền từ trang tìm kiếm giao dịch của ERP.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => {
                  const isTicket = tx.ticketType && tx.ticketType.trim().toLowerCase() === 'vé';
                  const isRefund = tx.ticketType === 'Hoàn';
                  const isExchange = tx.ticketType === 'Đổi';

                  // Parse segments
                  const segs: { class: string; route: string; time: string }[] = [];
                  const journeyStr = (tx.journey || '').trim();
                  const bookingClassStr = tx.bookingClass || '';
                  const flightTimeStr = tx.flightTime || '';

                  if (journeyStr) {
                    let routeSegments: string[] = [];
                    
                    // Kiểm tra xem chuỗi có chứa ký tự phân tách thông thường không (, hoặc -)
                    if (journeyStr.includes(',') || journeyStr.includes('-')) {
                      if (journeyStr.includes(',')) {
                        routeSegments = journeyStr.split(',').map(s => s.trim());
                      } else {
                        const airports = journeyStr.split('-').map(s => s.trim());
                        for (let i = 0; i < airports.length - 1; i++) {
                          routeSegments.push(`${airports[i]}-${airports[i+1]}`);
                        }
                      }
                    } else {
                      // Xử lý dạng chuỗi liên tục e.g. "SGNVJHUISGN" hoặc "SGNVJHUISGNVJHUI"
                      // Tìm tất cả các mã sân bay 3 chữ cái viết hoa liên tiếp
                      const airportMatches = journeyStr.toUpperCase().match(/[A-Z]{3}/g);
                      if (airportMatches && airportMatches.length >= 2) {
                        for (let i = 0; i < airportMatches.length - 1; i++) {
                          routeSegments.push(`${airportMatches[i]}-${airportMatches[i+1]}`);
                        }
                      } else {
                        routeSegments.push(journeyStr);
                      }
                    }

                    const classes = bookingClassStr ? bookingClassStr.split(/[, \-|]+/).map(c => c.trim()) : [];
                    const times = flightTimeStr ? flightTimeStr.split(/[,|]+/).map(t => t.trim()) : [];

                    for (let i = 0; i < routeSegments.length; i++) {
                      segs.push({
                        class: classes[i] || classes[0] || '',
                        route: routeSegments[i],
                        time: times[i] || ''
                      });
                    }
                  } else {
                    segs.push({
                      class: bookingClassStr,
                      route: '',
                      time: flightTimeStr
                    });
                  }

                  return (
                    <tr 
                      key={idx} 
                      className={`align-middle ${
                        isRefund ? 'bg-rose-refund' : isExchange ? 'bg-amber-exchange' : ''
                      }`}
                    >
                      {/* 1. STT */}
                      <td className="text-center font-mono">{tx.stt}</td>

                      {/* 2. Ngày hạch toán */}
                      <td className="text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="font-mono">{tx.bookingDate}</span>
                          {!isAgent && (!tx.orderCode || !tx.orderCode.trim()) ? (
                            <div className="relative w-[100px] flex items-center justify-center">
                              <input
                                type="text"
                                value={tx.appliedDate || tx.bookingDate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updatedTxs = transactions.map((t, mapIdx) => {
                                    if (mapIdx === idx) {
                                      return { ...t, appliedDate: val || undefined };
                                    }
                                    return t;
                                  });
                                  const computed = recalculateBalancesAndDiscounts(updatedTxs, startingBalance);
                                  setTransactions(computed);
                                }}
                                placeholder="dd/MM/yyyy"
                                className="bg-white border border-zinc-300 rounded pl-1 pr-6 py-0.5 text-[10px] font-mono focus:outline-none focus:border-amber-500 text-center w-full"
                              />
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center overflow-hidden cursor-pointer">
                                <input
                                  type="date"
                                  value={convertDMYtoYMD(tx.appliedDate || tx.bookingDate)}
                                  onChange={(e) => {
                                    const ymd = e.target.value;
                                    const dmy = convertYMDtoDMY(ymd);
                                    const updatedTxs = transactions.map((t, mapIdx) => {
                                      if (mapIdx === idx) {
                                        return { ...t, appliedDate: dmy || undefined };
                                      }
                                      return t;
                                    });
                                    const computed = recalculateBalancesAndDiscounts(updatedTxs, startingBalance);
                                    setTransactions(computed);
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-[2] origin-center"
                                />
                                <Calendar className="w-3 h-3 text-zinc-400 pointer-events-none" />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* 3. Hãng */}
                      <td className="font-semibold">
                        {tx.carrier.match(/^ACB|VCB|BIDV/i) ? (
                          <span className="text-[11px] font-mono text-zinc-500 block" title={tx.carrier}>
                            {tx.carrier}
                          </span>
                        ) : (
                          <span className="font-bold">
                            {tx.carrier}
                          </span>
                        )}
                      </td>

                      {/* 4. Kênh */}
                      <td className="text-center">
                        {tx.orderCode && tx.orderCode.trim() ? (
                          <button
                            onClick={() => {
                              const val = tx.channel === 'FLIGHTVN' ? 'PARTNER' : 'FLIGHTVN';
                              const updatedTxs = transactions.map(t => t.stt === tx.stt ? { ...t, channel: val } : t);
                              const computed = recalculateBalancesAndDiscounts(updatedTxs, startingBalance);
                              setTransactions(computed);
                            }}
                            className={`px-1.5 py-0 rounded text-[9px] font-bold transition-all duration-150 cursor-pointer border select-none inline-flex items-center gap-1 shadow-sm active:scale-95 ${
                              tx.channel === 'FLIGHTVN'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                            }`}
                            title="Nhấp để chuyển đổi giữa PARTNER và FLIGHTVN"
                          >
                            <span className={`w-1 h-1 rounded-full ${tx.channel === 'FLIGHTVN' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                            {(() => {
                              const chan = (tx.channel || 'PARTNER').trim().toUpperCase();
                              if (chan === 'PARTNER') return 'PAR';
                              if (chan === 'FLIGHTVN') return 'FLI';
                              return chan;
                            })()}
                          </button>
                        ) : (
                          <span className="text-zinc-400 font-mono">-</span>
                        )}
                      </td>

                      {/* 5. Loại vé */}
                      <td className="text-center">
                        {tx.ticketType ? (
                          <span className={`px-1 py-0 rounded text-[10px] font-bold ${
                            tx.ticketType === 'Vé' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : tx.ticketType === 'Vé*' 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : tx.ticketType === 'Hoàn'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : tx.ticketType === 'Void'
                              ? 'bg-amber-400 text-zinc-950 font-extrabold border border-amber-500/30'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {tx.ticketType}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* 6. Mã đơn hàng */}
                      <td className="font-mono font-medium">{tx.orderCode || <span className="text-zinc-400 font-mono">-</span>}</td>

                      {/* 7. Số vé */}
                      <td className="font-mono text-zinc-600" title={tx.ticketNumber}>{tx.ticketNumber || <span className="text-zinc-400">—</span>}</td>

                      {/* 8. Hạng vé */}
                      <td className="text-center font-mono font-black text-amber-600">
                        <div className={`flex flex-col justify-center ${segs.length > 1 ? 'skyjet-segment-group' : ''}`}>
                          {segs.map((s, sIdx) => (
                            <React.Fragment key={sIdx}>
                              {sIdx > 0 && <div className="border-t border-dashed border-zinc-200 my-0.5 w-full" />}
                              <span className="block leading-tight py-0.5">
                                {s.class || <span className="text-zinc-450">—</span>}
                              </span>
                            </React.Fragment>
                          ))}
                        </div>
                      </td>

                      {/* 9. Hành trình */}
                      <td className="font-mono font-bold">
                        <div className={`flex flex-col ${segs.length > 1 ? 'skyjet-segment-group' : ''}`}>
                          {segs.map((s, sIdx) => (
                            <React.Fragment key={sIdx}>
                              {sIdx > 0 && <div className="border-t border-dashed border-zinc-200 my-0.5 w-full" />}
                              <span className="block leading-tight py-0.5">
                                {s.route || <span className="text-zinc-450">—</span>}
                              </span>
                            </React.Fragment>
                          ))}
                        </div>
                      </td>

                      {/* 10. Thời gian bay */}
                      <td className="font-mono text-[10px] text-zinc-500" title={tx.flightTime}>
                        <div className={`flex flex-col ${segs.length > 1 ? 'skyjet-segment-group' : ''}`}>
                          {segs.map((s, sIdx) => (
                            <React.Fragment key={sIdx}>
                              {sIdx > 0 && <div className="border-t border-dashed border-zinc-200 my-0.5 w-full" />}
                              <span className="block leading-tight py-0.5">
                                {s.time || <span className="text-zinc-450">—</span>}
                              </span>
                            </React.Fragment>
                          ))}
                        </div>
                      </td>

                      {/* 11. Tên khách */}
                      <td className="font-medium skyjet-col-passenger" title={tx.passengerName}>
                        {tx.passengerName || <span className="text-zinc-400">—</span>}
                      </td>

                      {/* 12. Giá vé */}
                      <td className="text-right font-mono font-medium">
                        <input
                          type="text"
                          value={tx.fare === 0 ? '0' : tx.fare.toLocaleString()}
                          disabled={isAgent}
                          onChange={(e) => {
                            const rawVal = e.target.value.replace(/\D/g, '');
                            const numericVal = rawVal ? parseInt(rawVal, 10) : 0;
                            handleUpdateFare(tx.stt, numericVal);
                          }}
                          className={`w-24 border rounded px-1 py-0.5 text-right font-mono text-[11px] focus:outline-none transition-colors ${
                            isAgent 
                              ? 'bg-zinc-100/70 border-zinc-200/50 text-zinc-500 cursor-not-allowed select-none' 
                              : 'bg-white hover:bg-zinc-50 border-zinc-300 focus:border-amber-500 text-zinc-800'
                          }`}
                          title={isAgent ? "Không được phép thay đổi giá vé trên trang Agent" : "Nhập để thay đổi giá vé"}
                        />
                      </td>

                      {/* 13. Giá bán */}
                      <td className="text-right font-mono font-medium">
                        {tx.sellingPrice > 0 ? tx.sellingPrice.toLocaleString() : '0'}
                      </td>

                      {/* 14. Chiết khấu */}
                      <td className="text-right font-mono min-w-[155px]">
                        <div className="flex flex-col items-end justify-center gap-1 w-full">
                          <div className="flex items-center gap-1.5 justify-end w-full">
                            <input
                              type="text"
                              value={tx.originalDiscount === 0 ? '0' : tx.originalDiscount.toLocaleString()}
                              disabled={isAgent}
                              onChange={(e) => {
                                const rawVal = e.target.value.replace(/\D/g, '');
                                const numericVal = rawVal ? parseInt(rawVal, 10) : 0;
                                handleUpdateOriginalDiscount(tx.stt, numericVal);
                              }}
                              className={`w-24 border rounded px-1 py-0.5 text-right font-mono text-[11px] focus:outline-none transition-colors ${
                                isAgent 
                                  ? 'bg-zinc-100/70 border-zinc-200/50 text-zinc-500 cursor-not-allowed select-none' 
                                  : 'bg-white hover:bg-zinc-50 border-zinc-300 focus:border-amber-500 text-amber-600'
                              }`}
                              title={isAgent ? "Không được phép thay đổi chiết khấu trên trang Agent" : "Nhập để thay đổi chiết khấu gốc từ ảnh hoặc hệ thống cũ"}
                            />
                          </div>
                          {isTicket && (tx.discount !== tx.originalDiscount || tx.useOriginalDiscount) && (
                            <div className="flex items-center justify-end gap-1.5 w-full text-[10px]">
                              {isTicket && tx.orderCode && tx.orderCode.trim() && (
                                <button
                                  disabled={isAgent}
                                  onClick={() => handleToggleUseOriginalDiscount(tx.stt)}
                                  className={`px-1 py-0 rounded text-[9px] font-bold uppercase transition-all flex items-center gap-0.5 border select-none ${
                                    isAgent
                                      ? 'bg-zinc-100/50 text-zinc-400 border-zinc-200/50 cursor-not-allowed'
                                      : tx.useOriginalDiscount 
                                        ? 'cursor-pointer bg-amber-500/10 text-amber-600 border-amber-500/30 font-extrabold' 
                                        : 'cursor-pointer bg-zinc-50 text-zinc-500 border-zinc-200 hover:text-zinc-650 hover:border-zinc-350'
                                  }`}
                                  title={isAgent ? "Không thể chuyển chế độ chiết khấu trên trang Agent" : (tx.useOriginalDiscount ? "Đang sử dụng chiết khấu gốc. Bấm để tự động tính lại." : "Bấm để ép buộc lấy chiết khấu gốc")}
                                >
                                  <span className={`w-1 h-1 rounded-full ${tx.useOriginalDiscount && !isAgent ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                                  {tx.useOriginalDiscount ? "Gốc" : "Auto"}
                                </button>
                              )}
                              <span className={`font-black font-mono text-[11px] ${
                                tx.useOriginalDiscount 
                                  ? 'text-amber-600' 
                                  : tx.discount > tx.originalDiscount 
                                    ? 'text-emerald-600 font-extrabold' 
                                    : 'text-rose-600 font-extrabold'
                              }`}>
                                {tx.discount !== 0 
                                  ? (tx.discount > 0 ? `+${tx.discount.toLocaleString()}` : tx.discount.toLocaleString()) 
                                  : '0'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 15. Nợ */}
                      <td className="text-right font-mono font-medium text-zinc-700">
                        {tx.debt > 0 ? tx.debt.toLocaleString() : '0'}
                      </td>

                      {/* 16. Có */}
                      <td className="text-right font-mono font-semibold text-emerald-600">
                        {tx.credit > 0 
                          ? `+${tx.credit.toLocaleString()}` 
                          : tx.debt < 0 
                            ? `+${Math.abs(tx.debt).toLocaleString()}` 
                            : '0'}
                      </td>

                      {/* 17. Lũy kế */}
                      <td className="text-right font-mono">
                        <div className="flex flex-col items-end justify-center">
                          {/* Lũy kế cũ */}
                          <span className={`font-medium text-[11px] ${
                            tx.originalBalance !== undefined && tx.balance !== tx.originalBalance
                              ? 'text-zinc-400 font-normal line-through text-[10px]'
                              : tx.balance >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
                          }`}>
                            {(tx.originalBalance !== undefined ? tx.originalBalance : tx.balance).toLocaleString()}
                          </span>
                          {/* Lũy kế mới (chỉ hiện khi khác lũy kế cũ) */}
                          {tx.originalBalance !== undefined && tx.balance !== tx.originalBalance && (
                            <span className={`text-[11px] font-black ${
                              tx.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`} title="Lũy kế mới tự động">
                              {tx.balance.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 18. Phân tích Button */}
                      <td className="text-center">
                        {isTicket && tx.orderCode && tx.orderCode.trim() ? (
                          <button
                            onClick={() => handleInspectRow(tx)}
                            className="p-0.5 hover:bg-zinc-150 rounded text-amber-600 hover:text-amber-500 transition-colors cursor-pointer flex items-center justify-center mx-auto"
                            title="Xem chi tiết phân tích tự động"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-zinc-455 cursor-not-allowed flex items-center justify-center mx-auto" title={!isTicket ? "Chỉ hỗ trợ giao dịch vé" : "Không có Mã Đơn Hàng"}>
                            <Info className="w-3.5 h-3.5 opacity-35" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="sticky bottom-0 z-10 text-[11px] font-bold">
              <tr>
                <td className="text-center font-bold font-mono">
                  {transactions.length}
                </td>
                <td colSpan={4}></td>
                <td className="font-mono font-bold text-left">
                  {Array.from(new Set(transactions.map(t => t.orderCode).filter(c => c && c.trim() !== ''))).length}
                </td>
                <td className="font-mono font-bold text-left">
                  {Array.from(new Set(transactions.filter(t => t.orderCode && t.orderCode.trim() !== '').map(t => t.ticketNumber).filter(n => n && n.trim() !== ''))).length}
                </td>
                <td colSpan={6}></td>
                <td className="text-right font-mono text-amber-600">
                  {totalDiscounts !== totalOriginalDiscounts ? (
                    <span className="inline-flex gap-1 items-center justify-end w-full">
                      <span className="text-zinc-400 line-through text-[9px] font-normal">+{totalOriginalDiscounts.toLocaleString()}</span>
                      <span className="text-rose-600 font-extrabold">+{totalDiscounts.toLocaleString()}</span>
                    </span>
                  ) : (
                    `+${totalDiscounts.toLocaleString()}`
                  )}
                </td>
                <td className="text-right font-mono text-zinc-700">
                  {totalSelling.toLocaleString()}
                </td>
                <td className="text-right font-mono text-emerald-600">
                  +{totalCredit.toLocaleString()}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>

      {/* HTML Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-4 py-2.5 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/10">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" />
                Import Dữ Liệu Công Nợ (Mã HTML)
              </h3>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportHtml} className="p-4 space-y-3">
              <p className="text-xs text-zinc-400">
                Nhập hoặc dán mã HTML chứa bảng dữ liệu công nợ hoặc khối <code className="text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded">x_panel</code>. Hệ thống sẽ tự động bóc tách thông tin đại lý (Tên phòng vé, Mã KH, Email, Số dư đầu kỳ) và danh sách giao dịch chi tiết (ngày chứng từ, hành trình, hạng đặt chỗ, giá bán, chiết khấu hiện tại).
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Mã HTML Công Nợ</label>
                <textarea
                  value={importHtmlText}
                  onChange={(e) => setImportHtmlText(e.target.value)}
                  placeholder={`Dán thẻ <div class="x_panel"> hoặc thẻ <table> tại đây...`}
                  required
                  rows={8}
                  className="block w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 font-mono resize-none focus:bg-zinc-900/80"
                />
              </div>

              <div className="pt-3 border-t border-zinc-900 flex items-center justify-end gap-2 bg-zinc-900/5">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold border border-zinc-850 hover:bg-zinc-900 text-zinc-400 rounded-xl cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 rounded-xl cursor-pointer transition-all shadow-md active:scale-95"
                >
                  Xử Lý & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Inspector drawer / modal */}
      {isInspectorOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop/Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
            onClick={() => setIsInspectorOpen(false)}
          />
          
          <div className="bg-zinc-950 w-full md:w-[1050px] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 relative border-l border-zinc-800/80">
            
            {/* Floating Close Button */}
            <button
              onClick={() => setIsInspectorOpen(false)}
              className="absolute top-3.5 right-3.5 z-10 p-1.5 bg-zinc-900/95 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-100 border border-zinc-800 rounded-full transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 flex items-center justify-center"
              title="Đóng bảng phân tích"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 pt-12 space-y-4">
              
              {/* Ticket mini summary card */}
              <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-zinc-800/40 pb-1.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Thông tin Vé</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 text-[9px] font-mono border border-zinc-800">
                    STT {selectedTx.stt}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[11px] font-medium">
                  <div>
                    <span className="text-zinc-500 block text-[9px]">HÃNG / KHÁCH</span>
                    <span className="text-zinc-200 font-bold">{selectedTx.carrier}</span> - <span className="text-zinc-400">{selectedTx.passengerName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px]">HÀNH TRÌNH / HẠNG</span>
                    <span className="text-zinc-200 font-mono font-bold text-amber-500">{selectedTx.journey} ({selectedTx.bookingClass})</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px]">NGÀY MUA / BAY</span>
                    <span className="text-zinc-200 font-mono">{selectedTx.bookingDate}</span> {selectedTx.flightTime && <span className="text-zinc-400 font-mono">/ {selectedTx.flightTime}</span>}
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px]">GIÁ VÉ / GIÁ BÁN</span>
                    <span className="text-emerald-400 font-mono font-bold">{selectedTx.fare.toLocaleString()}</span> / <span className="text-zinc-300 font-mono">{selectedTx.sellingPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-zinc-900 mt-2 mb-3">
                <button
                  onClick={() => setInspectorTab('info')}
                  className={`flex-1 py-2 text-center text-xs font-bold transition-all cursor-pointer ${
                    inspectorTab === 'info'
                      ? 'text-amber-500 border-b-2 border-amber-500 bg-amber-500/5'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
                  }`}
                >
                  1. Thông tin chiết khấu
                </button>
                <button
                  onClick={() => setInspectorTab('log')}
                  className={`flex-1 py-2 text-center text-xs font-bold transition-all cursor-pointer ${
                    inspectorTab === 'log'
                      ? 'text-amber-500 border-b-2 border-amber-500 bg-amber-500/5'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
                  }`}
                >
                  2. Nhật ký đối soát
                </button>
              </div>

              {/* MAIN VERDICT / EXPLANATION CARD */}
              {inspectorTab === 'info' && inspectorResult.hasChecked && (
                <div className={`border rounded-lg p-3.5 space-y-3.5 ${
                  inspectorResult.simulatedDiscount > 0 
                    ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                    : 'bg-rose-50 border-rose-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                        inspectorResult.simulatedDiscount > 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {inspectorResult.simulatedDiscount > 0 ? '✓ ĐỦ ĐIỀU KIỆN' : '✗ KHÔNG CHIẾT KHẤU'}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-500">Kết quả:</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono text-base font-black ${
                        inspectorResult.simulatedDiscount > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {inspectorResult.simulatedDiscount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Hide the primary reason card if there is a discount or if we have detailed applied campaigns (per user request) */}
                  {inspectorResult.primaryReason && 
                   inspectorResult.simulatedDiscount === 0 && 
                   (!inspectorResult.appliedCampaigns || inspectorResult.appliedCampaigns.length === 0) && (
                    <div className="text-[11px] p-2.5 rounded border leading-relaxed font-semibold bg-white border-rose-200 text-rose-900 shadow-sm">
                      {inspectorResult.primaryReason}
                    </div>
                  )}

                  {((inspectorResult.appliedCampaigns && inspectorResult.appliedCampaigns.length > 0) || (inspectorResult.skippedSegments && inspectorResult.skippedSegments.length > 0)) ? (
                    <div className="bg-zinc-900/30 rounded border border-zinc-900 p-2.5 space-y-2.5">
                      <div className="border-b border-zinc-900 pb-1.5 flex justify-between items-center">
                        <span className="text-[9px] uppercase font-bold text-amber-500 tracking-wider">
                          Chi tiết các chính sách áp dụng:
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400">
                          Áp dụng: {inspectorResult.appliedCampaigns?.length || 0} | Bỏ qua: {inspectorResult.skippedSegments?.length || 0}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inspectorResult.appliedCampaigns && inspectorResult.appliedCampaigns.map((camp, idx) => {
                          const isPenalized = camp.multiplier !== undefined && camp.multiplier < 1.0;
                          return (
                            <div key={`camp-${idx}`} className="bg-zinc-950/40 p-2.5 rounded border border-zinc-800/30 text-[11px] space-y-1.5 flex flex-col h-full">
                              <div className="flex justify-between items-start">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-zinc-200 block">Chính sách {idx + 1}: {camp.campaignName}</span>
                                  <span className="text-zinc-500 text-[10px]">{camp.description}</span>
                                </div>
                                <div className="text-right">
                                  {isPenalized ? (
                                    <div className="flex flex-col items-end">
                                      <span className="font-mono font-bold text-rose-400">+{camp.finalAmount.toLocaleString()}</span>
                                      <span className="font-mono text-[9px] text-zinc-500 line-through">+{camp.amount.toLocaleString()}</span>
                                    </div>
                                  ) : (
                                    <span className="font-mono font-bold text-emerald-400">+{camp.amount.toLocaleString()}</span>
                                  )}
                                </div>
                              </div>

                              {/* Render the detail matrix configuration */}
                              {(() => {
                                const campDetails = details.filter(d => Number(d.campaign_id) === Number(camp.campaignId));
                                if (campDetails.length === 0) return null;

                                const columnOrder = [
                                  'Âu, Úc, Mỹ',
                                  'Đông Bắc Á, Nam Á và Trung Đông - Châu Phi',
                                  'Đông Nam Á và Đông Dương'
                                ];
                                const uniqueTagsGrouped = Array.from(
                                  new Set((campDetails.flatMap(d => d.groups_tag || []) as string[]).map(mapTagToGroupCol))
                                ).filter(Boolean).sort((a, b) => {
                                  const idxA = columnOrder.indexOf(a);
                                  const idxB = columnOrder.indexOf(b);
                                  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                                  if (idxA !== -1) return -1;
                                  if (idxB !== -1) return 1;
                                  return a.localeCompare(b);
                                });
                                const cols = uniqueTagsGrouped.length > 0 ? uniqueTagsGrouped : ['Mặc định'];

                                const getRowMaxVal = (rowKey: string): number => {
                                  const rowDetails = campDetails.filter(d => {
                                    const dKey = !d.booking_class || d.booking_class.length === 0 ? 'Tất cả' : [...d.booking_class].sort().join('/');
                                    return dKey === rowKey;
                                  });
                                  let maxVal = 0;
                                  rowDetails.forEach(d => {
                                    if (d.amount !== null && d.amount !== undefined) {
                                      if (d.amount > maxVal) maxVal = d.amount;
                                    } else if (d.discount_percentage !== undefined && d.discount_percentage !== null) {
                                      if (d.discount_percentage > maxVal) maxVal = d.discount_percentage;
                                    }
                                  });
                                  return maxVal;
                                };

                                const uniqueRows = Array.from(
                                  new Set(
                                    campDetails.map(d => {
                                      if (!d.booking_class || d.booking_class.length === 0) return 'Tất cả';
                                      return [...d.booking_class].sort().join('/');
                                    })
                                  )
                                ).sort((a, b) => {
                                  const valA = getRowMaxVal(a as string);
                                  const valB = getRowMaxVal(b as string);
                                  if (valA !== valB) return valB - valA;
                                  if (a === 'Tất cả') return 1;
                                  if (b === 'Tất cả') return -1;
                                  return (a as string).localeCompare(b as string);
                                }) as string[];

                                return (
                                  <div className="mt-2.5 overflow-x-auto rounded border border-zinc-800 bg-zinc-950/40 text-[9px] shadow-inner flex-grow flex flex-col">
                                    <div className="bg-zinc-900/50 border-b border-zinc-850 px-2 py-1 text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                                      Bản đồ ma trận chiết khấu chiến dịch:
                                    </div>
                                    <table className="w-full border-collapse text-center table-fixed flex-grow h-full">
                                      <thead>
                                        <tr className="bg-zinc-950 border-b border-zinc-800 text-[8px] font-semibold text-zinc-400 uppercase">
                                          <th className="py-1 px-1 border-r border-zinc-850 text-center w-24">Hạng</th>
                                          {cols.map((col, cIdx) => (
                                            <th key={cIdx} className="py-1 px-1 border-r border-zinc-850 text-center font-bold text-amber-500/80">
                                              {col}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {uniqueRows.map((rowKey, rIdx) => (
                                          <tr key={rIdx} className="border-b border-zinc-900 last:border-b-0">
                                            <td className="py-1 px-1 border-r border-zinc-850 bg-zinc-950/80 text-zinc-400 font-bold text-center break-all whitespace-normal">
                                              {rowKey}
                                            </td>
                                            {cols.map((colTag, cIdx) => {
                                              const cellDetails = campDetails.filter(d => {
                                                const dKey = !d.booking_class || d.booking_class.length === 0 ? 'Tất cả' : [...d.booking_class].sort().join('/');
                                                const matchesRow = dKey === rowKey;
                                                if (uniqueTagsGrouped.length === 0) return matchesRow;
                                                const matchesCol = (d.groups_tag || []).some(t => mapTagToGroupCol(t) === colTag);
                                                return matchesRow && matchesCol;
                                              });

                                              const isMatchedCell = cellDetails.some(d => d.id === camp.matchedDetailId);
                                              const hasData = cellDetails.length > 0;

                                              if (hasData) {
                                                const detail = cellDetails[0];
                                                const amountStr = detail.amount !== null && detail.amount !== undefined ? `${detail.amount.toLocaleString()}` : '';
                                                const pctStr = detail.discount_percentage !== undefined && detail.discount_percentage !== 0 ? `${detail.discount_percentage}%` : '';
                                                const displayVal = amountStr || pctStr;

                                                return (
                                                  <td key={cIdx} className={`py-1 px-1 border-r border-zinc-850 text-center font-mono ${
                                                    isMatchedCell 
                                                      ? 'bg-emerald-500/20 text-emerald-400 font-extrabold ring-1 ring-emerald-500/40' 
                                                      : 'text-zinc-400'
                                                  }`}>
                                                    {displayVal}
                                                    {pctStr && (
                                                      <span className="text-[7px] text-zinc-500 font-sans block leading-none mt-0.5">
                                                        ({detail.discount_base})
                                                      </span>
                                                    )}
                                                  </td>
                                                );
                                              } else {
                                                return (
                                                  <td key={cIdx} className="py-1 px-1 border-r border-zinc-850 text-center text-zinc-650">
                                                    —
                                                  </td>
                                                );
                                              }
                                            })}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })()}

                              {isPenalized && camp.thresholdReason && (
                                <div className="bg-white border border-rose-200 rounded-lg p-2.5 text-[11px] leading-relaxed font-semibold text-rose-900 shadow-sm">
                                  ✗ Không nhận được chiết khấu này: {camp.thresholdReason}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {inspectorResult.skippedSegments && inspectorResult.skippedSegments.map((seg, idx) => (
                          <div key={`seg-${idx}`} className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-2.5 text-zinc-900 shadow-sm flex flex-col h-full">
                            <div className="flex justify-between items-center text-[11px]">
                              <div className="flex items-center space-x-1.5">
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                  ✗ KHÔNG CHIẾT KHẤU
                                </span>
                                <span className="text-[10px] font-semibold text-zinc-500 text-left">
                                  {seg.segmentDirection} ({seg.segmentFromTo}) - Hạng {seg.segmentClass}:
                                </span>
                              </div>
                              <span className="font-mono text-base font-black text-rose-700">0</span>
                            </div>

                            <hr className="border-t border-rose-200/60" />

                            <div className="bg-white border border-rose-200 rounded-lg p-2.5 text-[11px] leading-relaxed font-semibold text-rose-900 shadow-sm space-y-1">
                              <div className="text-left">{seg.reason}</div>
                              {seg.campaignName && (
                                <div className="text-zinc-450 text-[9px] font-normal italic mt-1 text-left">
                                  (Đối soát theo chiến dịch: {seg.campaignName})
                                </div>
                              )}
                            </div>

                            {/* Bảng đối chiếu quy định chiến dịch */}
                            {(() => {
                              const campRules = details.filter(d => d.campaign_id === seg.campaignId);
                              if (campRules.length === 0) return null;
                              return (
                                <div className="mt-2.5 border border-rose-200 rounded-lg overflow-hidden bg-white shadow-xs flex-grow flex flex-col">
                                  <div className="bg-rose-100/50 px-2.5 py-1.5 text-[9px] font-bold text-rose-950 uppercase border-b border-rose-200 text-left">
                                    Bảng quy định chiết khấu của chiến dịch:
                                  </div>
                                  <table className="w-full text-[10px] text-left border-collapse flex-grow h-full">
                                    <thead>
                                      <tr className="bg-rose-50 border-b border-rose-100 text-rose-800 font-bold">
                                        <th className="px-2.5 py-1.5">Vùng bay (Nhãn)</th>
                                        <th className="px-2.5 py-1.5 text-center">Hạng đặt chỗ</th>
                                        <th className="px-2.5 py-1.5 text-right">Chiết khấu</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-rose-100/60 text-zinc-700">
                                      {campRules.map((rule) => {
                                        let discountStr = '';
                                        if (rule.discount_percentage > 0) {
                                          discountStr = `${rule.discount_percentage}% ${rule.discount_base === 'FARE' ? 'Fare' : 'Bán'}`;
                                        } else if (rule.amount) {
                                          discountStr = `${rule.amount.toLocaleString()}đ`;
                                        } else {
                                          discountStr = '0đ';
                                        }
                                        
                                        const classesStr = rule.booking_class && rule.booking_class.length > 0
                                          ? rule.booking_class.map(c => c.toUpperCase()).join(', ')
                                          : 'Tất cả';
                                        
                                        const groupsStr = rule.groups_tag && rule.groups_tag.length > 0
                                          ? rule.groups_tag.map(t => t.toUpperCase()).join(' ↔ ')
                                          : 'Tất cả';
                                        
                                        const isClassMatch = rule.booking_class && rule.booking_class.some(c => c.toUpperCase() === seg.segmentClass.toUpperCase());
                                        const rowBg = isClassMatch ? 'bg-amber-50/75 font-semibold' : '';

                                        return (
                                          <tr key={rule.id} className={`${rowBg} hover:bg-rose-50/40 transition-colors`}>
                                            <td className="px-2.5 py-2 text-zinc-800">{groupsStr}</td>
                                            <td className="px-2.5 py-2 text-center font-mono font-bold text-rose-700">{classesStr}</td>
                                            <td className="px-2.5 py-2 text-right font-mono font-bold text-emerald-600">{discountStr}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    null
                  )}

                  {/* Quick comparison checklist if applicable */}
                  {inspectorResult.cumulativeDiscount > 0 && (
                    <div className="bg-zinc-900/30 rounded border border-zinc-900 p-2.5 text-[10px] space-y-1.5">
                      <div className="flex justify-between items-center text-zinc-400 border-b border-zinc-900 pb-1 mb-1">
                        <span className="font-bold text-[9px] uppercase tracking-wider text-zinc-500">Các chỉ số chiết khấu gốc</span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 gap-x-3">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Chiết khấu ban đầu:</span>
                          <span className="font-mono font-bold text-zinc-300">+{inspectorResult.cumulativeDiscount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Hệ số nhân ngưỡng:</span>
                          <span className={`font-mono font-bold ${inspectorResult.multiplier === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {inspectorResult.multiplier * 100}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Lũy kế trước giao dịch:</span>
                          <span className="font-mono text-zinc-300">{(selectedTx.balanceBefore !== undefined ? selectedTx.balanceBefore : startingBalance).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Số dư ước tính sau mua:</span>
                          <span className={`font-mono font-bold ${(selectedTx.balanceBefore !== undefined ? selectedTx.balanceBefore : startingBalance) - selectedTx.sellingPrice < 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                            {((selectedTx.balanceBefore !== undefined ? selectedTx.balanceBefore : startingBalance) - selectedTx.sellingPrice).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DETAILED CALCULATION LOGS PER SEGMENT */}
              {inspectorTab === 'log' && debugLog && debugLog.length > 0 && (
                <div className="bg-zinc-900/30 rounded border border-zinc-900 p-2.5 space-y-2">
                  <div className="border-b border-zinc-900 pb-1.5 flex justify-between items-center">
                    <span className="text-[9px] uppercase font-bold text-amber-500 tracking-wider">
                      Nhật ký đối soát chi tiết:
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">Số bước: {debugLog.length}</span>
                  </div>
                  <div className="space-y-1.5 pr-1">
                    {debugLog.map((log, idx) => {
                      let badgeColor = 'bg-zinc-800 text-zinc-400';
                      let statusText = 'THÔNG TIN';
                      if (log.status === 'success') {
                        badgeColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                        statusText = 'THÀNH CÔNG';
                      } else if (log.status === 'skipped') {
                        badgeColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                        statusText = 'BỎ QUA';
                      } else if (log.status === 'error') {
                        badgeColor = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                        statusText = 'LỖI';
                      }

                      return (
                        <div key={idx} className="bg-zinc-950/40 p-2 rounded border border-zinc-900 text-[10px] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-zinc-300">{log.title}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${badgeColor}`}>
                              {statusText}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-zinc-500 leading-relaxed font-mono text-[9px] whitespace-pre-wrap">{log.details}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
