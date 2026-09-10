sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";

    return {
        createDeviceModel: function () {
            // NB: phone-mode is also force-applied in Component.init (deviceready +
            // narrow-viewport) because UI5's detection is unreliable in the Cordova APK.
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        createAppDataModel: function () {
    return new JSONModel({
        isLoggedIn: false,
        // Today at midnight — used as minDate on date pickers so only today/future
        // dates can be picked (no past dates for tasks/bookings).
        today: new Date(new Date().setHours(0, 0, 0, 0)),
        // Brand artwork. Resolved through the module path rather than written as a
        // relative src in the view, because the view is also loaded from
        // test/integration/, where "img/..." would resolve against the wrong folder.
        logoUrl: sap.ui.require.toUrl("helphub/img/logo.svg"),
        sceneUrl: sap.ui.require.toUrl("helphub/img/neighbourhood.svg"),
        user: {
            id: "",
            name: "",
            email: "",
            avatar: "👤",
            initials: "",
            photo: "",

            // provider profile
            bio: "",
            rate: 0,
            currency: "EUR",
            serviceCategories: [],
            availability: [],
            years: 0,
            languages: "",
            phone: "",

            // structured address
            address: {
                street: "",
                houseNumber: "",
                city: "",
                state: "",
                postalCode: "",
                country: ""
            },

            // geo location (set on GPS fix or default Berlin)
            location: { lat: 52.52, lng: 13.405 },

            // availability chip flags (UI state)
            availabilityFlags: {
                all_day: false,
                weekdays: false,
                weekends: false,
                morning: false,
                afternoon: false,
                evening: false,
                night: false
            }
        },
        // country/state dropdowns
        countries: [],
        stateOptions: [],
        validation: {
            street: "None", houseNumber: "None", city: "None",
            state: "None", postalCode: "None", country: "None", name: "None"
        },
        mode: "find",
        selectedCategoryName: "",

        services: [
            // Home
            { id: "1",  name: "Cleaning",       icon: "sap-icon://home-share",      color: "#a7f3d0", sector: "Home"      },
            { id: "2",  name: "Gardening",       icon: "sap-icon://tree",             color: "#bbf7d0", sector: "Home"      },
            { id: "3",  name: "Handyman",        icon: "sap-icon://wrench",           color: "#e2e8f0", sector: "Home"      },
            // Care
            { id: "4",  name: "Babysitting",     icon: "sap-icon://group",            color: "#fecdd3", sector: "Care"      },
            { id: "5",  name: "Elder Care",      icon: "sap-icon://heart",            color: "#fde68a", sector: "Care"      },
            { id: "6",  name: "Pet Care",        icon: "sap-icon://customer",         color: "#fbcfe8", sector: "Care"      },
            // Transport
            { id: "7",  name: "Transport",       icon: "sap-icon://car-rental",       color: "#bfdbfe", sector: "Transport" },
            { id: "8",  name: "Groceries",       icon: "sap-icon://basket",           color: "#ddd6fe", sector: "Transport" },
            // Wellness
            { id: "9",  name: "Cooking",         icon: "sap-icon://meal",             color: "#fed7aa", sector: "Wellness"  },
            { id: "10", name: "Massage",         icon: "sap-icon://physical-activity",color: "#e9d5ff", sector: "Wellness"  },
            // Skills
            { id: "11", name: "Math Tuition",    icon: "sap-icon://education",        color: "#fef9c3", sector: "Skills"    },
            { id: "12", name: "IT Support",      icon: "sap-icon://laptop",           color: "#e0e7ff", sector: "Skills"    }
        ],

        providers: [
            {
                id: "p1",
                name: "Sarah Martinez",
                serviceType: "Gardening",
                rating: 4.9,
                rate: 25,
                currency: "USD",
                lat: 52.5250,
                lng: 13.4100,
                address: "Invalidenstrasse 12, 10115 Berlin (Mitte)",
                availability: "Available Now",
                years: 3,
                languages: "EN, DE",
                tags: ["Eco-friendly", "Tools included"],
                hobbies: "Urban gardening, plant care workshops, weekend hikes",
                photo: "https://randomuser.me/api/portraits/women/65.jpg",
                reviews: [
                    { user: "Max T.",   stars: 5, comment: "Our garden looks amazing now, very professional." },
                    { user: "Laura S.", stars: 5, comment: "On time, friendly and full of ideas for small spaces." },
                    { user: "David R.", stars: 4, comment: "Great results, communication could be a bit faster." }
                ]
            },
            {
                id: "p2",
                name: "Emma Johnson",
                serviceType: "Babysitting",
                rating: 5.0,
                rate: 20,
                currency: "USD",
                lat: 52.5100,
                lng: 13.3900,
                address: "Skalitzer Strasse 88, 10997 Berlin (Kreuzberg)",
                availability: "Tomorrow 9 AM",
                years: 5,
                languages: "EN",
                tags: ["First aid", "Evenings", "Non-smoker"],
                hobbies: "Reading stories, outdoor play, baking cookies with kids",
                photo: "https://randomuser.me/api/portraits/women/44.jpg",
                reviews: [
                    { user: "Anna K.",   stars: 5, comment: "Very reliable, our kids love her and feel safe." },
                    { user: "Jonas M.",  stars: 4, comment: "On time and friendly, flexible with our schedule." },
                    { user: "Marta L.",  stars: 5, comment: "Prepared activities, not just screen time." }
                ]
            },
            {
                id: "p3",
                name: "Raj Patel",
                serviceType: "Cooking",
                rating: 4.8,
                rate: 30,
                currency: "USD",
                lat: 52.5155,
                lng: 13.4020,
                address: "Sonnenallee 210, 12059 Berlin (Neukölln)",
                availability: "Weekend evenings",
                years: 7,
                languages: "EN, HI",
                tags: ["Indian cuisine", "Meal prep", "Vegetarian-friendly"],
                hobbies: "Experimenting with new recipes, food photography, food blogging",
                photo: "https://randomuser.me/api/portraits/men/29.jpg",
                reviews: [
                    { user: "Felix G.",  stars: 5, comment: "Authentic Indian food, super tasty and well presented." },
                    { user: "Sara P.",   stars: 4, comment: "Great flavour, portion sizes could be a bit larger." }
                ]
            },
            {
                id: "p4",
                name: "Lisa Wong",
                serviceType: "IT Support",
                rating: 4.7,
                rate: 35,
                currency: "USD",
                lat: 52.5300,
                lng: 13.3800,
                address: "Kantstrasse 45, 10625 Berlin (Charlottenburg)",
                availability: "Today 16:00",
                years: 4,
                languages: "EN, DE",
                tags: ["Home Wi‑Fi", "Laptop setup", "Remote help"],
                hobbies: "Gaming, tinkering with hardware, tech meetups",
                photo: "https://randomuser.me/api/portraits/women/12.jpg",
                reviews: [
                    { user: "Oliver B.", stars: 5, comment: "Fixed our Wi‑Fi in 20 minutes, very clear explanations." },
                    { user: "Helena D.", stars: 4, comment: "Helpful remote support, solved my VPN issue." }
                ]
            },
            {
                id: "p5",
                name: "Tom Becker",
                serviceType: "Moving",
                rating: 4.6,
                rate: 40,
                currency: "USD",
                lat: 52.5000,
                lng: 13.4200,
                address: "Boxhagener Strasse 76, 10245 Berlin (Friedrichshain)",
                availability: "Next Monday",
                years: 6,
                languages: "DE",
                tags: ["Van included", "2 helpers", "Berlin only"],
                hobbies: "Cycling, logistics puzzles, DIY furniture",
                photo: "https://randomuser.me/api/portraits/men/51.jpg",
                reviews: [
                    { user: "Jule F.",   stars: 5, comment: "Super fast move, nothing damaged, highly recommended." },
                    { user: "Kenan A.",  stars: 4, comment: "Strong team, a bit late due to traffic but informed us." }
                ]
            }
        ],

        chatMessages: [],
        filteredProviders: [],

        homeActivity: { helpers: 0, requests: 0, recent: [] },
        subscriptionStatus: { plan: "free", monthly_booking_value: 0 },

        notifications: [],
        unreadCount: 0,
        bookingCount: 0,

        bookingForm: {
            date: "",
            time: "",
            message: ""
        },

        mapExpanded: true,

        filters: {
            distance: 10,
            distanceLabel: "Within 10 km",
            priceCategory: "all",
            minRating: 0,
            language: "",
            maxPrice: 200,
            availableNow: false,
            activeCount: 0
        },

        searchQuery: "",

        // onboarding
        onboarding: { step: 1, interests: [] },

        // favorites & recently viewed
        favorites: [],
        favoriteProviders: [],
        recentlyViewed: [],

        upcomingBookings: [],

        // selected profile for dialog
        selectedProfile: {},

        // Direct Messaging
        conversations: [],
        msgSearch: "",
        msgPinned: [],
        msgToday: [],
        msgYesterday: [],
        msgEarlier: [],
        msgPinnedVisible: false,
        msgTodayVisible: false,
        msgYesterdayVisible: false,
        msgEarlierVisible: false,
        msgEmptyNoConvos: true,
        msgEmptySearch: false,
        unreadDmCount: 0,
        dmMessages: [],
        currentConversation: null,

        // Tasks
        tasksFeed: [],
        myTasks: [],
        openTaskCount: 0,
        selectedTask: {},
        taskApplications: [],
        taskForm: {
            title: "",
            description: "",
            category: "",
            budget: "",
            task_date: "",
            location: ""
        },
        taskViewMode: "browse",
        taskSearchQuery: "",
        taskCategoryFilter: ""
    });
}

    };
});
