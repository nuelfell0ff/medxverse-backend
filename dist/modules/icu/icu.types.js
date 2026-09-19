export var CareLevel;
(function (CareLevel) {
    CareLevel["LEVEL_1_HIGH_DEPENDENCY"] = "LEVEL_1_HIGH_DEPENDENCY";
    CareLevel["LEVEL_2_ICU"] = "LEVEL_2_ICU";
    CareLevel["LEVEL_3_CRITICAL"] = "LEVEL_3_CRITICAL";
})(CareLevel || (CareLevel = {}));
export var ICUCaseStatus;
(function (ICUCaseStatus) {
    ICUCaseStatus["ADMITTED"] = "ADMITTED";
    ICUCaseStatus["STABILIZED"] = "STABILIZED";
    ICUCaseStatus["TRANSFERRED_OUT"] = "TRANSFERRED_OUT";
    ICUCaseStatus["DISCHARGED"] = "DISCHARGED";
    ICUCaseStatus["DECEASED"] = "DECEASED";
})(ICUCaseStatus || (ICUCaseStatus = {}));
export var VentilatorMode;
(function (VentilatorMode) {
    VentilatorMode["NONE"] = "NONE";
    VentilatorMode["AC"] = "AC";
    VentilatorMode["SIMV"] = "SIMV";
    VentilatorMode["PSV"] = "PSV";
    VentilatorMode["CPAP"] = "CPAP";
    VentilatorMode["BIPAP"] = "BIPAP";
    VentilatorMode["HIGH_FLOW_NASAL"] = "HIGH_FLOW_NASAL";
})(VentilatorMode || (VentilatorMode = {}));
export var ICUDeviceType;
(function (ICUDeviceType) {
    ICUDeviceType["MONITOR"] = "MONITOR";
    ICUDeviceType["VENTILATOR"] = "VENTILATOR";
    ICUDeviceType["INFUSION_PUMP"] = "INFUSION_PUMP";
    ICUDeviceType["OTHER"] = "OTHER";
})(ICUDeviceType || (ICUDeviceType = {}));
export var DeviceProtocol;
(function (DeviceProtocol) {
    DeviceProtocol["HL7"] = "HL7";
    DeviceProtocol["IEEE_11073"] = "IEEE_11073";
    DeviceProtocol["VENDOR_API"] = "VENDOR_API";
    DeviceProtocol["FHIR"] = "FHIR";
    DeviceProtocol["MANUAL"] = "MANUAL";
})(DeviceProtocol || (DeviceProtocol = {}));
export var ReadingQuality;
(function (ReadingQuality) {
    ReadingQuality["VALID"] = "VALID";
    ReadingQuality["SUSPECT"] = "SUSPECT";
    ReadingQuality["INVALID"] = "INVALID";
    ReadingQuality["DEVICE_OFFLINE"] = "DEVICE_OFFLINE";
})(ReadingQuality || (ReadingQuality = {}));
export var FlowEntrySource;
(function (FlowEntrySource) {
    FlowEntrySource["DEVICE"] = "DEVICE";
    FlowEntrySource["MANUAL"] = "MANUAL";
    FlowEntrySource["DERIVED"] = "DERIVED";
})(FlowEntrySource || (FlowEntrySource = {}));
export var ICUScoreType;
(function (ICUScoreType) {
    ICUScoreType["SOFA"] = "SOFA";
    ICUScoreType["APACHE_II"] = "APACHE_II";
})(ICUScoreType || (ICUScoreType = {}));
export var ICUScoreStatus;
(function (ICUScoreStatus) {
    ICUScoreStatus["COMPLETE"] = "COMPLETE";
    ICUScoreStatus["PARTIAL"] = "PARTIAL";
})(ICUScoreStatus || (ICUScoreStatus = {}));
