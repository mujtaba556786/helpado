/**
 * ServiceConstants.js — Frontend-only service catalogue.
 *
 * This is the single source of truth for service categories in Helpado.
 * No backend fetch needed — everything is defined here.
 *
 * Fields:
 *   name   — API/DB category key (English, never translated — sent to backend as-is)
 *   icon   — SAP UI5 sap-icon:// URI
 *   key    — i18n resource bundle key for the localised display label
 *   color  — tile background colour
 *   is_hero — show "Popular" badge
 */
sap.ui.define([], function () {
    "use strict";

    return [
        { name: "Cleaning",    icon: "sap-icon://home-share",        key: "serviceCleaning",   color: "#a7f3d0", is_hero: true  },
        { name: "Gardening",   icon: "sap-icon://tree",              key: "serviceGardening",  color: "#bbf7d0", is_hero: false },
        { name: "Handyman",    icon: "sap-icon://wrench",            key: "serviceHandyman",   color: "#e2e8f0", is_hero: true  },
        { name: "Elder Care",  icon: "sap-icon://heart",             key: "serviceElderCare",  color: "#fde68a", is_hero: false },
        { name: "Pet Care",    icon: "sap-icon://customer",          key: "servicePetCare",    color: "#fbcfe8", is_hero: false },
        { name: "Transport",   icon: "sap-icon://car-rental",        key: "serviceTransport",  color: "#bfdbfe", is_hero: true  },
        { name: "Groceries",   icon: "sap-icon://basket",            key: "serviceGroceries",  color: "#ddd6fe", is_hero: false },
        { name: "Cooking",     icon: "sap-icon://meal",              key: "serviceCooking",    color: "#fed7aa", is_hero: false },
        { name: "Moving",      icon: "sap-icon://shipping-status",   key: "serviceMoving",     color: "#e0f2fe", is_hero: false },
        { name: "Tutoring",    icon: "sap-icon://education",         key: "serviceTutoring",   color: "#fef9c3", is_hero: false }
    ];
});
