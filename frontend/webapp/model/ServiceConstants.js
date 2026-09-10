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
 *   img    — OPTIONAL. Path to an SVG used on the tile instead of the font
 *            glyph, for categories the SAP icon font cannot express (it has
 *            no animal of any kind). `icon` must still be set: the compact
 *            surfaces — task category filter, Post Task select, onboarding
 *            chips, a helper's own picker — render an icon, not an image.
 */
sap.ui.define([], function () {
    "use strict";

    return [
        { name: "Cleaning",    icon: "sap-icon://home-share",        key: "serviceCleaning",   color: "#a7f3d0", is_hero: true, img: "img/cleaning.svg" },
        { name: "Gardening",   icon: "sap-icon://tree",              key: "serviceGardening",  color: "#bbf7d0", is_hero: false, img: "img/gardening.svg" },
        { name: "Handyman",    icon: "sap-icon://wrench",            key: "serviceHandyman",   color: "#e2e8f0", is_hero: true  },
        { name: "Elder Care",  icon: "sap-icon://heart",             key: "serviceElderCare",  color: "#fde68a", is_hero: false, img: "img/eldercare.svg" },
        { name: "Nanny",       icon: "sap-icon://family-care",       key: "serviceNanny",      color: "#fecdd3", is_hero: false, img: "img/nanny.svg" },
        { name: "Pet Care",    icon: "sap-icon://nutrition-activity", key: "servicePetCare",    color: "#fbcfe8", is_hero: false, img: "img/pet.svg" },
        { name: "Transport",   icon: "sap-icon://car-rental",        key: "serviceTransport",  color: "#bfdbfe", is_hero: true  },
        { name: "Groceries",   icon: "sap-icon://basket",            key: "serviceGroceries",  color: "#ddd6fe", is_hero: false, img: "img/groceries.svg" },
        { name: "Cooking",     icon: "sap-icon://meal",              key: "serviceCooking",    color: "#fed7aa", is_hero: false },
        { name: "Moving",      icon: "sap-icon://shipping-status",   key: "serviceMoving",     color: "#e0f2fe", is_hero: false },
        { name: "Tutoring",    icon: "sap-icon://education",         key: "serviceTutoring",   color: "#fef9c3", is_hero: false },
        // Catch-all for requests that fit none of the above. Always last so it
        // reads as a fallback rather than a peer of the real categories.
        { name: "Other",       icon: "sap-icon://puzzle",            key: "serviceOther",      color: "#e5e7eb", is_hero: false }
    ];
});
