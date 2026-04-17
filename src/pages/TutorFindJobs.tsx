import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import BrowseJobs from './BrowseJobs';

export default function TutorFindJobs() {
  return (
    <TutorSidebarLayout title="Find Jobs">
      <BrowseJobs embedded />
    </TutorSidebarLayout>
  );
}
