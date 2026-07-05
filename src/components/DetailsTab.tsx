import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CampaignDetail, Campaign } from '../types';
import { RelationSelector } from './RelationSelector';
import { TagInput } from './TagInput';
import { TagDropdown } from './TagDropdown';
import { CustomSelect } from './CustomSelect';
import { 
  Search, Plus, Edit2, Trash2, AlertCircle, 
  X, Check, ArrowUpDown, RefreshCw, Layers, Percent, Tag,
  ChevronDown, ChevronRight, List, LayoutGrid
} from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

const parseBulkTags = (
  input: string,
  airportIatas: string[],
  airportTags: string[]
): { validTags: string[]; errors: string[] } => {
  // Split by newlines, commas, or semicolons
  const parts = input.split(/[\n,;]+/).map(p => p.trim()).filter(Boolean);
  const validTags: string[] = [];
  const errors: string[] = [];
  
  // Build lowercase lookup maps for validation and exact casing recovery
  const iataLookup: Record<string, string> = {};
  airportIatas.forEach(iata => {
    iataLookup[iata.toLowerCase()] = iata;
  });

  const tagLookup: Record<string, string> = {};
  airportTags.forEach(tag => {
    tagLookup[tag.toLowerCase()] = tag;
  });

  const findCanonicalName = (token: string): string | null => {
    const lower = token.toLowerCase();
    if (iataLookup[lower]) return iataLookup[lower];
    if (tagLookup[lower]) return tagLookup[lower];
    return null;
  };

  parts.forEach(part => {
    let aRaw = '';
    let bRaw = '';
    let operator = '';

    // Detect operator
    if (part.includes('<->') || part.includes('<=>')) {
      const splitPart = part.split(/<->|<=>/);
      if (splitPart.length === 2) {
        aRaw = splitPart[0].trim();
        bRaw = splitPart[1].trim();
        operator = '<->';
      }
    } else if (part.includes('->') || part.includes('=>')) {
      const splitPart = part.split(/->|=>/);
      if (splitPart.length === 2) {
        aRaw = splitPart[0].trim();
        bRaw = splitPart[1].trim();
        operator = '->';
      }
    } else if (part.includes('-')) {
      const splitPart = part.split('-');
      if (splitPart.length === 2) {
        aRaw = splitPart[0].trim();
        bRaw = splitPart[1].trim();
        operator = '->'; // Default to 1-way arrow for hyphen
      }
    }

    if (!operator) {
      errors.push(`Dòng "${part}" sai định dạng. Cần dùng ký tự -> hoặc <-> để phân cách.`);
      return;
    }

    const aCanonical = findCanonicalName(aRaw);
    const bCanonical = findCanonicalName(bRaw);

    if (!aCanonical && !bCanonical) {
      errors.push(`Từ khóa "${aRaw}" và "${bRaw}" không tồn tại trong danh sách Sân bay / Thẻ`);
    } else if (!aCanonical) {
      errors.push(`Từ khóa "${aRaw}" không tồn tại trong danh sách Sân bay / Thẻ`);
    } else if (!bCanonical) {
      errors.push(`Từ khóa "${bRaw}" không tồn tại trong danh sách Sân bay / Thẻ`);
    } else {
      validTags.push(`${aCanonical} ${operator} ${bCanonical}`);
    }
  });

  return { validTags, errors };
};

const mapTagToGroupCol = (tag: string): string => {
  if (!tag) return '';
  const normalized = tag.toLowerCase()
    .replace(/<->/g, '↔')
    .replace(/->/g, '→')
    .replace(/<=>/g, '↔')
    .replace(/=>/g, '→')
    .trim();

  // "Việt Nam <-> Bắc Mỹ", "Việt Nam <-> Châu Âu", "Việt Nam <-> Châu Đại Dương" are grouped under "Âu, Úc, Mỹ"
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

  // "Đông Bắc Á, Nam Á và Trung Đông - Châu Phi"
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

  // "Đông Nam Á và Đông Dương"
  if (
    normalized.includes('đông nam á') ||
    normalized.includes('đông dương') ||
    normalized.includes('southeast asia') ||
    normalized.includes('indochina')
  ) {
    return 'Đông Nam Á và Đông Dương';
  }

  // Fallback to formatting
  if (tag.includes(' ↔ ')) {
    return tag.split(' ↔ ')[1];
  }
  if (tag.includes(' → ')) {
    return tag.split(' → ')[1];
  }
  return tag;
};

export function DetailsTab({ hideExpired }: { hideExpired?: boolean }) {
  const [details, setDetails] = useState<CampaignDetail[]>([]);
  const [campaignsMap, setCampaignsMap] = useState<Record<number, Campaign>>({});
  
  const hideExpiredCampaigns = hideExpired !== undefined ? hideExpired : true;

  const isCampaignExpired = (validTo: string | null | undefined) => {
    if (!validTo) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validToDate = new Date(validTo);
    validToDate.setHours(0, 0, 0, 0);
    return validToDate < today;
  };
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete Confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);

  // Sort state
  const [sortField, setSortField] = useState<keyof CampaignDetail>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [autoGenerateId, setAutoGenerateId] = useState<boolean>(true);

  const [formId, setFormId] = useState<string>('');
  const [formCampaignId, setFormCampaignId] = useState<number | ''>('');
  const [formBookingClass, setFormBookingClass] = useState<string[]>([]);
  const [formDiscountBase, setFormDiscountBase] = useState<'FARE' | 'NET'>('FARE');
  const [formDiscountPercentage, setFormDiscountPercentage] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [formIndex, setFormIndex] = useState<string>('1');
  const [formGroupsTag, setFormGroupsTag] = useState<string[]>([]);
  const [formGroupTag1, setFormGroupTag1] = useState<string>('');
  const [formGroupTag2, setFormGroupTag2] = useState<string>('');
  const [airportTags, setAirportTags] = useState<string[]>([]);
  const [airportIatas, setAirportIatas] = useState<string[]>([]);
  const [tagCreatorMode, setTagCreatorMode] = useState<'select' | 'bulk'>('select');
  const [bulkTagsInput, setBulkTagsInput] = useState<string>('');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<number, boolean>>({});
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('matrix');

  // Matrix creation states
  const [modalInputMode, setModalInputMode] = useState<'standard' | 'matrix'>('standard');
  const [matrixRows, setMatrixRows] = useState<number>(3);
  const [matrixCols, setMatrixCols] = useState<number>(4);
  const [matrixGrid, setMatrixGrid] = useState<string[][]>([
    ['Hạng chỗ', '', '', ''],
    ['', '', '', ''],
    ['', '', '', '']
  ]);
  const [activeHeaderEditCol, setActiveHeaderEditCol] = useState<number | null>(null);
  const [matrixTagA, setMatrixTagA] = useState<string>('');
  const [matrixTagB, setMatrixTagB] = useState<string>('');
  const [matrixOperator, setMatrixOperator] = useState<string>('<->');
  const [matrixActiveTags, setMatrixActiveTags] = useState<string[]>([]);
  const [matrixColIndices, setMatrixColIndices] = useState<{[key: number]: string}>({});

  const handleMatrixSizeChange = (rows: number, cols: number) => {
    const safeRows = Math.max(2, rows);
    const safeCols = Math.max(2, cols);
    setMatrixRows(safeRows);
    setMatrixCols(safeCols);
    
    setMatrixGrid(prev => {
      const newGrid: string[][] = [];
      for (let r = 0; r < safeRows; r++) {
        const row: string[] = [];
        for (let c = 0; c < safeCols; c++) {
          if (r === 0 && c === 0) {
            row.push(prev[r]?.[c] || 'Hạng chỗ');
          } else {
            row.push(prev[r]?.[c] || '');
          }
        }
        newGrid.push(row);
      }
      return newGrid;
    });

    setMatrixColIndices(prev => {
      const newIndices = { ...prev };
      for (let c = 1; c < safeCols; c++) {
        if (newIndices[c] === undefined) {
          newIndices[c] = '1';
        }
      }
      return newIndices;
    });
  };

  // Column tags editing states
  const [isColModalOpen, setIsColModalOpen] = useState<boolean>(false);
  const [colEditName, setColEditName] = useState<string>('');
  const [colEditGroupDetails, setColEditGroupDetails] = useState<CampaignDetail[]>([]);
  const [colEditTags, setColEditTags] = useState<string[]>([]);
  const [colEditTag1, setColEditTag1] = useState<string>('');
  const [colEditTag2, setColEditTag2] = useState<string>('');
  const [colEditBulkInput, setColEditBulkInput] = useState<string>('');
  const [colEditTagCreatorMode, setColEditTagCreatorMode] = useState<'select' | 'bulk'>('select');

  const toggleCampaign = (campaignId: number) => {
    setExpandedCampaigns(prev => ({
      ...prev,
      [campaignId]: prev[campaignId] === false ? true : false
    }));
  };

  // Status message state
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAirportTags = async () => {
    try {
      const { data, error: err } = await supabase.from('airports').select('tags, iata');
      if (err) {
        console.error('Error fetching airport tags:', err);
        return;
      }
      if (data) {
        const iatas = new Set<string>();
        const normalTags = new Set<string>();
        
        data.forEach((row: any) => {
          if (row.iata && typeof row.iata === 'string') {
            const cleanIata = row.iata.trim().toUpperCase();
            if (cleanIata) {
              iatas.add(cleanIata);
            }
          }
          if (row.tags && Array.isArray(row.tags)) {
            row.tags.forEach((tag: string) => {
              if (tag && tag.trim()) {
                const cleanTag = tag.trim();
                if (/^[A-Za-z]{3}$/.test(cleanTag)) {
                  iatas.add(cleanTag.toUpperCase());
                } else {
                  normalTags.add(cleanTag);
                }
              }
            });
          }
        });
        setAirportIatas(Array.from(iatas).sort());
        setAirportTags(Array.from(normalTags).sort());
      }
    } catch (err) {
      console.error('Error parsing airport tags:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch details
      const { data: dData, error: dErr } = await supabase
        .from('campaign_details')
        .select('*');

      if (dErr) throw dErr;

      // Fetch campaigns for display map
      const { data: cData, error: cErr } = await supabase
        .from('campaign')
        .select('id, name, carrier, valid_from, valid_to');

      if (cErr) {
        console.warn('Could not load campaign associations. Map list will show IDs only.');
      } else {
        const cMap: Record<number, Campaign> = {};
        (cData as Campaign[] || []).forEach(c => {
          cMap[c.id] = c;
        });
        setCampaignsMap(cMap);
      }

      setDetails((dData as CampaignDetail[]) || []);
    } catch (err: any) {
      console.error('Error fetching campaign details:', err);
      setError(err?.message || 'Failed to fetch campaign details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAirportTags();
  }, []);

  const handleSort = (field: keyof CampaignDetail) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const openAddModal = (initialMode: 'standard' | 'matrix' = 'standard') => {
    fetchAirportTags();
    setIsEditMode(false);
    setAutoGenerateId(true);
    setFormId('');
    setFormCampaignId('');
    setFormBookingClass([]);
    setFormDiscountBase('FARE');
    setFormDiscountPercentage('');
    setFormAmount('');
    setFormDiscountType('percentage');
    setFormIndex('1');
    setFormGroupsTag([]);
    setFormGroupTag1('');
    setFormGroupTag2('');
    setBulkTagsInput('');
    setTagCreatorMode('select');
    setModalInputMode(initialMode);
    setMatrixRows(3);
    setMatrixCols(4);
    setMatrixColIndices({ 1: '1', 2: '1', 3: '1' });
    setMatrixGrid([
      ['Hạng chỗ', '', '', ''],
      ['', '', '', ''],
      ['', '', '', '']
    ]);
    setIsModalOpen(true);
  };

  const openAddModalWithDefaults = (campaignId: number, bookingClass: string[], groupTag: string, existingColumnTags?: string[]) => {
    fetchAirportTags();
    setIsEditMode(false);
    setAutoGenerateId(true);
    setFormId('');
    const initialClasses = (bookingClass || [])
      .flatMap(c => c.split('/'))
      .map(c => c.trim())
      .filter(Boolean);
    setFormBookingClass(initialClasses);
    setFormDiscountBase('FARE');
    setFormDiscountPercentage('');
    setFormAmount('');
    setFormDiscountType('percentage');
    setFormIndex('1');
    
    let defaultTags: string[] = [];
    if (existingColumnTags && existingColumnTags.length > 0) {
      defaultTags = [...existingColumnTags];
    } else {
      if (groupTag === 'Âu, Úc, Mỹ') {
        defaultTags = ['Việt Nam <-> Châu Âu'];
      } else if (groupTag === 'Đông Bắc Á, Nam Á và Trung Đông - Châu Phi') {
        defaultTags = ['Việt Nam <-> Đông Bắc Á'];
      } else if (groupTag === 'Đông Nam Á và Đông Dương') {
        defaultTags = ['Việt Nam <-> Đông Nam Á'];
      } else if (groupTag && groupTag !== 'Mặc định') {
        defaultTags = [groupTag];
      }
    }

    setFormGroupsTag(defaultTags);
    setFormGroupTag1('');
    setFormGroupTag2('');
    setBulkTagsInput('');
    setTagCreatorMode('select');
    setModalInputMode('standard');
    setMatrixRows(3);
    setMatrixCols(4);
    setMatrixColIndices({ 1: '1', 2: '1', 3: '1' });
    setMatrixGrid([
      ['Hạng chỗ', '', '', ''],
      ['', '', '', ''],
      ['', '', '', '']
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (detail: CampaignDetail) => {
    fetchAirportTags();
    setIsEditMode(true);
    setAutoGenerateId(false);
    setFormId(detail.id.toString());
    setFormCampaignId(detail.campaign_id);
    const initialClasses = (detail.booking_class || [])
      .flatMap(c => c.split('/'))
      .map(c => c.trim())
      .filter(Boolean);
    setFormBookingClass(initialClasses);
    setFormDiscountBase(detail.discount_base || 'FARE');
    setFormDiscountPercentage(detail.discount_percentage !== undefined && detail.discount_percentage !== null ? detail.discount_percentage.toString() : '');
    setFormAmount(detail.amount !== null && detail.amount !== undefined ? detail.amount.toString() : '');
    setFormDiscountType(detail.amount !== null && detail.amount !== undefined && detail.amount !== 0 ? 'amount' : 'percentage');
    setFormIndex(detail.index !== undefined && detail.index !== null ? detail.index.toString() : '1');
    setFormGroupsTag(detail.groups_tag || []);
    setFormGroupTag1('');
    setFormGroupTag2('');
    setBulkTagsInput('');
    setTagCreatorMode('select');
    setModalInputMode('standard');
    setIsModalOpen(true);
  };

  const openEditCampaignMatrixModal = (campaignId: number, campaignDetails: CampaignDetail[]) => {
    fetchAirportTags();
    setIsEditMode(true);
    setAutoGenerateId(false);
    setFormId('');
    setFormCampaignId(campaignId);
    setFormGroupTag1('');
    setFormGroupTag2('');
    setBulkTagsInput('');
    setTagCreatorMode('select');
    setModalInputMode('matrix');

    // Extract unique column tags
    const colTags = Array.from(
      new Set(campaignDetails.map(d => (d.groups_tag || []).sort().join(';')))
    ).filter(Boolean) as string[];
    const cols = colTags.length > 0 ? colTags : ['Mặc định'];

    // Extract unique rows (group them as they were, but split elements by / and join with comma so TagInput can parse them)
    const uniqueRows = Array.from(
      new Set(
        campaignDetails.map(d => {
          if (!d.booking_class || d.booking_class.length === 0) return 'Tất cả';
          const classes = d.booking_class.flatMap(c => c.split('/')).map(c => c.trim().toUpperCase()).filter(Boolean);
          return [...new Set(classes)].sort().join(', ');
        })
      )
    ) as string[];

    const rowsCount = uniqueRows.length + 1;
    const colsCount = cols.length + 1;

    setMatrixRows(rowsCount);
    setMatrixCols(colsCount);

    // Build the grid
    const grid: string[][] = Array(rowsCount).fill(null).map(() => Array(colsCount).fill(''));
    grid[0][0] = 'Hạng chỗ';
    
    // Set headers
    for (let c = 1; c < colsCount; c++) {
      grid[0][c] = cols[c - 1];
    }
    
    // Set row keys
    for (let r = 1; r < rowsCount; r++) {
      grid[r][0] = uniqueRows[r - 1];
    }

    // Set values
    let detectedDiscountType: 'percentage' | 'amount' = 'percentage';
    let detectedDiscountBase = 'FARE';
    let detectedIndex = '1';

    if (campaignDetails.length > 0) {
      const firstDetail = campaignDetails[0];
      detectedDiscountBase = firstDetail.discount_base || 'FARE';
      detectedIndex = firstDetail.index !== undefined && firstDetail.index !== null ? firstDetail.index.toString() : '1';
      if (campaignDetails.some(d => d.amount !== null && d.amount !== undefined && d.amount !== 0)) {
        detectedDiscountType = 'amount';
      }
    }

    setFormDiscountType(detectedDiscountType);
    setFormDiscountBase(detectedDiscountBase);
    setFormIndex(detectedIndex);

    for (let r = 1; r < rowsCount; r++) {
      const rowKey = uniqueRows[r - 1];
      for (let c = 1; c < colsCount; c++) {
        const colTagStr = cols[c - 1];
        const detail = campaignDetails.find(d => {
          let dKey = 'Tất cả';
          if (d.booking_class && d.booking_class.length > 0) {
            const classes = d.booking_class.flatMap(c => c.split('/')).map(c => c.trim().toUpperCase()).filter(Boolean);
            dKey = [...new Set(classes)].sort().join(', ');
          }
          const matchesRow = dKey === rowKey;
          const matchesCol = colTagStr === 'Mặc định'
            ? (!d.groups_tag || d.groups_tag.length === 0)
            : (d.groups_tag || []).sort().join(';') === colTagStr;
          return matchesRow && matchesCol;
        });

        if (detail) {
          const val = detectedDiscountType === 'amount'
            ? (detail.amount !== null && detail.amount !== undefined ? detail.amount.toString() : '')
            : (detail.discount_percentage !== undefined && detail.discount_percentage !== null ? detail.discount_percentage.toString() : '');
          grid[r][c] = val;
        }
      }
    }

    const colIndicesMap: {[key: number]: string} = {};
    for (let c = 1; c < colsCount; c++) {
      const colTagStr = cols[c - 1];
      const colDetails = campaignDetails.filter(d => 
        colTagStr === 'Mặc định'
          ? (!d.groups_tag || d.groups_tag.length === 0)
          : (d.groups_tag || []).sort().join(';') === colTagStr
      );
      const colIndex = colDetails.length > 0 && colDetails[0].index !== undefined && colDetails[0].index !== null 
        ? colDetails[0].index.toString() 
        : '1';
      colIndicesMap[c] = colIndex;
    }
    setMatrixColIndices(colIndicesMap);

    setMatrixGrid(grid);
    setIsModalOpen(true);
  };

  const deleteMatrixColumn = (colIndex: number) => {
    setMatrixGrid(prev => {
      return prev.map(row => row.filter((_, idx) => idx !== colIndex));
    });
    setMatrixColIndices(prev => {
      const nextMap: {[key: number]: string} = {};
      Object.entries(prev).forEach(([keyStr, val]) => {
        const key = parseInt(keyStr, 10);
        if (key < colIndex) {
          nextMap[key] = val as string;
        } else if (key > colIndex) {
          nextMap[key - 1] = val as string;
        }
      });
      return nextMap;
    });
    setMatrixCols(prev => prev - 1);
  };

  const deleteMatrixRow = (rowIndex: number) => {
    setMatrixGrid(prev => prev.filter((_, idx) => idx !== rowIndex));
    setMatrixRows(prev => prev - 1);
  };

  const openEditColumnTagsModal = (colTag: string, groupDetails: CampaignDetail[]) => {
    fetchAirportTags();
    
    // Find all details in this column
    const colDetails = groupDetails.filter(d => 
      (d.groups_tag || []).some(t => mapTagToGroupCol(t) === colTag)
    );

    // Collect all existing tags from these details
    const existingTags = Array.from(
      new Set(colDetails.flatMap(d => d.groups_tag || []))
    );

    setColEditName(colTag);
    setColEditGroupDetails(colDetails);
    setColEditTags(existingTags);
    setColEditTag1('');
    setColEditTag2('');
    setColEditBulkInput('');
    setColEditTagCreatorMode('select');
    setIsColModalOpen(true);
  };

  const handleSaveColumnTags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colEditTags || colEditTags.length === 0) {
      showToast('Thẻ nhóm phân loại là bắt buộc và phải có ít nhất 1 thẻ!', 'error');
      return;
    }

    try {
      setLoading(true);
      const updatePromises = colEditGroupDetails.map(d => 
        supabase
          .from('campaign_details')
          .update({ groups_tag: colEditTags })
          .eq('id', d.id)
      );

      const results = await Promise.all(updatePromises);
      
      const firstError = results.find(r => r.error);
      if (firstError) throw firstError.error;

      showToast(`Cập nhật thành công nhóm thẻ cho ${colEditGroupDetails.length} dòng thuộc cột "${colEditName}"`);
      setIsColModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Error saving column tags:', err);
      showToast(err?.message || 'Lỗi xảy ra khi lưu thẻ nhóm.', 'error');
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      const { error: err } = await supabase
        .from('campaign_details')
        .delete()
        .eq('id', deleteId);

      if (err) throw err;

      showToast(`Đã xóa chi tiết chiến dịch #${deleteId} thành công.`);
      fetchData();
    } catch (err: any) {
      console.error('Error deleting campaign detail:', err);
      showToast(err?.message || 'Không thể xóa chi tiết chiến dịch.', 'error');
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent, isDuplicateMode: boolean = false) => {
    e.preventDefault();

    if (formCampaignId === '') {
      showToast('Campaign is required', 'error');
      return;
    }

    const indexVal = formIndex !== '' ? parseInt(formIndex, 10) : null;
    if (indexVal !== null && isNaN(indexVal)) {
      showToast('Thứ tự ưu tiên phải là số nguyên hợp lệ', 'error');
      return;
    }

    if (modalInputMode === 'matrix') {
      const payloads: any[] = [];
      for (let r = 1; r < matrixRows; r++) {
        const classCell = matrixGrid[r]?.[0]?.trim();
        if (!classCell) continue;
        const classes = classCell.split(/[\s,;]+/).map(c => c.trim().toUpperCase()).filter(Boolean);
        if (classes.length === 0) continue;

        for (let c = 1; c < matrixCols; c++) {
          const tagCell = matrixGrid[0]?.[c]?.trim();
          if (!tagCell) continue;
          const columnTags = tagCell.split(';').map(t => t.trim()).filter(Boolean);
          if (columnTags.length === 0) continue;

          const pctStr = matrixGrid[r]?.[c]?.trim();
          if (!pctStr) continue;

          const pctVal = parseFloat(pctStr);
          if (isNaN(pctVal) || pctVal < 0) {
            showToast(`Giá trị ở dòng ${r + 1}, cột ${c + 1} không hợp lệ`, 'error');
            return;
          }
          if (formDiscountType === 'percentage' && pctVal > 100) {
            showToast(`Tỷ lệ phần trăm ở dòng ${r + 1}, cột ${c + 1} phải từ 0 đến 100`, 'error');
            return;
          }

          const colIndexStr = matrixColIndices[c] || '1';
          const colIndexVal = colIndexStr ? parseInt(colIndexStr, 10) : 1;
          if (isNaN(colIndexVal) || colIndexVal < 1) {
            showToast(`Thứ tự ở cột ${c} phải là số nguyên hợp lệ lớn hơn hoặc bằng 1`, 'error');
            return;
          }

          payloads.push({
            campaign_id: Number(formCampaignId),
            booking_class: classes,
            discount_base: formDiscountBase,
            discount_percentage: formDiscountType === 'percentage' ? pctVal : 0,
            amount: formDiscountType === 'amount' ? pctVal : null,
            index: colIndexVal,
            groups_tag: columnTags
          });
        }
      }

      if (payloads.length === 0) {
        showToast('Không có dữ liệu hợp lệ trong ma trận (yêu cầu điền đủ Hạng vé, Group Tag và Giá trị)!', 'error');
        return;
      }

      try {
        setLoading(true);
        if (isEditMode && !isDuplicateMode) {
          // Delete existing campaign details for this campaign
          const { error: deleteErr } = await supabase
            .from('campaign_details')
            .delete()
            .eq('campaign_id', Number(formCampaignId));
          if (deleteErr) throw deleteErr;
        }

        const { error: err } = await supabase
          .from('campaign_details')
          .insert(payloads);

        if (err) throw err;
        showToast(isEditMode && !isDuplicateMode
          ? `Đã cập nhật ma trận chi tiết chiến dịch (${payloads.length} mục) thành công.`
          : `Đã nhân bản/thêm thành công ${payloads.length} chi tiết chiến dịch từ ma trận.`
        );
        setIsModalOpen(false);
        fetchData();
      } catch (err: any) {
        console.error('Error saving campaign details matrix:', err);
        showToast(err?.message || 'Lỗi xảy ra khi lưu ma trận chi tiết chiến dịch.', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    let pctVal: number | null = null;
    let amountVal: number | null = null;

    if (formDiscountType === 'percentage') {
      if (formDiscountPercentage === '') {
        showToast('Tỷ lệ giảm giá là bắt buộc', 'error');
        return;
      }
      const parsedPct = parseFloat(formDiscountPercentage);
      if (isNaN(parsedPct) || parsedPct < 0 || parsedPct > 100) {
        showToast('Tỷ lệ phần trăm giảm giá phải từ 0 đến 100', 'error');
        return;
      }
      pctVal = parsedPct;
    } else {
      if (formAmount === '') {
        showToast('Số tiền giảm cố định là bắt buộc', 'error');
        return;
      }
      const parsedAmount = parseInt(formAmount, 10);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        showToast('Số tiền giảm cố định phải là số nguyên hợp lệ', 'error');
        return;
      }
      amountVal = parsedAmount;
    }

    if (!formGroupsTag || formGroupsTag.length === 0) {
      showToast('Thẻ nhóm phân loại là bắt buộc và phải có ít nhất 1 thẻ!', 'error');
      return;
    }

    const payload: any = {
      campaign_id: Number(formCampaignId),
      booking_class: formBookingClass,
      discount_base: formDiscountBase,
      discount_percentage: pctVal !== null ? pctVal : 0,
      amount: amountVal,
      index: indexVal,
      groups_tag: formGroupsTag,
    };

    if (!autoGenerateId && formId) {
      payload.id = parseInt(formId, 10);
      if (isNaN(payload.id)) {
        showToast('ID must be a valid integer', 'error');
        return;
      }
    }

    try {
      if (isEditMode && !isDuplicateMode) {
        const { error: err } = await supabase
          .from('campaign_details')
          .update(payload)
          .eq('id', parseInt(formId, 10));

        if (err) throw err;
        showToast('Campaign detail updated successfully');
      } else {
        const { error: err } = await supabase
          .from('campaign_details')
          .insert([payload]);

        if (err) throw err;
        showToast(isDuplicateMode ? 'Đã nhân bản chi tiết chiến dịch thành công' : 'Campaign detail created successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving campaign detail:', err);
      showToast(err?.message || 'Error occurred while saving.', 'error');
    }
  };

  const handleCreateAndKeepTags = async () => {
    if (formCampaignId === '') {
      showToast('Campaign is required', 'error');
      return;
    }

    let pctVal: number | null = null;
    let amountVal: number | null = null;

    if (formDiscountType === 'percentage') {
      if (formDiscountPercentage === '') {
        showToast('Tỷ lệ giảm giá là bắt buộc', 'error');
        return;
      }
      const parsedPct = parseFloat(formDiscountPercentage);
      if (isNaN(parsedPct) || parsedPct < 0 || parsedPct > 100) {
        showToast('Tỷ lệ phần trăm giảm giá phải từ 0 đến 100', 'error');
        return;
      }
      pctVal = parsedPct;
    } else {
      if (formAmount === '') {
        showToast('Số tiền giảm cố định là bắt buộc', 'error');
        return;
      }
      const parsedAmount = parseInt(formAmount, 10);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        showToast('Số tiền giảm cố định phải là số nguyên hợp lệ', 'error');
        return;
      }
      amountVal = parsedAmount;
    }

    const indexVal = formIndex !== '' ? parseInt(formIndex, 10) : null;
    if (indexVal !== null && isNaN(indexVal)) {
      showToast('Thứ tự ưu tiên phải là số nguyên hợp lệ', 'error');
      return;
    }

    if (!formGroupsTag || formGroupsTag.length === 0) {
      showToast('Thẻ nhóm phân loại là bắt buộc và phải có ít nhất 1 thẻ!', 'error');
      return;
    }

    const payload: any = {
      campaign_id: Number(formCampaignId),
      booking_class: formBookingClass,
      discount_base: formDiscountBase,
      discount_percentage: pctVal !== null ? pctVal : 0,
      amount: amountVal,
      index: indexVal,
      groups_tag: formGroupsTag,
    };

    try {
      const { error: err } = await supabase
        .from('campaign_details')
        .insert([payload]);

      if (err) throw err;
      showToast('Đã tạo mới chi tiết vé thành công và giữ lại các thẻ!', 'success');
      
      // Update the main listing
      fetchData();
      
      // Transition out of edit mode to create mode, reset ID to prevent edits,
      // but KEEP all the form tags and input fields for further quick additions.
      setIsEditMode(false);
      setAutoGenerateId(true);
      setFormId('');
    } catch (err: any) {
      console.error('Error creating campaign detail (keeping tags):', err);
      showToast(err?.message || 'Error occurred while creating.', 'error');
    }
  };

  // Filter campaign details based on search query
  const filteredDetails = details.filter(d => {
    const camp = campaignsMap[d.campaign_id];
    if (hideExpiredCampaigns && camp && isCampaignExpired(camp.valid_to)) return false;

    const q = searchQuery.toLowerCase();
    const campaignName = camp?.name?.toLowerCase() || '';
    const carrierName = camp?.carrier?.toLowerCase() || '';
    const bClasses = (d.booking_class || []).join(' ').toLowerCase();
    const gTags = (d.groups_tag || []).join(' ').toLowerCase();

    return (
      d.id.toString().includes(q) ||
      d.campaign_id.toString().includes(q) ||
      d.discount_base.toLowerCase().includes(q) ||
      campaignName.includes(q) ||
      carrierName.includes(q) ||
      bClasses.includes(q) ||
      gTags.includes(q)
    );
  });

  // Sort details (Group primarily by campaign name/ID, secondarily by active sort field)
  const sortedDetails = [...filteredDetails].sort((a, b) => {
    // Primary sort: group by campaign_id
    if (a.campaign_id !== b.campaign_id) {
      const nameA = campaignsMap[a.campaign_id]?.name || '';
      const nameB = campaignsMap[b.campaign_id]?.name || '';
      return nameA.localeCompare(nameB);
    }

    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else if (Array.isArray(aVal) && Array.isArray(bVal)) {
      // compare array lengths
      return sortDirection === 'asc'
        ? aVal.length - bVal.length
        : bVal.length - aVal.length;
    } else {
      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    }
  });

  // Group sortedDetails by campaign_id
  const campaignGroups = React.useMemo(() => {
    const groups: { campaignId: number; details: CampaignDetail[] }[] = [];
    sortedDetails.forEach(detail => {
      let lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.campaignId !== detail.campaign_id) {
        lastGroup = { campaignId: detail.campaign_id, details: [] };
        groups.push(lastGroup);
      }
      lastGroup.details.push(detail);
    });
    return groups;
  }, [sortedDetails]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl border transition-all duration-300 flex items-center gap-2.5 max-w-sm ${
          toast.type === 'success' 
            ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40' 
            : 'bg-rose-950/30 text-rose-400 border-rose-900/40'
        }`}>
          <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
            <Check className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium">{toast.text}</p>
        </div>
      )}

      {/* Control Panel */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-zinc-900/10 p-2 rounded-md border border-zinc-900/50 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
            <Search className="h-3.5 w-3.5 text-zinc-500" />
          </span>
          <input
            type="text"
            placeholder="Tìm hạng vé, chiến dịch, tỷ lệ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-8 pr-2.5 py-1 border border-zinc-800 rounded bg-zinc-900/30 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-xs transition-all text-zinc-100"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="p-1.5 border border-zinc-850 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900/50 flex items-center justify-center cursor-pointer"
            title="Tải lại"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => openAddModal('standard')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded text-xs font-bold transition-all shadow active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm Chi tiết
          </button>

          <button
            onClick={() => openAddModal('matrix')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-100 hover:bg-zinc-800 rounded text-xs font-bold transition-all shadow active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm Ma trận
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Lỗi truy cập cơ sở dữ liệu</h4>
            <p className="text-xs text-rose-300 mt-1">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-2 text-xs font-semibold text-rose-400 hover:text-rose-200 flex items-center gap-1 underline cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Table Area */}
      <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin mx-auto" />
            <p className="text-sm text-zinc-400 font-medium">Đang tải cấu hình chi tiết từ Supabase...</p>
          </div>
        ) : sortedDetails.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 bg-zinc-900/50 text-zinc-500 rounded-full flex items-center justify-center mx-auto border border-zinc-850">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-200 font-semibold text-base">Không tìm thấy chi tiết chiến dịch nào</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {searchQuery ? "Không có bản ghi nào khớp bộ lọc của bạn." : "Khởi tạo chi tiết chiến dịch (mức giảm giá, phân hạng vé) đầu tiên của bạn!"}
            </p>
            {!searchQuery && (
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={() => openAddModal('standard')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 cursor-pointer"
                >
                  Thêm Chi tiết
                </button>
                <button 
                  onClick={() => openAddModal('matrix')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 cursor-pointer"
                >
                  Thêm Ma trận
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              {viewMode === 'list' && (
                <thead>
                  <tr className="bg-zinc-900/40 border-b border-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="px-1.5 py-1 w-16 text-center select-none">STT</th>
                    <th className="px-1.5 py-1 text-zinc-400 font-semibold">Hạng đặt chỗ (Booking Class)</th>
                    <th onClick={() => handleSort('discount_base')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                      <div className="flex items-center gap-1">
                        Loại giảm giá (Base)
                        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('discount_percentage')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                      <div className="flex items-center gap-1">
                        Tỷ lệ (%)
                        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('amount')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                      <div className="flex items-center gap-1">
                        Số tiền giảm
                        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('index')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                      <div className="flex items-center gap-1">
                        Index (Thứ tự)
                        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                      </div>
                    </th>
                    <th className="px-1.5 py-1 text-zinc-400 font-semibold">Thẻ nhóm</th>
                    <th className="px-1.5 py-1 text-center text-zinc-400 font-semibold">Hành động</th>
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-zinc-900 text-[11px] text-zinc-300">
                {campaignGroups.map((group, groupIdx) => {
                  const linkedCampaign = campaignsMap[group.campaignId];
                  const isExpanded = expandedCampaigns[group.campaignId] !== false;
                  const detailsCount = group.details.length;
                  const isEvenGroup = groupIdx % 2 === 0;
                  const groupBgClass = isEvenGroup ? 'bg-zinc-900/30' : 'bg-zinc-950/20';

                  return (
                    <React.Fragment key={group.campaignId}>
                      {/* Separate campaign header row */}
                      <tr 
                        onClick={() => toggleCampaign(group.campaignId)}
                        className={`${groupBgClass} border-y border-zinc-850 hover:bg-zinc-800/40 cursor-pointer transition-colors select-none`}
                      >
                        <td colSpan={8} className="px-1.5 py-0.5 pl-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-zinc-500" />
                              )}
                              <span className="font-bold text-zinc-100 text-sm">
                                {linkedCampaign ? linkedCampaign.name : 'Chiến dịch không xác định'}
                              </span>
                              {linkedCampaign?.carrier && (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-400">
                                    Hãng bay: {linkedCampaign.carrier}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditCampaignMatrixModal(group.campaignId, group.details);
                                    }}
                                    className="p-1 rounded hover:bg-zinc-800 text-amber-500 hover:text-amber-300 transition-colors cursor-pointer"
                                    title="Sửa toàn bộ chiến dịch theo ma trận"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-bold bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800/60">
                              {detailsCount} chi tiết vé
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Render detail items inside the campaign group if expanded */}
                      {isExpanded && (
                        viewMode === 'matrix' ? (
                          <tr>
                            <td colSpan={8} className="px-1.5 py-0.5 bg-zinc-950/40 border-b border-zinc-900/50">
                              <div className="max-w-5xl mx-auto space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    Cấu hình Ma Trận chiết khấu / giảm giá
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-medium">
                                    Mẹo: Rê chuột vào ô giá trị để Sửa/Xóa. Click ô trống bất kỳ để Thêm nhanh giá vé.
                                  </div>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-amber-500/30 shadow-md bg-zinc-900/10">
                                  <table className="w-full border-collapse text-center table-fixed">
                                    <thead>
                                      <tr className="bg-zinc-950 border-b border-amber-500/30 text-[11px]">
                                        <th className="py-2 px-3 border-r border-amber-500/30 text-zinc-200 font-extrabold uppercase bg-zinc-950/80 w-36 text-center">
                                          HẠNG ĐẶT CHỖ
                                        </th>
                                        {(() => {
                                          const columnOrder = [
                                            'Âu, Úc, Mỹ',
                                            'Đông Bắc Á, Nam Á và Trung Đông - Châu Phi',
                                            'Đông Nam Á và Đông Dương'
                                          ];
                                          const uniqueTagsGrouped = Array.from(
                                            new Set((group.details.flatMap(d => d.groups_tag || []) as string[]).map(mapTagToGroupCol))
                                          ).filter(Boolean).sort((a, b) => {
                                            const idxA = columnOrder.indexOf(a);
                                            const idxB = columnOrder.indexOf(b);
                                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                                            if (idxA !== -1) return -1;
                                            if (idxB !== -1) return 1;
                                            return a.localeCompare(b);
                                          });
                                          const cols = uniqueTagsGrouped.length > 0 ? uniqueTagsGrouped : ['Mặc định'];

                                          return cols.map((colTag, cIdx) => {
                                            const colDetails = group.details.filter(d => {
                                              if (uniqueTagsGrouped.length === 0) return true;
                                              return (d.groups_tag || []).some(t => mapTagToGroupCol(t) === colTag);
                                            });
                                            const colIndices = colDetails.map(d => d.index);
                                            const uniqueIndices = Array.from(new Set(colIndices));
                                            const isAllSameIndex = uniqueIndices.length === 1 && uniqueIndices[0] !== null && uniqueIndices[0] !== undefined;
                                            const commonIndex = isAllSameIndex ? uniqueIndices[0] : null;

                                            return (
                                              <th key={cIdx} className="py-2 px-3 border-r border-amber-500/30 text-amber-400 font-bold text-[11px] uppercase bg-zinc-950/40 text-center">
                                                <div className="flex flex-col items-center justify-center gap-1 select-none">
                                                  <div className="flex items-center justify-center gap-1.5">
                                                    <span>{colTag}</span>
                                                    {colTag !== 'Mặc định' && (
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openEditColumnTagsModal(colTag, group.details);
                                                        }}
                                                        className="p-1 rounded hover:bg-zinc-800 text-amber-500 hover:text-amber-300 transition-colors cursor-pointer"
                                                        title={`Sửa thẻ nhóm cho cột ${colTag}`}
                                                      >
                                                        <Edit2 className="w-3 h-3" />
                                                      </button>
                                                    )}
                                                  </div>
                                                  {isAllSameIndex && (
                                                    <span className="text-[9px] text-amber-500/90 font-bold normal-case tracking-normal">
                                                      (Thứ tự: {commonIndex})
                                                    </span>
                                                  )}
                                                </div>
                                              </th>
                                            );
                                          });
                                        })()}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-500/20">
                                      {(() => {
                                        const columnOrder = [
                                          'Âu, Úc, Mỹ',
                                          'Đông Bắc Á, Nam Á và Trung Đông - Châu Phi',
                                          'Đông Nam Á và Đông Dương'
                                        ];
                                        const uniqueTagsGrouped = Array.from(
                                          new Set((group.details.flatMap(d => d.groups_tag || []) as string[]).map(mapTagToGroupCol))
                                        ).filter(Boolean).sort((a, b) => {
                                          const idxA = columnOrder.indexOf(a);
                                          const idxB = columnOrder.indexOf(b);
                                          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                                          if (idxA !== -1) return -1;
                                          if (idxB !== -1) return 1;
                                          return a.localeCompare(b);
                                        });
                                        const cols = uniqueTagsGrouped.length > 0 ? uniqueTagsGrouped : ['Mặc định'];

                                        const classHierarchy = ['J', 'C', 'I', 'E', 'Z', 'W', 'Y', 'B', 'M', 'H', 'K', 'L', 'Q', 'N', 'O', 'R', 'T', 'U', 'V', 'G'];
                                        const getRowMinPriorityIndex = (rowKey: string): number => {
                                          if (rowKey === 'Tất cả') return 999;
                                          const classes = rowKey.split('/');
                                          let minIndex = 999;
                                          classes.forEach(c => {
                                            const idx = classHierarchy.indexOf(c);
                                            if (idx !== -1 && idx < minIndex) minIndex = idx;
                                          });
                                          return minIndex;
                                        };

                                        const uniqueRows = Array.from(
                                          new Set(
                                            group.details.map(d => {
                                              if (!d.booking_class || d.booking_class.length === 0) return 'Tất cả';
                                              return [...d.booking_class].sort().join('/');
                                            })
                                          )
                                        ).sort((a, b) => {
                                          const prioA = getRowMinPriorityIndex(a as string);
                                          const prioB = getRowMinPriorityIndex(b as string);
                                          if (prioA !== prioB) {
                                            return prioA - prioB; // Ascending priority (highest first)
                                          }
                                          if (a === 'Tất cả') return 1;
                                          if (b === 'Tất cả') return -1;
                                          return (a as string).localeCompare(b as string);
                                        }) as string[];

                                        return uniqueRows.map((rowKey, rIdx) => (
                                          <tr key={rIdx} className="hover:bg-zinc-900/20 transition-colors">
                                            <td className="py-1.5 px-3 border-r border-amber-500/30 bg-zinc-950/60 text-zinc-100 font-extrabold text-xs tracking-wider text-center break-all whitespace-normal leading-relaxed">
                                              {rowKey}
                                            </td>
                                            {cols.map((colTag, cIdx) => {
                                              const colDetailsForIndexCheck = group.details.filter(d => {
                                                if (uniqueTagsGrouped.length === 0) return true;
                                                return (d.groups_tag || []).some(t => mapTagToGroupCol(t) === colTag);
                                              });
                                              const colIndices = colDetailsForIndexCheck.map(d => d.index);
                                              const uniqueIndices = Array.from(new Set(colIndices));
                                              const isAllSameIndex = uniqueIndices.length === 1 && uniqueIndices[0] !== null && uniqueIndices[0] !== undefined;

                                              const cellDetails = group.details.filter(d => {
                                                const dKey = !d.booking_class || d.booking_class.length === 0 ? 'Tất cả' : [...d.booking_class].sort().join('/');
                                                const matchesRow = dKey === rowKey;
                                                if (uniqueTagsGrouped.length === 0) return matchesRow;
                                                const matchesCol = (d.groups_tag || []).some(t => mapTagToGroupCol(t) === colTag);
                                                return matchesRow && matchesCol;
                                              });

                                              const hasData = cellDetails.length > 0;

                                              if (hasData) {
                                                const detail = cellDetails[0];
                                                const amountStr = detail.amount !== null && detail.amount !== undefined ? detail.amount.toLocaleString() : '';
                                                const pctStr = detail.discount_percentage !== undefined && detail.discount_percentage !== 0 ? `${detail.discount_percentage}%` : '';
                                                const showIndexInCell = !isAllSameIndex && detail.index !== null && detail.index !== undefined;

                                                return (
                                                  <td key={cIdx} className="p-0 border-r border-amber-500/30 relative group/cell">
                                                    <div className="py-1.5 px-2 min-h-[44px] flex flex-col items-center justify-center transition-all duration-200 group-hover/cell:opacity-10/70">
                                                      <div className="flex items-center gap-1.5 justify-center">
                                                        <span className="font-mono font-extrabold text-rose-400 text-xs leading-none">
                                                          {amountStr || pctStr}
                                                        </span>
                                                        {pctStr && (
                                                          <span className={`inline-block px-1 py-[1px] rounded text-xs font-mono font-bold leading-none ${
                                                            detail.discount_base === 'FARE' 
                                                              ? 'bg-sky-950/30 text-sky-400 border border-sky-900/30' 
                                                              : 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                                                          }`}>
                                                            {detail.discount_base}
                                                          </span>
                                                        )}
                                                      </div>
                                                      {amountStr && pctStr && (
                                                        <span className="block text-[9px] text-zinc-500 mt-0.5 font-mono leading-none">
                                                          ({pctStr})
                                                        </span>
                                                      )}
                                                      {showIndexInCell && (
                                                        <span className="block text-[9px] text-amber-500 font-bold mt-0.5 leading-none">
                                                          (Thứ tự: {detail.index})
                                                        </span>
                                                      )}
                                                    </div>

                                                    <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover/cell:opacity-100 transition-all duration-150 bg-zinc-950/90 backdrop-blur-xs">
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openEditModal(detail);
                                                        }}
                                                        className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-all cursor-pointer border border-zinc-700 shadow-sm"
                                                        title="Sửa"
                                                      >
                                                        <Edit2 className="w-3 h-3" />
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleDelete(detail.id);
                                                        }}
                                                        className="p-1 rounded-md bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-200 transition-all cursor-pointer border border-rose-900/40 shadow-sm"
                                                        title="Xóa"
                                                      >
                                                        <Trash2 className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  </td>
                                                );
                                              } else {
                                                return (
                                                  <td key={cIdx} className="p-0 border-r border-amber-500/30">
                                                    <div 
                                                      onClick={() => {
                                                        const colDetails = group.details.filter(d => 
                                                          (d.groups_tag || []).some(t => mapTagToGroupCol(t) === colTag)
                                                        );
                                                        const existingColumnTags: string[] = Array.from(
                                                          new Set(colDetails.flatMap(d => (d.groups_tag || []) as string[]))
                                                        );
                                                        openAddModalWithDefaults(
                                                          group.campaignId,
                                                          rowKey === 'Tất cả' ? [] : rowKey.split('/'),
                                                          colTag === 'Mặc định' ? '' : colTag,
                                                          existingColumnTags
                                                        );
                                                      }}
                                                      className="min-h-[44px] flex items-center justify-center cursor-pointer hover:bg-amber-500/5 transition-colors group/empty"
                                                      title={`Thêm mới: ${rowKey} - ${colTag}`}
                                                    >
                                                      <Plus className="w-3.5 h-3.5 text-zinc-700 group-hover/empty:text-amber-400 group-hover/empty:scale-110 transition-all duration-150 opacity-25 group-hover/empty:opacity-100" />
                                                    </div>
                                                  </td>
                                                );
                                              }
                                            })}
                                          </tr>
                                        ));
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          group.details.map((detail) => {
                            const overallIndex = sortedDetails.indexOf(detail) + 1;
                            return (
                              <tr key={detail.id} className="hover:bg-zinc-900/10 transition-colors border-b border-zinc-900/50">
                                <td className="px-1.5 py-0.5 font-mono font-bold text-xs text-zinc-500 text-center">
                                  {overallIndex}
                                </td>
                                <td className="px-1.5 py-0.5">
                                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                                    {detail.booking_class && detail.booking_class.length > 0 ? (
                                      detail.booking_class.map((b, bIdx) => (
                                        <span key={bIdx} className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-indigo-950/40 border border-indigo-900/40 text-indigo-300 rounded-md">
                                          {b}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-zinc-600 italic text-xs">Tất cả các hạng</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-1.5 py-0.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                                    detail.discount_base === 'FARE' 
                                      ? 'bg-sky-950/30 text-sky-400 border-sky-900/40' 
                                      : 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40'
                                  }`}>
                                    {detail.discount_base || '—'}
                                  </span>
                                </td>
                                <td className="px-1.5 py-0.5 font-mono font-semibold text-zinc-100 text-xs">
                                  <div className="flex items-center gap-0.5">
                                    {detail.discount_percentage !== undefined && detail.discount_percentage !== 0 ? `${detail.discount_percentage}%` : '—'}
                                  </div>
                                </td>
                                <td className="px-1.5 py-0.5 font-mono text-zinc-300 text-xs">
                                  {detail.amount !== null && detail.amount !== undefined ? detail.amount.toLocaleString() : '—'}
                                </td>
                                <td className="px-1.5 py-0.5 font-mono text-zinc-300 text-xs">
                                  {detail.index !== null && detail.index !== undefined ? detail.index : '—'}
                                </td>
                                <td className="px-1.5 py-0.5">
                                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                                    {detail.groups_tag && detail.groups_tag.length > 0 ? (
                                      detail.groups_tag.map((tag, tagIdx) => (
                                        <span key={tagIdx} className="inline-block px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-sm">
                                          {tag}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-zinc-600 text-xs">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-1.5 py-0.5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => openEditModal(detail)}
                                      className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                                      title="Sửa"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(detail.id)}
                                      className="p-1 rounded border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100/80 transition-all cursor-pointer"
                                      title="Xóa"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className={`bg-zinc-900 rounded-2xl w-full ${modalInputMode === 'matrix' ? 'max-w-4xl' : 'max-w-lg'} shadow-2xl border border-zinc-800 overflow-visible my-8 animate-in fade-in duration-200`}>


            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-4 space-y-3">

              {modalInputMode === 'standard' ? (
                <>
                  {/* Campaign FK Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5">Chọn Chiến dịch áp dụng *</label>
                    <RelationSelector
                      selectedCampaignId={formCampaignId}
                      onChange={(campaignId) => setFormCampaignId(campaignId)}
                      hideExpired={hideExpired}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Chọn Chiến dịch */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5">Chọn Chiến dịch áp dụng *</label>
                    <RelationSelector
                      selectedCampaignId={formCampaignId}
                      onChange={(campaignId) => setFormCampaignId(campaignId)}
                      hideExpired={hideExpired}
                    />
                  </div>

                  {/* Matrix Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-950/30 p-4 border border-zinc-800 rounded-xl">
                    {/* Hình thức giảm giá */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-xs font-bold text-zinc-400 min-h-[32px] flex items-end mb-1">Hình thức & Loại giá *</label>
                      <div className="flex gap-2">
                        {formDiscountType === 'percentage' && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormDiscountBase(formDiscountBase === 'FARE' ? 'NET' : 'FARE');
                            }}
                            className={`px-3 py-2 text-xs font-bold border rounded-lg transition-all select-none cursor-pointer flex items-center justify-center min-w-[70px] active:scale-95 ${
                              formDiscountBase === 'FARE'
                                ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm hover:bg-sky-100/50'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm hover:bg-emerald-100/50'
                            }`}
                          >
                            {formDiscountBase}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (formDiscountType === 'percentage') {
                              setFormDiscountType('amount');
                              setFormDiscountPercentage('');
                            } else {
                              setFormDiscountType('percentage');
                              setFormAmount('');
                            }
                          }}
                          className="flex-1 px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition-all select-none cursor-pointer flex items-center justify-center active:scale-95 gap-1.5"
                        >
                          <span>Giảm giá theo:</span>
                          <span className="text-amber-600 font-mono font-bold">{formDiscountType === 'percentage' ? '%' : 'VNĐ'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Matrix dimensions */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-zinc-400 min-h-[32px] flex items-end mb-1">Số dòng (Hạng vé + 1) *</label>
                      <input
                        type="number"
                        min={2}
                        required
                        value={matrixRows}
                        onChange={(e) => handleMatrixSizeChange(parseInt(e.target.value, 10) || 2, matrixCols)}
                        className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-zinc-400 min-h-[32px] flex items-end mb-1">Số cột (Thẻ nhóm + 1) *</label>
                      <input
                        type="number"
                        min={2}
                        required
                        value={matrixCols}
                        onChange={(e) => handleMatrixSizeChange(matrixRows, parseInt(e.target.value, 10) || 2)}
                        className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {modalInputMode === 'matrix' ? (
                <>

                  {/* Matrix Editor Grid */}
                  <div className="space-y-1.5 mt-4">
                    <label className="block text-xs font-bold text-zinc-400">
                      Ma trận chiết khấu ({formDiscountType === 'percentage' ? 'Tỷ lệ %' : 'Số tiền cố định VNĐ'})
                    </label>
                    <div className="overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-950/20 max-h-96">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            {Array.from({ length: matrixCols }).map((_, cIdx) => (
                              <th key={`h-${cIdx}`} className="p-1 border border-zinc-800 text-center text-xs font-semibold text-zinc-400 min-w-[120px] bg-zinc-900/55">
                                {cIdx === 0 ? (
                                  <input
                                    type="text"
                                    disabled
                                    value={matrixGrid[0]?.[0] || 'Hạng chỗ'}
                                    className="w-full px-1.5 py-1 text-center border-0 bg-transparent text-zinc-400 font-bold text-xs focus:outline-none focus:ring-0"
                                  />
                                ) : (
                                  <div className="flex flex-col gap-1 w-full min-w-[140px] px-1 py-1.5">
                                    <div className="relative flex items-center gap-1 w-full">
                                      <input
                                        type="text"
                                        placeholder={`Chọn tag...`}
                                        readOnly
                                        required
                                        value={matrixGrid[0]?.[cIdx] || ''}
                                        className="w-full px-1.5 py-1 text-center border border-zinc-800 rounded bg-zinc-950 text-zinc-100 text-xs focus:outline-none cursor-default font-mono pr-12"
                                        title="Bấm nút + bên cạnh để chọn tag"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const val = matrixGrid[0]?.[cIdx] || '';
                                          const activeTags = val 
                                            ? val.split(';').map(t => t.trim()).filter(Boolean)
                                            : [];
                                          setMatrixActiveTags(activeTags);
                                          setMatrixTagA('');
                                          setMatrixTagB('');
                                          setMatrixOperator('<->');
                                          setActiveHeaderEditCol(cIdx);
                                        }}
                                        className="absolute right-7 p-0.5 rounded hover:bg-zinc-800 text-emerald-400 hover:text-emerald-350 transition-colors focus:outline-none cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteMatrixColumn(cIdx)}
                                        className="absolute right-1.5 p-0.5 rounded hover:bg-zinc-800 text-rose-500 hover:text-rose-400 transition-colors focus:outline-none cursor-pointer"
                                        title="Xóa cột"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1 bg-zinc-950/45 px-1 py-0.5 rounded border border-zinc-800/80">
                                      <span className="text-[10px] text-zinc-400 font-semibold whitespace-nowrap">Thứ tự:</span>
                                      <input
                                        type="number"
                                        min={1}
                                        required
                                        value={matrixColIndices[cIdx] || '1'}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setMatrixColIndices(prev => ({ ...prev, [cIdx]: val }));
                                        }}
                                        className="w-full bg-zinc-900 border-0 p-0 text-[10px] text-center text-amber-500 font-bold focus:outline-none focus:ring-0 h-4 focus:border-0"
                                      />
                                    </div>
                                  </div>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: matrixRows - 1 }).map((_, rIdx) => {
                            const r = rIdx + 1;
                            return (
                              <tr key={`r-${r}`} className="hover:bg-zinc-900/20">
                                {Array.from({ length: matrixCols }).map((_, cIdx) => {
                                  if (cIdx === 0) {
                                    const cellVal = matrixGrid[r]?.[0] || '';
                                    const tagList = cellVal 
                                      ? cellVal.split(/[\s,;]+/).map(t => t.trim().toUpperCase()).filter(Boolean)
                                      : [];
                                    return (
                                      <td key={`c-${r}-${cIdx}`} className="p-1 border border-zinc-800 bg-zinc-900/25 min-w-[200px]">
                                        <div className="flex items-center gap-1">
                                          <div className="flex-1">
                                            <TagInput
                                              tags={tagList}
                                              onChange={(newTags) => {
                                                setMatrixGrid(prev => {
                                                  const copy = prev.map(row => [...row]);
                                                  copy[r][0] = newTags.join(', ');
                                                  return copy;
                                                });
                                              }}
                                              placeholder="Hạng chỗ..."
                                              hideHelp
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => deleteMatrixRow(r)}
                                            className="p-1.5 text-rose-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors focus:outline-none cursor-pointer flex-shrink-0"
                                            title="Xóa dòng"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={`c-${r}-${cIdx}`} className="p-1 border border-zinc-800">
                                      <input
                                        type="number"
                                        step="any"
                                        min={0}
                                        {...(formDiscountType === 'percentage' ? { max: 100 } : {})}
                                        placeholder={formDiscountType === 'percentage' ? "Chiết khấu %" : "Số tiền giảm"}
                                        value={matrixGrid[r]?.[cIdx] || ''}
                                        onChange={(e) => {
                                          let val = e.target.value;
                                          if (val !== '') {
                                            const num = parseFloat(val);
                                            if (!isNaN(num)) {
                                              if (num < 0) val = '0';
                                              if (formDiscountType === 'percentage' && num > 100) val = '100';
                                            }
                                          }
                                          setMatrixGrid(prev => {
                                            const copy = prev.map(row => [...row]);
                                            copy[r][cIdx] = val;
                                            return copy;
                                          });
                                        }}
                                        className="w-full px-1.5 py-1 text-center border border-zinc-800 rounded bg-zinc-905 text-zinc-100 text-xs focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 font-mono"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Floating Modal for Group Tag Config */}
                    {activeHeaderEditCol !== null && (
                      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm overflow-visible p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150 text-left">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                            <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                              Cấu hình Group Tag {activeHeaderEditCol}
                            </h4>
                            <button
                              type="button"
                              onClick={() => setActiveHeaderEditCol(null)}
                              className="p-1 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-3 text-xs">
                            {/* Current tags list */}
                            <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-950">
                              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Các thẻ đã chọn:</div>
                              {matrixActiveTags.length === 0 ? (
                                <div className="text-xs text-zinc-500 italic">Chưa có thẻ nào được chọn. Hãy cấu hình bên dưới và nhấn "Thêm".</div>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                  {matrixActiveTags.map((tag, idx) => (
                                    <div
                                      key={`m-badge-${tag}-${idx}`}
                                      className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-100 animate-fade-in"
                                    >
                                      <span>{tag}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMatrixActiveTags(matrixActiveTags.filter((_, i) => i !== idx));
                                        }}
                                        className="text-zinc-500 hover:text-red-400 focus:outline-none cursor-pointer text-[10px] font-bold px-0.5"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Generator Fields */}
                            <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/40 space-y-3">
                              {/* Tag A */}
                              <div>
                                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Tag A (Từ) *</label>
                                <TagDropdown
                                  value={matrixTagA}
                                  onChange={setMatrixTagA}
                                  airportIatas={airportIatas}
                                  airportTags={airportTags}
                                  placeholder="Chọn Tag A..."
                                />
                              </div>

                              {/* Operator */}
                              <div>
                                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Chiều vận chuyển *</label>
                                <CustomSelect
                                  value={matrixOperator}
                                  onChange={setMatrixOperator}
                                  options={[
                                    { value: '<->', label: 'Khứ hồi / Hai chiều (<->)' },
                                    { value: '->', label: 'Một chiều (->)' }
                                  ]}
                                />
                              </div>

                              {/* Tag B */}
                              <div>
                                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Tag B (Đến) *</label>
                                <TagDropdown
                                  value={matrixTagB}
                                  onChange={setMatrixTagB}
                                  airportIatas={airportIatas}
                                  airportTags={airportTags}
                                  placeholder="Chọn Tag B..."
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!matrixTagA || !matrixTagB) {
                                    showToast('Vui lòng chọn đủ Tag A và Tag B', 'error');
                                    return;
                                  }
                                  const newTag = `${matrixTagA} ${matrixOperator} ${matrixTagB}`;
                                  if (matrixActiveTags.includes(newTag)) {
                                    showToast('Thẻ nhóm này đã tồn tại trong danh sách chọn!', 'error');
                                    return;
                                  }
                                  setMatrixActiveTags([...matrixActiveTags, newTag]);
                                  setMatrixTagA('');
                                  setMatrixTagB('');
                                }}
                                className="w-full py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1 border border-zinc-800/80"
                              >
                                <Plus className="w-3.5 h-3.5" /> Thêm thẻ nhóm
                              </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t border-zinc-850">
                              <button
                                type="button"
                                onClick={() => setActiveHeaderEditCol(null)}
                                className="flex-1 py-2 text-center bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none active:scale-95"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (matrixActiveTags.length === 0) {
                                    showToast('Vui lòng chọn ít nhất một thẻ nhóm!', 'error');
                                    return;
                                  }
                                  const completedTag = matrixActiveTags.join('; ');
                                  setMatrixGrid(prev => {
                                    const copy = prev.map(row => [...row]);
                                    copy[0][activeHeaderEditCol] = completedTag;
                                    return copy;
                                  });
                                  setActiveHeaderEditCol(null);
                                }}
                                className="flex-1 py-2 text-center bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer select-none active:scale-95"
                              >
                                Chọn
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Booking Classes Tags array */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-zinc-400">Hạng vé (Booking Classes - danh sách phân tách)</label>
                      {formBookingClass.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormBookingClass([])}
                          className="text-[10px] font-bold text-rose-400 hover:text-rose-350 cursor-pointer transition-colors hover:underline"
                        >
                          Xoá hết ({formBookingClass.length})
                        </button>
                      )}
                    </div>
                    <TagInput
                      tags={formBookingClass}
                      onChange={setFormBookingClass}
                      placeholder="Gõ một hạng vé (ví dụ: J, C, Y, A) rồi nhấn Enter"
                    />
                  </div>

                  {/* Discount & Index input inline */}
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="text-xs font-bold text-zinc-400">Giảm giá theo *</label>
                      <label className="text-xs font-bold text-zinc-400 w-24 text-left">Thứ tự</label>
                    </div>
                    <div className="flex gap-2">
                      {formDiscountType === 'percentage' && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormDiscountBase(formDiscountBase === 'FARE' ? 'NET' : 'FARE');
                          }}
                          className={`px-3 py-2 text-xs font-bold border rounded-lg transition-all select-none cursor-pointer flex items-center justify-center min-w-[70px] active:scale-95 ${
                            formDiscountBase === 'FARE'
                              ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm hover:bg-sky-100/50'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm hover:bg-emerald-100/50'
                          }`}
                        >
                          {formDiscountBase}
                        </button>
                      )}
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step={formDiscountType === 'percentage' ? 'any' : '1'}
                          min={0}
                          {...(formDiscountType === 'percentage' ? { max: 100 } : {})}
                          required={modalInputMode === 'standard'}
                          placeholder={formDiscountType === 'percentage' ? "Ví dụ: 12.5" : "Ví dụ: 150000"}
                          value={formDiscountType === 'percentage' ? formDiscountPercentage : formAmount}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val !== '') {
                              const num = parseFloat(val);
                              if (!isNaN(num)) {
                                if (num < 0) {
                                  val = '0';
                                }
                                if (formDiscountType === 'percentage' && num > 100) {
                                  val = '100';
                                }
                              }
                            }
                            if (formDiscountType === 'percentage') {
                              setFormDiscountPercentage(val);
                            } else {
                              setFormAmount(val);
                            }
                          }}
                          className="block w-full pl-3 pr-16 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (formDiscountType === 'percentage') {
                              setFormDiscountType('amount');
                              setFormDiscountPercentage('');
                            } else {
                              setFormDiscountType('percentage');
                              setFormAmount('');
                            }
                          }}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-xs font-bold text-zinc-400 hover:text-zinc-200 border-l border-zinc-800 bg-zinc-800/80 hover:bg-zinc-850 rounded-r-lg transition-colors cursor-pointer select-none active:scale-95"
                        >
                          {formDiscountType === 'percentage' ? '%' : 'VNĐ'}
                        </button>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min={1}
                          required
                          placeholder="Ví dụ: 1"
                          value={formIndex}
                          onChange={(e) => setFormIndex(e.target.value)}
                          className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Groups Tag */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-zinc-400 mb-0.5">Thẻ nhóm phân loại *</label>
                    
                    {/* Current tags display */}
                    <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-950">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Các thẻ đã chọn:</div>
                      {formGroupsTag.length === 0 ? (
                        <div className="text-xs text-zinc-500 italic">Chưa có thẻ nào được thêm. Vui lòng chọn Tag A và Tag B bên dưới để tạo thẻ nhóm.</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {formGroupsTag.map((tag, idx) => (
                            <div
                              key={`badge-${tag}-${idx}`}
                              className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-100 animate-fade-in"
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormGroupsTag(formGroupsTag.filter((_, i) => i !== idx));
                                }}
                                className="text-zinc-500 hover:text-red-400 focus:outline-none cursor-pointer text-[10px] font-bold px-0.5"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Generator Section */}
                    <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/40 space-y-3">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Tag A */}
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-1">Tag A (Từ) *</label>
                            <TagDropdown
                              value={formGroupTag1}
                              onChange={setFormGroupTag1}
                              airportIatas={airportIatas}
                              airportTags={airportTags}
                              placeholder="Chọn Tag A..."
                            />
                          </div>

                          {/* Tag B */}
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-1">Tag B (Đến) *</label>
                            <TagDropdown
                              value={formGroupTag2}
                              onChange={setFormGroupTag2}
                              airportIatas={airportIatas}
                              airportTags={airportTags}
                              placeholder="Chọn Tag B..."
                            />
                          </div>
                        </div>

                        {formGroupTag1 && formGroupTag2 && (
                          <div className="space-y-2 pt-1 border-t border-zinc-800/50">
                            <div className="text-[10px] text-zinc-400">
                              Xem trước thẻ sẽ tạo:
                              <ul className="list-disc pl-4 space-y-0.5 mt-1 font-mono text-zinc-300">
                                <li>Thẻ 1 chiều: <strong className="text-emerald-400">{formGroupTag1} {"->"} {formGroupTag2}</strong></li>
                                <li>Thẻ 2 chiều: <strong className="text-emerald-400">{formGroupTag1} {"<->"} {formGroupTag2}</strong></li>
                              </ul>
                            </div>
                            
                            <div className="flex gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!formGroupTag1 || !formGroupTag2) return;
                                  const newTag = `${formGroupTag1} -> ${formGroupTag2}`;
                                  if (formGroupsTag.includes(newTag)) {
                                    showToast('Thẻ này đã tồn tại trong danh sách!', 'error');
                                  } else {
                                    setFormGroupsTag([...formGroupsTag, newTag]);
                                    showToast(`Đã thêm: ${newTag}`, 'success');
                                  }
                                }}
                                className="flex-1 py-1 px-2 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition-colors cursor-pointer"
                            >
                              Thêm 1 chiều {"(->)"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!formGroupTag1 || !formGroupTag2) return;
                                const newTag = `${formGroupTag1} <-> ${formGroupTag2}`;
                                if (formGroupsTag.includes(newTag)) {
                                  showToast('Thẻ này đã tồn tại trong danh sách!', 'error');
                                } else {
                                  setFormGroupsTag([...formGroupsTag, newTag]);
                                  showToast(`Đã thêm: ${newTag}`, 'success');
                                }
                              }}
                              className="flex-1 py-1 px-2 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition-colors cursor-pointer"
                              >
                                Thêm 2 chiều {"(<->)"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Modal Footer */}
              <div className="mt-4 pt-3 border-t border-zinc-850 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                {modalInputMode === 'standard' && !isEditMode && (
                  <button
                    type="button"
                    onClick={handleCreateAndKeepTags}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-bold transition-all shadow-md cursor-pointer"
                  >
                    Tạo mới giữ nguyên tag
                  </button>
                )}
                {isEditMode && (
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-zinc-950 rounded-lg text-sm font-bold transition-all shadow-md cursor-pointer"
                  >
                    Lưu nhân bản
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-lg text-sm font-bold transition-all shadow-md cursor-pointer"
                >
                  {isEditMode ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Column Tags Modal */}
      {isColModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-800 overflow-visible my-8 animate-in fade-in duration-200">


            {/* Modal Body */}
            <form onSubmit={handleSaveColumnTags} className="p-4 space-y-3">
              
              <div className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-lg text-xs text-zinc-400 space-y-1">
                <span className="font-bold text-zinc-300">Thông tin áp dụng:</span>
                <p>Nhóm này có <span className="font-bold text-emerald-400">{colEditGroupDetails.length} dòng</span> chi tiết vé. Thay đổi thẻ ở đây sẽ cập nhật thẻ cho toàn bộ cột này.</p>
              </div>

              {/* Groups Tag */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-400 mb-0.5">Thẻ nhóm phân loại *</label>
                
                {/* Current tags display */}
                <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-950">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Các thẻ đã chọn:</div>
                  {colEditTags.length === 0 ? (
                    <div className="text-xs text-zinc-500 italic">Chưa có thẻ nào được thêm. Vui lòng chọn Tag A và Tag B bên dưới để tạo thẻ nhóm.</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 font-mono">
                      {colEditTags.map((tag, idx) => (
                        <div
                          key={`col-badge-${tag}-${idx}`}
                          className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-100 animate-fade-in"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setColEditTags(colEditTags.filter((_, i) => i !== idx));
                            }}
                            className="text-zinc-500 hover:text-red-400 focus:outline-none cursor-pointer text-[10px] font-bold px-0.5"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generator Section */}
                <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/40 space-y-3">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Tag A */}
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Tag A (Từ) *</label>
                        <TagDropdown
                          value={colEditTag1}
                          onChange={setColEditTag1}
                          airportIatas={airportIatas}
                          airportTags={airportTags}
                          placeholder="Chọn Tag A..."
                        />
                      </div>

                      {/* Tag B */}
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Tag B (Đến) *</label>
                        <TagDropdown
                          value={colEditTag2}
                          onChange={setColEditTag2}
                          airportIatas={airportIatas}
                          airportTags={airportTags}
                          placeholder="Chọn Tag B..."
                        />
                      </div>
                    </div>

                    {colEditTag1 && colEditTag2 && (
                      <div className="space-y-2 pt-1 border-t border-zinc-800/50">
                        <div className="text-[10px] text-zinc-400">
                          Xem trước thẻ sẽ tạo:
                          <ul className="list-disc pl-4 space-y-0.5 mt-1 font-mono text-zinc-300">
                            <li>Thẻ 1 chiều: <strong className="text-emerald-400">{colEditTag1} {"->"} {colEditTag2}</strong></li>
                            <li>Thẻ 2 chiều: <strong className="text-emerald-400">{colEditTag1} {"<->"} {colEditTag2}</strong></li>
                          </ul>
                        </div>
                        
                        <div className="flex gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!colEditTag1 || !colEditTag2) return;
                              const newTag = `${colEditTag1} -> ${colEditTag2}`;
                              if (colEditTags.includes(newTag)) {
                                showToast('Thẻ này đã tồn tại trong danh sách!', 'error');
                              } else {
                                setColEditTags([...colEditTags, newTag]);
                                showToast(`Đã thêm: ${newTag}`, 'success');
                              }
                            }}
                            className="flex-1 py-1 px-2 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition-colors cursor-pointer"
                          >
                            Thêm 1 chiều {"(->)"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!colEditTag1 || !colEditTag2) return;
                              const newTag = `${colEditTag1} <-> ${colEditTag2}`;
                              if (colEditTags.includes(newTag)) {
                                showToast('Thẻ này đã tồn tại trong danh sách!', 'error');
                              } else {
                                setColEditTags([...colEditTags, newTag]);
                                showToast(`Đã thêm: ${newTag}`, 'success');
                              }
                            }}
                            className="flex-1 py-1 px-2 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition-colors cursor-pointer"
                          >
                            Thêm 2 chiều {"(<->)"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsColModalOpen(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-lg text-sm font-bold transition-all shadow-md cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        isOpen={isDeleteConfirmOpen}
        title="Xác nhận xóa chi tiết chiến dịch"
        message={`Bạn có chắc chắn muốn xóa chi tiết chiến dịch #${deleteId} này không? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
