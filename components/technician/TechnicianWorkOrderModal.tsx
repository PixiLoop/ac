'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  Wrench,
  Camera,
  FileText,
  AlertTriangle,
  User,
  ShieldCheck,
  Calendar,
  Save,
  Check,
  Upload,
  Trash2,
  Eye,
  Maximize2,
  Download,
  Plus,
  Tag,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Paperclip,
} from 'lucide-react';
import { InstallationJob, ChecklistSection } from '../job-boards/types/installation';
import { useOperations } from '../../providers/OperationsContext';
import { AuthenticatedPhoto } from '../job-boards/operations/shared/AuthenticatedPhoto';

export interface WorkOrderPhoto {
  id: string;
  url: string; // Base64 Data URL or remote URL
  fileName?: string;
  category: string;
  timestamp: string;
  checklistItemId?: string;
  checklistItemTitle?: string;
  notes?: string;
}

const PHOTO_CATEGORIES = [
  'General Proof',
  'Unit Mounting',
  'Power & Fuse Tap',
  'GPS & Antenna',
  'CAN Bus / OBD',
  'Driver ID & Sensors',
  'Vehicle & Sign-off',
] as const;

interface TechnicianWorkOrderModalProps {
  job: InstallationJob;
  isOpen: boolean;
  onClose: () => void;
  technicianName: string;
}

const compressImageFile = (file: File, maxDimension = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        // Fallback to direct raw base64 if not an HTML image renderable
        resolve(event.target?.result as string);
      };
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const TechnicianWorkOrderModal: React.FC<TechnicianWorkOrderModalProps> = ({
  job,
  isOpen,
  onClose,
  technicianName,
}) => {
  const { toggleChecklistItem, changeJobStatus, getChecklistStats, uploadChecklistPhoto, deleteChecklistPhoto } =
    useOperations();
  const [activeTab, setActiveTab] = useState<'checklists' | 'hardware' | 'signoff'>('checklists');
  const [notes, setNotes] = useState(job.notes || '');
  const [signoffName, setSignoffName] = useState('Marcus Vance (Fleet Supervisor)');
  const [signedOff, setSignedOff] = useState(job.status === 'Completed');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Photo management state
  const [photos, setPhotos] = useState<WorkOrderPhoto[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [activePhotoCategory, setActivePhotoCategory] = useState<string>('Unit Mounting');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Lightbox preview modal state
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState<number | null>(null);

  // Target task association for photo capture
  const [targetTaskForPhoto, setTargetTaskForPhoto] = useState<{
    sectionId: string;
    itemId: string;
    itemTitle: string;
  } | null>(null);

  // Refs for hidden inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const taskCameraInputRef = useRef<HTMLInputElement>(null);

  // Storage key
  const storageKey = `technician_workorder_photos_${job.id}`;
  const signoffStorageKey = `technician_workorder_signoff_${job.id}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {

      // Check if job checklist items already have photos
      const existingChecklistPhotos: WorkOrderPhoto[] = [];
      if (job.checklistSections) {
        for (const sec of job.checklistSections) {
          for (const item of sec.items) {
            if (item.photos && item.photos.length > 0) {
              for (const p of item.photos) {
                existingChecklistPhotos.push({
                  id: p.id,
                  url: p.url,
                  fileName: p.fileName || 'Checklist Photo',
                  category: sec.hardwareModel ? `${sec.hardwareModel} Proof` : 'General Proof',
                  timestamp: new Date(p.createdAt || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  checklistItemId: item.id,
                  checklistItemTitle: item.title,
                });
              }
            }
          }
        }
      }

      if (existingChecklistPhotos.length > 0) {
        setPhotos((current) => {
          const map = new Map<string, WorkOrderPhoto>();
          for (const p of existingChecklistPhotos) {
            map.set(p.id, p);
          }
          for (const p of current) {
            if (!map.has(p.id)) {
              map.set(p.id, p);
            }
          }
          return Array.from(map.values());
        });
      } else {
        // Initial illustrative mock installation photos for this specific work order
        const initialMock: WorkOrderPhoto[] = [];
        setPhotos(initialMock);
      }

    } catch (e) {
      console.warn('Error loading photos from storage', e);
    }
  }, [job.id, job.checklistSections, storageKey, signoffStorageKey]);

  // Persist photos to state and localStorage whenever updated
  const savePhotos = useCallback(
    (updatedPhotos: WorkOrderPhoto[]) => {
      setPhotos(updatedPhotos);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updatedPhotos));
        } catch (e) {
          console.warn('Failed to persist photos to localStorage:', e);
        }
      }
    },
    [storageKey]
  );

  // Persist signoff details
  const saveSignoffData = useCallback(
    (notesVal: string, nameVal: string, signedVal: boolean) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            signoffStorageKey,
            JSON.stringify({
              notes: notesVal,
              signoffName: nameVal,
              signedOff: signedVal,
              updatedAt: new Date().toISOString(),
            })
          );
        } catch (e) {}
      }
    },
    [signoffStorageKey]
  );

  const renderThumbnail = (photoUrl: string, altText: string, imgClass: string) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('data:') || photoUrl.startsWith('blob:')) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={photoUrl} alt={altText} className={imgClass} />;
    }
    return <AuthenticatedPhoto src={photoUrl} alt={altText} className={imgClass} openOnClick={false} />;
  };

  if (!isOpen) return null;

  const stats = getChecklistStats(job);

  const handleToggleItem = async (sectionId: string, itemId: string, currentCompleted: boolean) => {
    await toggleChecklistItem(job.id, sectionId, itemId, !currentCompleted, '', technicianName);
    setSavedNotice('Checklist updated');
    setTimeout(() => setSavedNotice(null), 2000);
  };

  const handleStatusUpdate = async (newStatus: any) => {
    setIsUpdatingStatus(true);
    await changeJobStatus(
      job.id,
      newStatus,
      `Technician ${technicianName} transitioned job to ${newStatus}`,
      technicianName,
      true
    );
    if (newStatus === 'Completed') {
      setSignedOff(true);
      saveSignoffData(notes, signoffName, true);
    }
    setIsUpdatingStatus(false);
    setSavedNotice(`Job marked as ${newStatus}`);
    setTimeout(() => setSavedNotice(null), 2500);
  };

  /**
   * Process multiple uploaded or captured files
   */
  const processFiles = async (
    files: FileList | File[],
    overrideCategory?: string,
    associatedTask?: { sectionId: string; itemId: string; itemTitle: string } | null
  ) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const newPhotoList: WorkOrderPhoto[] = [];
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        const compressedBase64 = await compressImageFile(file, 1600, 0.85);
        const photoId = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const category =
          overrideCategory ||
          (associatedTask ? `Checklist: ${associatedTask.itemTitle}` : activePhotoCategory);

        // Determine which checklist item to attach this photo to
        let targetSectionId = associatedTask?.sectionId;
        let targetItemId = associatedTask?.itemId;
        let targetItemTitle = associatedTask?.itemTitle;

        if (!targetItemId && job.checklistSections && job.checklistSections.length > 0) {
          // Look for an item matching activePhotoCategory or fallback to first available item
          for (const sec of job.checklistSections) {
            for (const item of sec.items) {
              if (
                item.title.toLowerCase().includes(activePhotoCategory.toLowerCase()) ||
                sec.title.toLowerCase().includes(activePhotoCategory.toLowerCase())
              ) {
                targetSectionId = sec.id;
                targetItemId = item.id;
                targetItemTitle = item.title;
                break;
              }
            }
            if (targetItemId) break;
          }
          if (!targetItemId && job.checklistSections[0]?.items?.[0]) {
            targetSectionId = job.checklistSections[0].id;
            targetItemId = job.checklistSections[0].items[0].id;
            targetItemTitle = job.checklistSections[0].items[0].title;
          }
        }

        const newPhoto: WorkOrderPhoto = {
          id: photoId,
          url: compressedBase64,
          fileName: file.name,
          category,
          timestamp: timeFormatted,
          checklistItemId: targetItemId,
          checklistItemTitle: targetItemTitle,
        };

        newPhotoList.push(newPhoto);

        // Persist photo directly to backend checklist item so it is stored in database and Azure/local storage
        if (targetSectionId && targetItemId) {
          try {
            await uploadChecklistPhoto(job.id, targetSectionId, targetItemId, file);
          } catch (uploadErr) {
            console.warn('Backend checklist photo upload error:', uploadErr);
          }
        }
      } catch (err) {
        console.error('Failed to process image file:', err);
      }
    }

    if (newPhotoList.length > 0) {
      const updated = [...newPhotoList, ...photos];
      savePhotos(updated);
      setSavedNotice(
        `${newPhotoList.length} photo${newPhotoList.length > 1 ? 's' : ''} uploaded successfully`
      );
      setTimeout(() => setSavedNotice(null), 2500);
    }

    setIsUploading(false);
    setTargetTaskForPhoto(null);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files, undefined, targetTaskForPhoto);
      // Reset input value so same file can be re-selected if necessary
      e.target.value = '';
    }
  };

  const handleTaskPhotoTrigger = (sectionId: string, itemId: string, itemTitle: string) => {
    setTargetTaskForPhoto({ sectionId, itemId, itemTitle });
    // Open camera / file picker
    if (taskCameraInputRef.current) {
      taskCameraInputRef.current.click();
    }
  };

  const handleDeletePhoto = async (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const photoToDelete = photos.find((p) => p.id === photoId);
    if (photoToDelete?.checklistItemId) {
      for (const sec of job.checklistSections || []) {
        const item = sec.items.find((i) => i.id === photoToDelete.checklistItemId);
        if (item) {
          deleteChecklistPhoto(job.id, sec.id, item.id, photoId).catch(() => {});
          break;
        }
      }
    }
    const updated = photos.filter((p) => p.id !== photoId);
    savePhotos(updated);
    if (lightboxPhotoIndex !== null && lightboxPhotoIndex >= updated.length) {
      setLightboxPhotoIndex(updated.length > 0 ? updated.length - 1 : null);
    }
    setSavedNotice('Photo removed');
    setTimeout(() => setSavedNotice(null), 2000);
  };

  const handleChangePhotoCategory = (photoId: string, newCategory: string) => {
    const updated = photos.map((p) => (p.id === photoId ? { ...p, category: newCategory } : p));
    savePhotos(updated);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files, undefined, null);
    }
  };

  // Filtered photos for Tab 3
  const filteredPhotos =
    selectedCategoryFilter === 'All'
      ? photos
      : photos.filter((p) => p.category === selectedCategoryFilter);

  // Photos attached to a specific checklist item
  const getPhotosForItem = (itemId: string) => photos.filter((p) => p.checklistItemId === itemId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Hidden File Inputs for Functional Picture Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={taskCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {job.id}
              </span>
              <span className="font-mono text-xs font-medium text-slate-400">
                {job.jobNumber}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  job.status === 'Completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : job.status === 'Installed'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : job.status === 'Waiting Install'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {job.status}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{job.vehicle.rego}</span>
              <span className="text-slate-400 font-normal text-sm sm:text-base">
                • {job.vehicle.fleetNumber} ({job.vehicle.makeModel})
              </span>
            </h2>

            <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {job.customerName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {job.location}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-xs">
              <span className="font-bold text-slate-700">Checklist Progress:</span>{' '}
              {stats.total > 0 ? (
                <>
                  <span className="font-mono text-blue-600 font-bold">{stats.percent}%</span>{' '}
                  <span className="text-slate-500">
                    ({stats.completed}/{stats.total} tasks completed)
                  </span>
                </>
              ) : (
                <span className="text-slate-500 font-medium">No QA checklist tasks required</span>
              )}
            </div>
            {stats.total > 0 && (
              <div className="w-24 sm:w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
            )}
          </div>

          {/* Quick Status Action Buttons */}
          <div className="flex items-center gap-2">
            {job.status === 'Not Actioned' && (
              <button
                type="button"
                onClick={() => handleStatusUpdate('Waiting Install')}
                disabled={isUpdatingStatus}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Start Job
              </button>
            )}

            {job.status !== 'Installed' && job.status !== 'Completed' && (
              <button
                type="button"
                onClick={() => handleStatusUpdate('Installed')}
                disabled={isUpdatingStatus}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Mark Hardware Installed
              </button>
            )}

            {job.status !== 'Completed' && (
              <button
                type="button"
                onClick={() => handleStatusUpdate('Completed')}
                disabled={isUpdatingStatus}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Sign Off & Complete
              </button>
            )}

            {savedNotice && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 animate-in fade-in">
                {savedNotice}
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('checklists')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'checklists'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Checklist Execution {stats.total > 0 ? `(${stats.completed}/${stats.total})` : '(N/A)'}
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'hardware'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Hardware Components ({job.hardware.length})
          </button>
          <button
            onClick={() => setActiveTab('signoff')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'signoff'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Photos & Sign-off ({photos.length})
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">
          {/* TAB 1: CHECKLISTS */}
          {activeTab === 'checklists' && (
            <div className="space-y-4">
              {job.checklistSections.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No QA checklist tasks for this work order</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Standard installation requirements are verified upon completion.
                  </p>
                </div>
              ) : (
                job.checklistSections.map((sec) => (
                  <div
                    key={sec.id}
                    className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs"
                  >
                    <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {sec.title}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                        {sec.items.filter((i) => i.completed).length} / {sec.items.length} done
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 p-2">
                      {sec.items.map((it) => {
                        const itemPhotos = getPhotosForItem(it.id);

                        return (
                          <div
                            key={it.id}
                            className={`p-3 rounded-xl transition-all flex flex-col gap-2 ${
                              it.completed
                                ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleItem(sec.id, it.id, it.completed)}
                                className="mt-0.5 cursor-pointer focus:outline-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={it.completed}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer pointer-events-none"
                                />
                              </button>
                              <div
                                className="flex-1 text-xs cursor-pointer"
                                onClick={() => handleToggleItem(sec.id, it.id, it.completed)}
                              >
                                <p
                                  className={`font-semibold ${
                                    it.completed
                                      ? 'text-slate-900 line-through text-slate-400'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {it.title}
                                  {it.isRequired && (
                                    <span className="ml-1.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                                      Required
                                    </span>
                                  )}
                                </p>
                                {it.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{it.description}</p>
                                )}
                                {it.completed && it.completedBy && (
                                  <p className="text-[10px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Verified by {it.completedBy}
                                  </p>
                                )}
                              </div>

                              {/* Task Photo Button */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  title="Attach verification photo to this task"
                                  onClick={() => handleTaskPhotoTrigger(sec.id, it.id, it.title)}
                                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Camera className="w-3 h-3 text-slate-500" />
                                  <span>{itemPhotos.length > 0 ? itemPhotos.length : 'Attach'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Attached photos for this item */}
                            {itemPhotos.length > 0 && (
                              <div className="ml-7 flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                                {itemPhotos.map((photo, pIdx) => {
                                  const globalIdx = photos.findIndex((p) => p.id === photo.id);
                                  return (
                                    <div
                                      key={photo.id}
                                      onClick={() => setLightboxPhotoIndex(globalIdx >= 0 ? globalIdx : 0)}
                                      className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:ring-2 hover:ring-blue-500 transition-all"
                                    >
                                      {renderThumbnail(
                                        photo.url,
                                        photo.fileName || 'Proof',
                                        'w-full h-full object-cover'
                                      )}
                                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                        <Eye className="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: HARDWARE */}
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Allocated Hardware Units
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {job.hardware.map((hw) => (
                    <div
                      key={hw.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">{hw.model}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                            {hw.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{hw.name}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200 space-y-1 text-[11px] font-mono text-slate-500">
                        <div className="flex justify-between">
                          <span>Serial:</span>
                          <span className="font-bold text-slate-800">{hw.serialNumber || 'TBD'}</span>
                        </div>
                        {hw.imei && (
                          <div className="flex justify-between">
                            <span>IMEI:</span>
                            <span className="font-bold text-slate-800">{hw.imei}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SIGNOFF & PHOTOS */}
          {activeTab === 'signoff' && (
            <div className="space-y-5">
              {/* Functional Photo Upload Card */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                  isDragging
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30'
                    : 'border-slate-200/90'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Installation Photos & QA Proof
                      </h3>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Take or upload proof of telematics mount, power wiring, antennas & finished dash.
                    </p>
                  </div>

                  {/* Dual Action: Camera vs File Browse */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetTaskForPhoto(null);
                        cameraInputRef.current?.click();
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetTaskForPhoto(null);
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-slate-600" />
                      Upload Photos
                    </button>
                  </div>
                </div>

                {/* Upload Status Indicator */}
                {isUploading && (
                  <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 flex items-center gap-2 text-xs animate-pulse">
                    <Clock className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Processing and compressing photo proof...</span>
                  </div>
                )}

                {/* Category Filter Pills & Tagging Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('All')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategoryFilter === 'All'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({photos.length})
                  </button>
                  {PHOTO_CATEGORIES.map((cat) => {
                    const count = photos.filter((p) => p.category === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          selectedCategoryFilter === cat
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat} {count > 0 && `(${count})`}
                      </button>
                    );
                  })}
                </div>

                {/* Photos Grid */}
                {filteredPhotos.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-400">
                      <Camera className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">No photos in this category yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click to browse or drop images here, or tap 'Take Photo' on your mobile device.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredPhotos.map((photo, idx) => {
                      const globalIdx = photos.findIndex((p) => p.id === photo.id);

                      return (
                        <div
                          key={photo.id}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square shadow-2xs hover:shadow-md transition-all flex flex-col justify-end"
                        >
                          {renderThumbnail(
                            photo.url,
                            photo.fileName || 'Installation photo',
                            'absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
                          )}

                          {/* Gradient overlay for text legibility */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

                          {/* Top Badges */}
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white border border-white/20">
                              {photo.category}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeletePhoto(photo.id, e)}
                              className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                              title="Delete photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Hover action overlay center */}
                          <div
                            onClick={() => setLightboxPhotoIndex(globalIdx >= 0 ? globalIdx : 0)}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/30 cursor-pointer"
                          >
                            <span className="px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-xs text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-lg transform -translate-y-1 group-hover:translate-y-0 transition-transform">
                              <Maximize2 className="w-3.5 h-3.5" />
                              Inspect
                            </span>
                          </div>

                          {/* Bottom Info Bar */}
                          <div className="relative p-2 text-white pointer-events-none">
                            <p className="text-[11px] font-medium truncate drop-shadow-xs">
                              {photo.fileName || `Photo #${idx + 1}`}
                            </p>
                            <p className="text-[9px] text-slate-300 flex items-center justify-between">
                              <span>{photo.timestamp}</span>
                              {photo.checklistItemTitle && (
                                <span className="truncate max-w-[100px] text-blue-300">
                                  ✓ Task linked
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Technician Field Notes */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Technician Installation Notes
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      saveSignoffData(notes, signoffName, signedOff);
                      setSavedNotice('Notes saved');
                      setTimeout(() => setSavedNotice(null), 2000);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    Save Notes
                  </button>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    saveSignoffData(e.target.value, signoffName, signedOff);
                  }}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                  placeholder="Notes on wiring routing, fuse box location, dash mounting, or special vehicle observations..."
                />
              </div>

              {/* Sign-off confirmation */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Customer / Supervisor Sign-off
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Sign-off Representative Name
                    </label>
                    <input
                      type="text"
                      value={signoffName}
                      onChange={(e) => {
                        setSignoffName(e.target.value);
                        saveSignoffData(notes, e.target.value, signedOff);
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Installer Confirmation
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${technicianName} (Field Certified)`}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 text-slate-600 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="signoff-check"
                    checked={signedOff}
                    onChange={(e) => {
                      setSignedOff(e.target.checked);
                      saveSignoffData(notes, signoffName, e.target.checked);
                    }}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="signoff-check"
                    className="text-xs text-slate-700 font-medium cursor-pointer"
                  >
                    I confirm the telematics hardware has been installed, harness secured, and telemetry confirmed.
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Field Work Order • Auto-synced with Office Dispatch</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                handleStatusUpdate('Completed');
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save & Complete Job
            </button>
          </div>
        </div>
      </div>

      {/* LIGHTBOX FULLSCREEN PREVIEW MODAL */}
      {lightboxPhotoIndex !== null && photos[lightboxPhotoIndex] && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150">
          {/* Top Bar */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-600">
                {photos[lightboxPhotoIndex].category}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {photos[lightboxPhotoIndex].fileName || `Photo ${lightboxPhotoIndex + 1}`}
              </span>
              <span className="text-xs text-slate-400">
                • {photos[lightboxPhotoIndex].timestamp}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={photos[lightboxPhotoIndex].url}
                download={photos[lightboxPhotoIndex].fileName || `job-${job.id}-photo.jpg`}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Download photo"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => handleDeletePhoto(photos[lightboxPhotoIndex].id)}
                className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors cursor-pointer"
                title="Delete photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxPhotoIndex(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Photo Display & Navigation */}
          <div className="relative max-w-5xl max-h-[75vh] w-full flex items-center justify-center overflow-hidden">
            {renderThumbnail(
              photos[lightboxPhotoIndex].url,
              photos[lightboxPhotoIndex].fileName || 'Installation Proof',
              'max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10'
            )}

            {/* Left Nav Button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxPhotoIndex((prev) =>
                    prev !== null ? (prev - 1 + photos.length) % photos.length : 0
                  )
                }
                className="absolute left-2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors border border-white/20 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Right Nav Button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxPhotoIndex((prev) =>
                    prev !== null ? (prev + 1) % photos.length : 0
                  )
                }
                className="absolute right-2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors border border-white/20 cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Bar: Category changer & Notes */}
          <div className="w-full max-w-5xl mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Reassign Category:</span>
              <select
                value={photos[lightboxPhotoIndex].category}
                onChange={(e) =>
                  handleChangePhotoCategory(photos[lightboxPhotoIndex].id, e.target.value)
                }
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PHOTO_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-400 font-mono">
              Photo {lightboxPhotoIndex + 1} of {photos.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
