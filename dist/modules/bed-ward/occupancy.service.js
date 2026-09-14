import { bedWardService } from './bed-ward.service.js';
export const occupancyService = {
    getDashboard: (hospitalId) => bedWardService.getDashboard(hospitalId),
};
