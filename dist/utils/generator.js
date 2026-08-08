/**
 * Generates a unique Medical Record Number (MRN) for walk-in patients.
 * Format: PAT-YYYY-XXXXX (e.g., PAT-2026-48192)
 */
export const generateMRN = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `PAT-${year}-${random}`;
};
/**
 * Generates a unique OPD Visit Number for outpatient check-ins.
 * Format: OPD-YYYYMMDD-XXXX (e.g., OPD-20260805-4921)
 */
export const generateOPDVisitNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `OPD-${year}${month}${day}-${random}`;
};
/**
 * Generates a unique Pre-Authorization code for HMO requests.
 * Format: PA-YYYY-XXXXX (e.g., PA-2026-91024)
 */
export const generatePreAuthCode = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `PA-${year}-${random}`;
};
/**
 * Generates a unique Claim Reference ID for insurance billing.
 * Format: CLM-YYYYMM-XXXXX (e.g., CLM-202608-57381)
 */
export const generateClaimRef = () => {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const random = Math.floor(10000 + Math.random() * 90000);
    return `CLM-${yearMonth}-${random}`;
};
/**
 * Generates a staff badge/employee code for hospital or HMO staff.
 * Format: PREFIX-XXXX (e.g., DOC-8391, NRS-4021)
 */
export const generateStaffCode = (prefix = 'STAFF') => {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix.toUpperCase()}-${random}`;
};
