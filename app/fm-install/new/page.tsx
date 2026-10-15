'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; 
import { FMInstallFormPage } from '../../../components/fm-install/forms/FMInstallFormPage';

function Inner() {
  const params = useSearchParams();
  const preinstallId = params.get('preinstallId') ?? undefined;
  return <FMInstallFormPage preinstallId={preinstallId} />;
}

export default function Page() {
  return <Suspense><Inner /></Suspense>;
}