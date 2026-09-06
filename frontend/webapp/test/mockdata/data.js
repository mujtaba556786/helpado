/**
 * Centralized mock data for all Helpado tests.
 * Used by MockServer.js (OPA5) and unit tests directly.
 * Matches the shape of real API responses so tests work with server down.
 */
sap.ui.define([], function () {
    "use strict";

    // ── Tokens ────────────────────────────────────────────────────────────────

    var ACCESS_TOKEN  = "mock-access-token-xyz";
    var REFRESH_TOKEN = "mock-refresh-token-abc";

    // ── Users ─────────────────────────────────────────────────────────────────

    var USER = {
        id: "U_TEST_001",
        name: "Julia Tester",
        email: "julia@test.com",
        role: "Customer",
        status: "Active",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=julia",
        onboarded: true,
        terms_accepted_at: "2024-01-01T00:00:00.000Z",
        terms_version: "1.0",
        subscription_plan: "free",
        monthly_booking_value: 0
    };

    // Provider account — used to test provider-specific features (category limits, earnings chip, etc.)
    var PROVIDER_USER = {
        id: "U_PROVIDER_001",
        name: "Alex Provider",
        email: "alex@test.com",
        role: "provider",
        status: "Active",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
        onboarded: true,
        terms_accepted_at: "2024-01-01T00:00:00.000Z",
        terms_version: "1.0",
        subscription_plan: "free",
        monthly_booking_value: 320,       // above soft nudge threshold (€300)
        service_categories: "Cleaning",
        lat: 52.52, lng: 13.405,
        city: "Berlin"
    };

    var PRO_PROVIDER_USER = {
        id: "U_PROVIDER_002",
        name: "Pro Provider",
        email: "pro@test.com",
        role: "provider",
        status: "Active",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=pro",
        onboarded: true,
        terms_accepted_at: "2024-01-01T00:00:00.000Z",
        terms_version: "1.0",
        subscription_plan: "pro",
        monthly_booking_value: 1200,
        service_categories: "Cleaning,Gardening,Handyman",
        lat: 52.525, lng: 13.41,
        city: "Berlin"
    };

    // ── Providers ─────────────────────────────────────────────────────────────
    // 7 providers so ad-injection at every 6th card is testable (index 5 gets an ad)
    // Mix of free/pro and one featured (sponsored) provider

    var FEATURED_UNTIL = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days from now

    var PROVIDERS = [
        {
            id: "p1",
            name: "Sarah Martinez",
            photo: "https://randomuser.me/api/portraits/women/65.jpg",
            bio: "Urban gardening expert with 3 years experience.",
            rating: 4.9,
            rate: 25,
            currency: "EUR",
            city: "Berlin",
            lat: 52.5250,
            lng: 13.4100,
            languages: "EN, DE",
            years: 3,
            availability: "all_day",
            serviceType: "Gardening",
            service_categories: "Gardening",
            phone: "+49123456789",
            subscription_plan: "free",
            featured_until: null,
            featured_category: null,
            monthly_booking_value: 180
        },
        {
            id: "p2",
            name: "Emma Johnson",
            photo: "https://randomuser.me/api/portraits/women/44.jpg",
            bio: "Certified childcare specialist, 5 years experience.",
            rating: 5.0,
            rate: 20,
            currency: "EUR",
            city: "Berlin",
            lat: 52.5100,
            lng: 13.3900,
            languages: "EN",
            years: 5,
            availability: "weekdays,morning",
            serviceType: "Babysitting",
            service_categories: "Babysitting",
            phone: "+49987654321",
            subscription_plan: "pro",             // Pro provider — badge test
            featured_until: null,
            featured_category: null,
            monthly_booking_value: 850
        },
        {
            id: "p3",
            name: "Raj Patel",
            photo: "https://randomuser.me/api/portraits/men/29.jpg",
            bio: "Home chef specialising in Indian cuisine.",
            rating: 4.8,
            rate: 30,
            currency: "EUR",
            city: "Berlin",
            lat: 52.5155,
            lng: 13.4020,
            languages: "EN, HI",
            years: 7,
            availability: "weekends,evening",
            serviceType: "Cooking",
            service_categories: "Cooking",
            phone: "+49111222333",
            subscription_plan: "free",
            featured_until: null,
            featured_category: null,
            monthly_booking_value: 240
        },
        {
            id: "p4",
            name: "Lisa Chen",
            photo: "https://randomuser.me/api/portraits/women/52.jpg",
            bio: "Professional home cleaner, eco-friendly products.",
            rating: 4.95,
            rate: 22,
            currency: "EUR",
            city: "Berlin",
            lat: 52.5180,
            lng: 13.3950,
            languages: "EN, ZH",
            years: 4,
            availability: "all_day",
            serviceType: "Cleaning",
            service_categories: "Cleaning",
            phone: "+49444555666",
            subscription_plan: "pro",
            featured_until: FEATURED_UNTIL,       // sponsored provider — floats to top
            featured_category: "Cleaning",
            monthly_booking_value: 1100
        },
        {
            id: "p5",
            name: "Tom Walker",
            photo: "https://randomuser.me/api/portraits/men/41.jpg",
            bio: "Reliable home cleaner, flexible hours.",
            rating: 4.6,
            rate: 18,
            currency: "EUR",
            city: "Berlin",
            lat: 52.5300,
            lng: 13.4200,
            languages: "EN, DE",
            years: 2,
            availability: "weekdays,afternoon",
            serviceType: "Cleaning",
            service_categories: "Cleaning",
            phone: "+49777888999",
            subscription_plan: "free",
            featured_until: null,
            featured_category: null,
            monthly_booking_value: 95
        },
        {
            id: "p6",
            name: "Anna Schmidt",
            photo: "https://randomuser.me/api/portraits/women/30.jpg",
            bio: "Deep clean specialist, offices and homes.",
            rating: 4.7,
            rate: 20,
            currency: "EUR",
            city: "Berlin",
            lat: 52.5090,
            lng: 13.4080,
            languages: "DE",
            years: 6,
            availability: "weekdays,morning",
            serviceType: "Cleaning",
            service_categories: "Cleaning",
            phone: "+49321654987",
            subscription_plan: "pro",
            featured_until: null,
            featured_category: null,
            monthly_booking_value: 620
        },
        {
            id: "p7",
            name: "Marco Rossi",
            photo: "https://randomuser.me/api/portraits/men/55.jpg",
            bio: "Handyman — plumbing, electrics, general repairs.",
            rating: 4.5,
            rate: 35,
            currency: "EUR",
            city: "Berlin",
            lat: 52.5220,
            lng: 13.3880,
            languages: "EN, IT",
            years: 10,
            availability: "all_day",
            serviceType: "Handyman",
            service_categories: "Handyman",
            phone: "+49654321789",
            subscription_plan: "free",
            featured_until: null,
            featured_category: null,
            monthly_booking_value: 410
        }
    ];

    // ── Services ──────────────────────────────────────────────────────────────
    // Returned as a plain array so Dashboard.controller._loadServicesFromApi
    // can process them (it checks Array.isArray directly).

    var SERVICES = [
        { id: "S1",  name: "Cleaning",     category: "Home",      icon: "🧹", status: "Active", description: "Home and office cleaning.", is_hero: true },
        { id: "S2",  name: "Gardening",    category: "Home",      icon: "🌱", status: "Active", description: "Garden maintenance.", is_hero: false },
        { id: "S3",  name: "Handyman",     category: "Home",      icon: "🔧", status: "Active", description: "General home repairs.", is_hero: false },
        { id: "S4",  name: "Babysitting",  category: "Care",      icon: "👶", status: "Active", description: "Trusted childcare.", is_hero: false },
        { id: "S5",  name: "Elder Care",   category: "Care",      icon: "🧓", status: "Active", description: "Companionship and care.", is_hero: false },
        { id: "S6",  name: "Pet Care",     category: "Care",      icon: "🐕", status: "Active", description: "Dog walking and pet sitting.", is_hero: false },
        { id: "S7",  name: "Transport",    category: "Transport", icon: "🚗", status: "Active", description: "Reliable rides.", is_hero: false },
        { id: "S8",  name: "Groceries",    category: "Transport", icon: "🛒", status: "Active", description: "Grocery delivery.", is_hero: false },
        { id: "S9",  name: "Cooking",      category: "Wellness",  icon: "👨‍🍳", status: "Active", description: "Home-cooked meals.", is_hero: false },
        { id: "S10", name: "Massage",      category: "Wellness",  icon: "💆", status: "Active", description: "Professional massage.", is_hero: false },
        { id: "S11", name: "Math Tuition", category: "Skills",    icon: "📐", status: "Active", description: "One-on-one math lessons.", is_hero: false },
        { id: "S12", name: "IT Support",   category: "Skills",    icon: "💻", status: "Active", description: "Tech help and setup.", is_hero: false }
    ];

    // ── Home Activity ─────────────────────────────────────────────────────────

    var HOME_ACTIVITY = {
        success: true,
        helpers: 24,
        requests: 7,
        recent: [
            { service: "Cleaning",    city: "Berlin Mitte" },
            { service: "Gardening",   city: "Berlin Prenzlauer Berg" },
            { service: "Babysitting", city: "Berlin Kreuzberg" }
        ]
    };

    // ── Subscription Status ───────────────────────────────────────────────────

    var SUBSCRIPTION_STATUS = {
        success: true,
        plan: "free",
        monthly_booking_value: 320,
        threshold: 500,
        threshold_percent: 64,
        soft_cap_reached: false,
        hard_cap_reached: false,
        days_until_reset: 12
    };

    var SUBSCRIPTION_STATUS_NEAR_CAP = {
        success: true,
        plan: "free",
        monthly_booking_value: 480,
        threshold: 500,
        threshold_percent: 96,
        soft_cap_reached: true,
        hard_cap_reached: false,
        days_until_reset: 3
    };

    var SUBSCRIPTION_STATUS_HARD_CAP = {
        success: true,
        plan: "free",
        monthly_booking_value: 500,
        threshold: 500,
        threshold_percent: 100,
        soft_cap_reached: true,
        hard_cap_reached: true,
        days_until_reset: 1
    };

    // ── Bookings ──────────────────────────────────────────────────────────────
    // Covers all possible statuses so filter-chip tests have data to work with.

    var BOOKINGS = [
        {
            id: "B1",
            customer_id: "U_TEST_001",
            customer_name: "Julia Tester",
            provider_id: "p1",
            provider_name: "Sarah Martinez",
            service: "Gardening",
            scheduled_date: "2025-06-20",
            scheduled_time: "10:00",
            status: "confirmed",
            total_price: 25,
            is_seen: 1,
            created_at: "2025-06-15T10:00:00.000Z"
        },
        {
            id: "B2",
            customer_id: "U_TEST_001",
            customer_name: "Julia Tester",
            provider_id: "p2",
            provider_name: "Emma Johnson",
            service: "Babysitting",
            scheduled_date: "2025-06-22",
            scheduled_time: "14:00",
            status: "pending",
            total_price: 20,
            is_seen: 0,
            created_at: "2025-06-16T09:00:00.000Z"
        },
        {
            id: "B3",
            customer_id: "U_TEST_001",
            customer_name: "Julia Tester",
            provider_id: "p4",
            provider_name: "Lisa Chen",
            service: "Cleaning",
            scheduled_date: "2025-05-10",
            scheduled_time: "09:00",
            status: "completed",
            total_price: 22,
            is_seen: 1,
            created_at: "2025-05-01T08:00:00.000Z"
        },
        {
            id: "B4",
            customer_id: "U_TEST_001",
            customer_name: "Julia Tester",
            provider_id: "p5",
            provider_name: "Tom Walker",
            service: "Cleaning",
            scheduled_date: "2025-06-05",
            scheduled_time: "11:00",
            status: "declined",
            total_price: 18,
            is_seen: 1,
            created_at: "2025-06-01T07:00:00.000Z"
        },
        {
            id: "B5",
            customer_id: "U_TEST_001",
            customer_name: "Julia Tester",
            provider_id: "p7",
            provider_name: "Marco Rossi",
            service: "Handyman",
            scheduled_date: "2025-06-12",
            scheduled_time: "13:00",
            status: "cancelled",
            total_price: 35,
            is_seen: 1,
            created_at: "2025-06-08T06:00:00.000Z"
        }
    ];

    // ── Notifications ─────────────────────────────────────────────────────────
    // One of every notification type so type-icon formatters and filter tests work.

    var NOTIFICATIONS = [
        {
            id: "N1",
            user_id: "U_TEST_001",
            type: "booking_request",
            title: "New booking request",
            message: "Someone wants to book you.",
            is_read: 0,
            created_at: new Date(Date.now() - 300000).toISOString()          // 5 min ago
        },
        {
            id: "N2",
            user_id: "U_TEST_001",
            type: "booking_accepted",
            title: "Booking confirmed",
            message: "Your Gardening booking was confirmed.",
            is_read: 1,
            created_at: new Date(Date.now() - 90000000).toISOString()        // ~25 hr ago
        },
        {
            id: "N3",
            user_id: "U_TEST_001",
            type: "booking_declined",
            title: "Booking declined",
            message: "Your Cleaning booking was declined.",
            is_read: 0,
            created_at: new Date(Date.now() - 3600000).toISOString()         // 1 hr ago
        },
        {
            id: "N4",
            user_id: "U_TEST_001",
            type: "booking_completed",
            title: "Booking completed",
            message: "Your Babysitting booking is complete. Leave a review!",
            is_read: 1,
            created_at: new Date(Date.now() - 172800000).toISOString()       // 2 days ago
        },
        {
            id: "N5",
            user_id: "U_TEST_001",
            type: "task_application",
            title: "New application on your task",
            message: "Marco Rossi applied to your Garden cleanup task.",
            is_read: 0,
            created_at: new Date(Date.now() - 600000).toISOString()          // 10 min ago
        },
        {
            id: "N6",
            user_id: "U_TEST_001",
            type: "task_assigned",
            title: "Task assigned",
            message: "You were assigned to Help moving furniture.",
            is_read: 1,
            created_at: new Date(Date.now() - 7200000).toISOString()         // 2 hr ago
        },
        {
            id: "N7",
            user_id: "U_TEST_001",
            type: "direct_message",
            title: "New message from Sarah Martinez",
            message: "See you tomorrow!",
            is_read: 0,
            created_at: new Date(Date.now() - 1800000).toISOString()         // 30 min ago
        },
        {
            id: "N8",
            user_id: "U_TEST_001",
            type: "booking_cancelled",
            title: "Booking cancelled",
            message: "Your Handyman booking was cancelled.",
            is_read: 1,
            created_at: new Date(Date.now() - 604800000).toISOString()       // 7 days ago
        }
    ];

    // Unread count derived from NOTIFICATIONS
    var NOTIFICATIONS_UNREAD_COUNT = NOTIFICATIONS.filter(function (n) { return !n.is_read; }).length; // 4

    // ── Tasks ─────────────────────────────────────────────────────────────────
    // Varied: different categories, budgets, statuses so filter/sort tests work.

    var TASKS = [
        {
            id: "T1",
            poster_id: "U_OTHER_001",
            poster_name: "Max Mustermann",
            title: "Help moving furniture",
            description: "Need help moving a sofa to the 3rd floor.",
            category: "Home",
            budget: 50,
            task_date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // tomorrow
            location: "Berlin Mitte",
            lat: 52.52,
            lng: 13.4,
            status: "open",
            application_count: 2,
            created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: "T2",
            poster_id: "U_TEST_001",
            poster_name: "Julia Tester",
            title: "Garden cleanup needed",
            description: "Autumn leaves everywhere.",
            category: "Home",
            budget: 30,
            task_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
            location: "Berlin Prenzlauer Berg",
            lat: 52.535,
            lng: 13.415,
            status: "open",
            application_count: 0,
            created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
            id: "T3",
            poster_id: "U_OTHER_002",
            poster_name: "Hans Bauer",
            title: "Dog walking — twice daily",
            description: "Need a reliable dog walker for my Labrador.",
            category: "Pet Care",
            budget: 15,
            task_date: null,
            location: "Berlin Charlottenburg",
            lat: 52.516,
            lng: 13.305,
            status: "open",
            application_count: 5,
            created_at: new Date(Date.now() - 86400000).toISOString()       // yesterday
        },
        {
            id: "T4",
            poster_id: "U_OTHER_003",
            poster_name: "Sophie Klein",
            title: "Math tuition — GCSE level",
            description: "Looking for a patient maths tutor for my daughter.",
            category: "Tutoring",
            budget: 120,
            task_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
            location: "Berlin Friedrichshain",
            lat: 52.512,
            lng: 13.453,
            status: "open",
            application_count: 1,
            created_at: new Date(Date.now() - 172800000).toISOString()      // 2 days ago
        },
        {
            id: "T5",
            poster_id: "U_OTHER_004",
            poster_name: "Peter Müller",
            title: "Office deep clean",
            description: "Small office, approx 80 m², one-off deep clean.",
            category: "Cleaning",
            budget: 90,
            task_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
            location: "Berlin Kreuzberg",
            lat: 52.499,
            lng: 13.404,
            status: "assigned",
            application_count: 3,
            created_at: new Date(Date.now() - 43200000).toISOString()       // 12 hr ago
        }
    ];

    // ── Conversations ─────────────────────────────────────────────────────────
    // Two conversations: one with unread messages, one fully read.

    var CONVERSATIONS = [
        {
            id: "CONV1",
            other_id: "p1",
            other_name: "Sarah Martinez",
            other_avatar: "https://randomuser.me/api/portraits/women/65.jpg",
            last_message: "See you tomorrow!",
            last_message_at: new Date(Date.now() - 3600000).toISOString(),   // 1 hr ago
            unread_count: 1
        },
        {
            id: "CONV2",
            other_id: "p4",
            other_name: "Lisa Chen",
            other_avatar: "https://randomuser.me/api/portraits/women/52.jpg",
            last_message: "Thanks for the booking!",
            last_message_at: new Date(Date.now() - 86400000).toISOString(),  // yesterday
            unread_count: 0
        }
    ];

    // Total unread DM count
    var DM_UNREAD_COUNT = CONVERSATIONS.reduce(function (s, c) { return s + (c.unread_count || 0); }, 0); // 1

    // ── Ratings ───────────────────────────────────────────────────────────────

    var RATINGS = [
        {
            id: 1,
            stars: 5,
            comment: "Excellent work, very professional!",
            reviewer_name: "Max T.",
            reviewer_avatar: "",
            status: "approved",
            created_at: new Date(Date.now() - 172800000).toISOString()
        },
        {
            id: 2,
            stars: 4,
            comment: "Good service, would recommend.",
            reviewer_name: "Julia P.",
            reviewer_avatar: "",
            status: "approved",
            created_at: new Date(Date.now() - 604800000).toISOString()
        }
    ];

    return {
        // Auth
        ACCESS_TOKEN:                   ACCESS_TOKEN,
        REFRESH_TOKEN:                  REFRESH_TOKEN,
        // Users
        USER:                           USER,
        PROVIDER_USER:                  PROVIDER_USER,
        PRO_PROVIDER_USER:              PRO_PROVIDER_USER,
        // Providers
        PROVIDERS:                      PROVIDERS,
        FEATURED_UNTIL:                 FEATURED_UNTIL,
        // Services (plain array — controller checks Array.isArray)
        SERVICES:                       SERVICES,
        // Activity
        HOME_ACTIVITY:                  HOME_ACTIVITY,
        // Subscriptions
        SUBSCRIPTION_STATUS:            SUBSCRIPTION_STATUS,
        SUBSCRIPTION_STATUS_NEAR_CAP:   SUBSCRIPTION_STATUS_NEAR_CAP,
        SUBSCRIPTION_STATUS_HARD_CAP:   SUBSCRIPTION_STATUS_HARD_CAP,
        // Bookings (all 5 statuses covered)
        BOOKINGS:                       BOOKINGS,
        // Notifications (all 8 types covered)
        NOTIFICATIONS:                  NOTIFICATIONS,
        NOTIFICATIONS_UNREAD_COUNT:     NOTIFICATIONS_UNREAD_COUNT,
        // Tasks (5 tasks, varied categories / budgets)
        TASKS:                          TASKS,
        // Conversations (one unread, one read)
        CONVERSATIONS:                  CONVERSATIONS,
        DM_UNREAD_COUNT:               DM_UNREAD_COUNT,
        // Ratings
        RATINGS:                        RATINGS
    };
});
