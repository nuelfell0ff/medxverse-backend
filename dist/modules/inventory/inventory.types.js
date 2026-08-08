export var InventoryCategory;
(function (InventoryCategory) {
    InventoryCategory["MEDICAL_SUPPLIES"] = "MEDICAL_SUPPLIES";
    InventoryCategory["CONSUMABLES"] = "CONSUMABLES";
    InventoryCategory["EQUIPMENT"] = "EQUIPMENT";
    InventoryCategory["PHARMACEUTICALS"] = "PHARMACEUTICALS";
    InventoryCategory["LAB_REAGENTS"] = "LAB_REAGENTS";
})(InventoryCategory || (InventoryCategory = {}));
export var PurchaseOrderStatus;
(function (PurchaseOrderStatus) {
    PurchaseOrderStatus["DRAFT"] = "DRAFT";
    PurchaseOrderStatus["ORDERED"] = "ORDERED";
    PurchaseOrderStatus["PARTIALLY_RECEIVED"] = "PARTIALLY_RECEIVED";
    PurchaseOrderStatus["RECEIVED"] = "RECEIVED";
    PurchaseOrderStatus["CANCELLED"] = "CANCELLED";
})(PurchaseOrderStatus || (PurchaseOrderStatus = {}));
export var EquipmentStatus;
(function (EquipmentStatus) {
    EquipmentStatus["OPERATIONAL"] = "OPERATIONAL";
    EquipmentStatus["UNDER_MAINTENANCE"] = "UNDER_MAINTENANCE";
    EquipmentStatus["OUT_OF_SERVICE"] = "OUT_OF_SERVICE";
    EquipmentStatus["RETIRED"] = "RETIRED";
})(EquipmentStatus || (EquipmentStatus = {}));
