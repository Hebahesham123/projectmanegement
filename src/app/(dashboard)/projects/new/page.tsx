'use client';

import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { useI18n } from '@/lib/i18n/LanguageProvider';

export default function NewProjectPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('project.new')}</h1>
      <Card>
        <CardHeader><CardTitle>{t('project.new')}</CardTitle></CardHeader>
        <CardBody><ProjectForm /></CardBody>
      </Card>
    </div>
  );
}
