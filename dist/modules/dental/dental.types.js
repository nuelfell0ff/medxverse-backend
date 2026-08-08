export var ToothStatus;
(function (ToothStatus) {
    ToothStatus["HEALTHY"] = "HEALTHY";
    ToothStatus["DECAYED"] = "DECAYED";
    ToothStatus["FILLED"] = "FILLED";
    ToothStatus["MISSING"] = "MISSING";
    ToothStatus["CROWNED"] = "CROWNED";
    ToothStatus["IMPLANT"] = "IMPLANT";
    ToothStatus["EXTRACTED"] = "EXTRACTED";
    ToothStatus["ROOT_CANAL_TREATED"] = "ROOT_CANAL_TREATED";
    ToothStatus["BRIDGE_ANCHOR"] = "BRIDGE_ANCHOR";
})(ToothStatus || (ToothStatus = {}));
export var ToothSurface;
(function (ToothSurface) {
    ToothSurface["MESIAL"] = "MESIAL";
    ToothSurface["DISTAL"] = "DISTAL";
    ToothSurface["OCCLUSAL"] = "OCCLUSAL";
    ToothSurface["INCISAL"] = "INCISAL";
    ToothSurface["FACIAL"] = "FACIAL";
    ToothSurface["BUCCAL"] = "BUCCAL";
    ToothSurface["LINGUAL"] = "LINGUAL";
})(ToothSurface || (ToothSurface = {}));
export var DentalProcedureType;
(function (DentalProcedureType) {
    DentalProcedureType["EXAMINATION"] = "EXAMINATION";
    DentalProcedureType["CLEANING_PROPHYLAXIS"] = "CLEANING_PROPHYLAXIS";
    DentalProcedureType["FILLING_RESTORATION"] = "FILLING_RESTORATION";
    DentalProcedureType["ROOT_CANAL_THERAPY"] = "ROOT_CANAL_THERAPY";
    DentalProcedureType["EXTRACTION"] = "EXTRACTION";
    DentalProcedureType["CROWN_BRIDGE"] = "CROWN_BRIDGE";
    DentalProcedureType["DENTAL_IMPLANT"] = "DENTAL_IMPLANT";
    DentalProcedureType["ORTHODONTIC_TREATMENT"] = "ORTHODONTIC_TREATMENT";
    DentalProcedureType["PERIODONTAL_SCALING"] = "PERIODONTAL_SCALING";
    DentalProcedureType["DENTAL_XRAY"] = "DENTAL_XRAY";
    DentalProcedureType["TEETH_WHITENING"] = "TEETH_WHITENING";
})(DentalProcedureType || (DentalProcedureType = {}));
export var ProcedureStatus;
(function (ProcedureStatus) {
    ProcedureStatus["PLANNED"] = "PLANNED";
    ProcedureStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ProcedureStatus["COMPLETED"] = "COMPLETED";
    ProcedureStatus["CANCELLED"] = "CANCELLED";
})(ProcedureStatus || (ProcedureStatus = {}));
