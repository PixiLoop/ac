'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { InstallationJob } from '../../types/installation';
import { ScheduleBadge, JobSourceBadge, getJobSource } from './StatusBadge';
import { ChecklistProgress } from './ChecklistProgress';
import { AuthenticatedPhoto } from './AuthenticatedPhoto';
import {
  MapPin,
  User,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  MessageSquare,
  Paperclip,
  Eye,
  X,
  ArrowLeftCircle
} from 'lucide-react';
import { useOperations } from '../../../../providers/OperationsContext';
import { useRouter } from 'next/navigation';

interface JobScheduleCardProps {
  job: InstallationJob;
  onClick?: () => void;
  onScheduleClick?: () => void;
  className?: string;
  /** Hide status pill (board columns already show status). */
  hideStatus?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

type ChecklistPhoto = { id: string; url: string; fileName?: string; createdAt: string };

function collectChecklistMedia(job: InstallationJob) {
  const photos: ChecklistPhoto[] = [];
  let commentCount = 0;

  for (const section of job.checklistSections || []) {
    for (const item of section.items || []) {
      if (item.photos?.length) {
        for (const photo of item.photos) {
          if (photo?.url) photos.push(photo);
        }
      }
      if (item.comments?.length) {
        commentCount += item.comments.length;
      } else if (item.notes?.trim()) {
        commentCount += 1;
      }
    }
  }

  photos.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return {
    coverPhoto: photos[0] || null,
    photos,
    photoCount: photos.length,
    commentCount,
  };
}

function ChecklistPhotoLightbox({
  jobId,
  photos,
  startIndex,
  onClose,
}: {
  jobId: string;
  photos: ChecklistPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [mounted, setMounted] = useState(false);
  const photo = photos[index];

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && photos.length > 1) {
        setIndex((i) => (i + 1) % photos.length);
      }
      if (e.key === 'ArrowLeft' && photos.length > 1) {
        setIndex((i) => (i - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, photos.length]);

  if (!mounted || !photo) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${jobId} checklist photos`}
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 text-white shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{jobId}</p>
          <p className="text-xs text-white/70 truncate">
            {photo.fileName || 'Checklist photo'}
            {photos.length > 1 ? ` · ${index + 1} / ${photos.length}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="relative flex-1 flex items-center justify-center px-2 sm:px-10 pb-6 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
            className="absolute left-2 sm:left-4 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="w-full max-w-6xl h-full max-h-[calc(100vh-7rem)] flex items-center justify-center">
          <AuthenticatedPhoto
            src={photo.url}
            alt={photo.fileName || `${jobId} photo ${index + 1}`}
            className="w-full h-full max-h-[calc(100vh-7rem)] object-contain rounded-lg shadow-2xl bg-black/20"
            openOnClick={false}
          />
        </div>

        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % photos.length)}
            className="absolute right-2 sm:right-4 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white"
            aria-label="Next photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

export const JobScheduleCard: React.FC<JobScheduleCardProps> = ({
  job,
  onClick,
  onScheduleClick,
  className = '',
  hideStatus = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
}) => {
  const router = useRouter();
  const { getChecklistStats, technicians } = useOperations();
  const stats = getChecklistStats(job);
  const media = useMemo(() => collectChecklistMedia(job), [job]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const tech = job.technicianId
    ? technicians.find((t) => t.id === job.technicianId)
    : undefined;
  const techName =
    (job.technicianName && job.technicianName !== job.technicianId
      ? job.technicianName
      : undefined) ||
    tech?.displayName ||
    `${tech?.firstName ?? ''} ${tech?.lastName ?? ''}`.trim() ||
    undefined;

  const handleClick = () => {
    if (isDragging || lightboxOpen) return;
    if (onClick) {
      onClick();
    } else {
      router.push(`/job-boards/job/${job.id}`);
    }
  };

  const openLightbox = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!media.photos.length) return;
    setLightboxOpen(true);
  };

  return (
    <>
      <div
        draggable={draggable && !lightboxOpen}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        className={`group bg-white rounded-lg border shadow-xs hover:shadow-sm transition-all relative overflow-hidden flex flex-col justify-between min-w-0 ${isDragging
          ? 'opacity-40 border-dashed border-blue-500 scale-[0.98] cursor-grabbing shadow-inner'
          : draggable
            ? 'border-slate-200/90 hover:border-blue-400/80 cursor-grab active:cursor-grabbing'
            : 'border-slate-200/90 hover:border-blue-400/80 cursor-pointer'
          } ${className}`}
      >
        {/* Cover image from latest checklist photo */}
        {media.coverPhoto && (
          <div className="relative w-full aspect-[16/9] bg-slate-100 overflow-hidden border-b border-slate-100 group/cover">
            <AuthenticatedPhoto
              src={media.coverPhoto.url}
              alt={media.coverPhoto.fileName || `${job.id} checklist photo`}
              className="w-full h-full object-cover"
              openOnClick={false}
            />

            {/* Hover eye — open full-width lightbox */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/cover:bg-black/35 transition-colors pointer-events-none group-hover/cover:pointer-events-auto">
              <button
                type="button"
                onClick={openLightbox}
                onMouseDown={(e) => e.stopPropagation()}
                className="opacity-0 group-hover/cover:opacity-100 scale-90 group-hover/cover:scale-100 transition-all inline-flex items-center justify-center w-10 h-10 rounded-full bg-white text-slate-800 shadow-lg hover:bg-blue-600 hover:text-white"
                title="View photos"
                aria-label="View checklist photos"
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>

            {media.photoCount > 1 && (
              <span className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-black/55 text-white pointer-events-none">
                +{media.photoCount - 1}
              </span>
            )}
          </div>
        )}

        <div
          className={`absolute top-0 left-0 right-0 h-1 z-10 ${job.status === 'Completed'
            ? 'bg-teal-500'
            : job.status === 'Installed'
              ? 'bg-emerald-500'
              : job.status === 'Waiting Install'
                ? 'bg-blue-500'
                : job.status === 'Workshop Setup'
                  ? 'bg-amber-500'
                  : 'bg-slate-300'
            }`}
        />

        <div className="min-w-0 p-2">
          <div className="flex items-start justify-between gap-1.5 mb-1 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 min-w-0 flex-wrap">
                <span className="font-mono text-[11px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {job.id}
                </span>
                <ScheduleBadge isScheduled={job.isScheduled} className="shrink-0 !text-[9px] !px-1.5 !py-0" />
                <JobSourceBadge source={getJobSource(job)} size="xs" />
              </div>
              <h4 className="text-[11px] font-semibold text-slate-800 truncate mt-0.5 leading-snug">
                {job.customerName}
              </h4>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!hideStatus && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 max-w-[72px] truncate">
                  {job.status}
                </span>
              )}
              {draggable && (
                <span
                  title="Drag to change status"
                  className="text-slate-300 group-hover:text-slate-500 transition-colors p-0.5"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </div>

          <div className="space-y-0.5 my-1.5 text-[10px] text-slate-600 min-w-0 leading-snug">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <ArrowLeftCircle className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">
                {job.assignedTo === "technician" && "Technician"}
                {job.assignedTo === "contractor" && "Contractor"}
                {job.assignedTo === "subcontractor" && "Sub-Contractor"}
              </span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <User className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-700 truncate">
                {techName || <span className="text-amber-600 italic">Unassigned</span>}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1 text-slate-600 whitespace-nowrap">
                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{job.installationDate ? job.installationDate : 'Not Scheduled'}</span>
              </div>
              {job.startTime && job.endTime && (
                <div className="flex items-center gap-1 text-slate-600 whitespace-nowrap">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>
                    {job.startTime} – {job.endTime}
                  </span>
                </div>
              )}
            </div>
          </div>

          {job.hardware.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mb-1.5">
              {job.hardware.slice(0, 2).map((hw) => (
                <span
                  key={hw.id}
                  className="text-[9px] font-medium bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-200 truncate max-w-full"
                >
                  {hw.model}
                </span>
              ))}
              {job.hardware.length > 2 && (
                <span className="text-[9px] font-medium bg-slate-50 text-slate-500 px-1 py-0.5 rounded">
                  +{job.hardware.length - 2}
                </span>
              )}
            </div>
          )}

          <div className="pt-1.5 border-t border-slate-100 min-w-0">
            <ChecklistProgress stats={stats} compact={true} />

            <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-1 text-[10px] text-slate-500 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {(media.commentCount > 0 || media.photoCount > 0) && (
                  <>
                    {media.commentCount > 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 text-slate-600 font-medium"
                        title={`${media.commentCount} checklist comment${media.commentCount === 1 ? '' : 's'}`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        {media.commentCount}
                      </span>
                    )}
                    {media.photoCount > 0 && (
                      <button
                        type="button"
                        onClick={openLightbox}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-slate-600 font-medium hover:text-blue-600"
                        title={`${media.photoCount} checklist photo${media.photoCount === 1 ? '' : 's'}`}
                      >
                        <Paperclip className="w-3 h-3" />
                        {media.photoCount}
                      </button>
                    )}
                  </>
                )}
                <span className="truncate min-w-0">
                  {job.vehicle.rego} • {job.vehicle.fleetNumber}
                </span>
              </div>
              <div className="flex items-center text-blue-600 font-medium shrink-0">
                Details
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && media.photos.length > 0 && (
        <ChecklistPhotoLightbox
          jobId={job.id}
          photos={media.photos}
          startIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
};
