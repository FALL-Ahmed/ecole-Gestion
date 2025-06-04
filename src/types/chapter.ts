
export interface Chapter {
  id: number;
  title: string;
  description: string;
  subject: string;
  class: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: 'planned' | 'in-progress' | 'completed';
  materials?: number;
}
