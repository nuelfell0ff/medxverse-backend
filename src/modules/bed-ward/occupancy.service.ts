import { bedWardService } from './bed-ward.service.js';

export const occupancyService = {
  getDashboard: (hospitalId: string) => bedWardService.getDashboard(hospitalId),
};
