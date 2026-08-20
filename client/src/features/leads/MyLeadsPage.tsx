import React from 'react';
import { LeadListPage } from './LeadListPage';

export const MyLeadsPage: React.FC = () => {
  return <LeadListPage isMyLeads={true} />;
};

export default MyLeadsPage;
