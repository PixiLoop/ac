'use client';

import { use } from 'react';
import { FMInstallFormPage } from '../../../components/fm-install/forms/FMInstallFormPage';

export default function Page({ params }: { params: { id: string } }) {
  return <FMInstallFormPage installId={params.id} />;
}