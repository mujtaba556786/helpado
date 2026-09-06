/**
 * ========================================================================
 * Cordova.js Mock for Web Development
 * ========================================================================
 * 
 * This file provides a mock Cordova environment when running in a web browser.
 * When building with Cordova CLI, this file will be replaced with the actual cordova.js
 * 
 * Version: 12.0.0-mock
 * Author: Helpado Development Team
 * License: MIT
 * 
 * Usage:
 * - Place this file in your www/ directory
 * - Include in HTML: <script src="cordova.js"></script>
 * - For production mobile builds, Cordova CLI will replace this automatically
 * 
 * ========================================================================
 */

(function(window) {
    'use strict';
    
    console.log('%c📱 Cordova Mock Environment Loading...', 'color: #2196F3; font-weight: bold; font-size: 14px;');
    
    // ====================================================================
    // Core Cordova Object
    // ====================================================================
    
    window.cordova = {
        version: '12.0.0-mock',
        platformId: 'browser',
        platformVersion: '1.0.0',
        
        /**
         * Define a module
         */
        define: function(moduleName, factory) {
            console.log('📦 Cordova mock define:', moduleName);
            if (typeof factory === 'function') {
                return factory();
            }
            return factory;
        },
        
        /**
         * Require a module
         */
        require: function(moduleName) {
            console.log('📦 Cordova mock require:', moduleName);
            return {};
        },
        
        /**
         * Add constructor
         */
        addConstructor: function(func) {
            console.log('🏗️ Cordova mock addConstructor');
            if (typeof func === 'function') {
                func();
            }
        },
        
        /**
         * Execute callback
         */
        exec: function(success, fail, service, action, args) {
            console.log('⚡ Cordova exec:', service, action, args);
            if (fail) {
                fail('Service not available in browser mock: ' + service);
            }
        }
    };
    
    // ====================================================================
    // Device Information
    // ====================================================================
    
    window.device = {
        cordova: '12.0.0-mock',
        model: 'Browser',
        platform: 'browser',
        uuid: 'browser-uuid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        version: navigator.userAgent,
        manufacturer: 'Browser',
        isVirtual: false,
        serial: 'N/A',
        
        // Additional info
        available: true,
        
        getInfo: function() {
            return {
                cordova: this.cordova,
                model: this.model,
                platform: this.platform,
                uuid: this.uuid,
                version: this.version,
                manufacturer: this.manufacturer
            };
        }
    };
    
    console.log('📱 Device Info:', window.device);
    
    // ====================================================================
    // Splash Screen Plugin
    // ====================================================================
    
    if (!navigator.splashscreen) {
        navigator.splashscreen = {
            hide: function() {
                console.log('🖼️ Mock: Splash screen hidden');
                // Simulate splash screen hiding
                var splash = document.getElementById('splash-screen');
                if (splash) {
                    splash.style.display = 'none';
                }
            },
            
            show: function() {
                console.log('🖼️ Mock: Splash screen shown');
                var splash = document.getElementById('splash-screen');
                if (splash) {
                    splash.style.display = 'flex';
                }
            }
        };
    }
    
    // ====================================================================
    // Status Bar Plugin
    // ====================================================================
    
    window.StatusBar = {
        isVisible: true,
        
        overlaysWebView: function(overlay) {
            console.log('📊 Mock: StatusBar overlaysWebView:', overlay);
        },
        
        styleDefault: function() {
            console.log('📊 Mock: StatusBar styleDefault (dark text)');
        },
        
        styleLightContent: function() {
            console.log('📊 Mock: StatusBar styleLightContent (light text)');
        },
        
        styleBlackTranslucent: function() {
            console.log('📊 Mock: StatusBar styleBlackTranslucent');
        },
        
        styleBlackOpaque: function() {
            console.log('📊 Mock: StatusBar styleBlackOpaque');
        },
        
        backgroundColorByName: function(colorName) {
            console.log('📊 Mock: StatusBar backgroundColorByName:', colorName);
        },
        
        backgroundColorByHexString: function(hexString) {
            console.log('📊 Mock: StatusBar backgroundColorByHexString:', hexString);
        },
        
        hide: function() {
            console.log('📊 Mock: StatusBar hidden');
            this.isVisible = false;
        },
        
        show: function() {
            console.log('📊 Mock: StatusBar shown');
            this.isVisible = true;
        }
    };
    
    // ====================================================================
    // Camera Plugin
    // ====================================================================
    
    if (!navigator.camera) {
        navigator.camera = {
            getPicture: function(successCallback, errorCallback, options) {
                console.log('📷 Mock: Camera getPicture called with options:', options);
                
                // Simulate camera with file input
                var input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                
                if (options && options.sourceType === navigator.camera.PictureSourceType.CAMERA) {
                    input.capture = 'camera';
                }
                
                input.onchange = function(e) {
                    var file = e.target.files[0];
                    if (file) {
                        var reader = new FileReader();
                        reader.onload = function(event) {
                            if (successCallback) {
                                var imageData = event.target.result;
                                if (options && options.destinationType === navigator.camera.DestinationType.DATA_URL) {
                                    imageData = imageData.split(',')[1]; // Remove data:image/jpeg;base64,
                                }
                                successCallback(imageData);
                            }
                        };
                        reader.readAsDataURL(file);
                    } else {
                        if (errorCallback) {
                            errorCallback('No image selected');
                        }
                    }
                };
                
                input.click();
            },
            
            cleanup: function(successCallback, errorCallback) {
                console.log('📷 Mock: Camera cleanup called');
                if (successCallback) successCallback();
            },
            
            DestinationType: {
                DATA_URL: 0,
                FILE_URI: 1,
                NATIVE_URI: 2
            },
            
            PictureSourceType: {
                PHOTOLIBRARY: 0,
                CAMERA: 1,
                SAVEDPHOTOALBUM: 2
            },
            
            EncodingType: {
                JPEG: 0,
                PNG: 1
            },
            
            MediaType: {
                PICTURE: 0,
                VIDEO: 1,
                ALLMEDIA: 2
            },
            
            Direction: {
                BACK: 0,
                FRONT: 1
            }
        };
    }
    
    // ====================================================================
    // Geolocation Enhancement
    // ====================================================================
    
    if (navigator.geolocation) {
        console.log('🌍 Using browser native geolocation API');
        
        // Enhance with Cordova-style options
        var originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function(success, error, options) {
            console.log('🌍 Mock: Geolocation getCurrentPosition', options);
            originalGetCurrentPosition.call(navigator.geolocation, success, error, options);
        };
        
        var originalWatchPosition = navigator.geolocation.watchPosition;
        navigator.geolocation.watchPosition = function(success, error, options) {
            console.log('🌍 Mock: Geolocation watchPosition', options);
            return originalWatchPosition.call(navigator.geolocation, success, error, options);
        };
    }
    
    // ====================================================================
    // File System Plugin
    // ====================================================================
    
    window.resolveLocalFileSystemURL = function(url, successCallback, errorCallback) {
        console.log('📁 Mock: resolveLocalFileSystemURL:', url);
        if (errorCallback) {
            errorCallback({
                code: 1,
                message: 'File system not available in browser'
            });
        }
    };
    
    window.requestFileSystem = function(type, size, successCallback, errorCallback) {
        console.log('📁 Mock: requestFileSystem:', type, size);
        if (errorCallback) {
            errorCallback({
                code: 1,
                message: 'File system not available in browser'
            });
        }
    };
    
    // File System constants
    window.LocalFileSystem = {
        PERSISTENT: 1,
        TEMPORARY: 0
    };
    
    // ====================================================================
    // Network Information Plugin
    // ====================================================================
    
    if (!navigator.connection) {
        var connection = {
            type: 'wifi',
            effectiveType: '4g',
            downlink: 10,
            downlinkMax: Infinity,
            rtt: 50,
            saveData: false,
            onchange: null,
            
            // Cordova connection types
            UNKNOWN: 'unknown',
            ETHERNET: 'ethernet',
            WIFI: 'wifi',
            CELL_2G: '2g',
            CELL_3G: '3g',
            CELL_4G: '4g',
            CELL: 'cellular',
            NONE: 'none'
        };
        
        Object.defineProperty(navigator, 'connection', {
            value: connection,
            writable: false
        });
        
        // Update connection type based on browser API
        if (navigator.connection || navigator.mozConnection || navigator.webkitConnection) {
            var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (conn.effectiveType) {
                connection.type = conn.effectiveType;
            }
        }
        
        console.log('📡 Network Info:', connection);
    }
    
    // ====================================================================
    // InAppBrowser Plugin
    // ====================================================================
    
    window.open = (function(originalOpen) {
        return function(url, target, options) {
            console.log('🌐 Mock: InAppBrowser open:', url, target, options);
            
            // Parse options
            var optionsObj = {};
            if (typeof options === 'string') {
                options.split(',').forEach(function(opt) {
                    var parts = opt.split('=');
                    if (parts.length === 2) {
                        optionsObj[parts[0].trim()] = parts[1].trim();
                    }
                });
            }
            
            // Open in new window/tab
            var windowRef = originalOpen.call(window, url, target || '_blank');
            
            // Mock InAppBrowser methods
            if (windowRef) {
                windowRef.addEventListener = function(event, callback) {
                    console.log('🌐 Mock: InAppBrowser addEventListener:', event);
                };
                
                windowRef.removeEventListener = function(event, callback) {
                    console.log('🌐 Mock: InAppBrowser removeEventListener:', event);
                };
                
                windowRef.executeScript = function(details, callback) {
                    console.log('🌐 Mock: InAppBrowser executeScript');
                    if (callback) callback();
                };
                
                windowRef.insertCSS = function(details, callback) {
                    console.log('🌐 Mock: InAppBrowser insertCSS');
                    if (callback) callback();
                };
                
                windowRef.show = function() {
                    console.log('🌐 Mock: InAppBrowser show');
                };
                
                windowRef.hide = function() {
                    console.log('🌐 Mock: InAppBrowser hide');
                };
            }
            
            return windowRef;
        };
    })(window.open);
    
    // ====================================================================
    // Keyboard Plugin
    // ====================================================================
    
    window.Keyboard = {
        isVisible: false,
        
        hide: function() {
            console.log('⌨️ Mock: Keyboard hidden');
            this.isVisible = false;
            if (document.activeElement) {
                document.activeElement.blur();
            }
        },
        
        show: function() {
            console.log('⌨️ Mock: Keyboard shown');
            this.isVisible = true;
        },
        
        disableScroll: function(disable) {
            console.log('⌨️ Mock: Keyboard scroll disabled:', disable);
        },
        
        hideFormAccessoryBar: function(hide) {
            console.log('⌨️ Mock: Keyboard form accessory bar hidden:', hide);
        },
        
        shrinkView: function(shrink) {
            console.log('⌨️ Mock: Keyboard shrinkView:', shrink);
        }
    };
    
    // ====================================================================
    // Dialogs Plugin
    // ====================================================================
    
    if (!navigator.notification) {
        navigator.notification = {
            alert: function(message, alertCallback, title, buttonName) {
                console.log('🔔 Mock: Alert -', title || 'Alert', ':', message);
                window.alert(message);
                if (alertCallback) alertCallback();
            },
            
            confirm: function(message, confirmCallback, title, buttonLabels) {
                console.log('🔔 Mock: Confirm -', title || 'Confirm', ':', message);
                var result = window.confirm(message);
                if (confirmCallback) {
                    confirmCallback(result ? 1 : 2);
                }
            },
            
            prompt: function(message, promptCallback, title, buttonLabels, defaultText) {
                console.log('🔔 Mock: Prompt -', title || 'Prompt', ':', message);
                var result = window.prompt(message, defaultText || '');
                if (promptCallback) {
                    promptCallback({
                        buttonIndex: result !== null ? 1 : 2,
                        input1: result || ''
                    });
                }
            },
            
            beep: function(times) {
                console.log('🔔 Mock: Beep', times, 'times');
            },
            
            vibrate: function(time) {
                console.log('📳 Mock: Vibrate for', time, 'ms');
                if (navigator.vibrate) {
                    navigator.vibrate(time);
                }
            }
        };
    }
    
    // ====================================================================
    // Toast Plugin
    // ====================================================================
    
    window.plugins = window.plugins || {};
    window.plugins.toast = {
        show: function(message, duration, position, successCallback, errorCallback) {
            console.log('🍞 Mock Toast:', message, '(' + duration + ', ' + position + ')');
            
            // Create toast element
            var toast = document.createElement('div');
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 10000;
                font-size: 14px;
                max-width: 80%;
                text-align: center;
                left: 50%;
                transform: translateX(-50%);
            `;
            
            // Position
            if (position === 'top') {
                toast.style.top = '20px';
            } else if (position === 'center') {
                toast.style.top = '50%';
                toast.style.transform = 'translate(-50%, -50%)';
            } else {
                toast.style.bottom = '20px';
            }
            
            document.body.appendChild(toast);
            
            // Remove after duration
            var durationMs = duration === 'long' ? 3500 : 2000;
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, durationMs);
            
            if (successCallback) successCallback();
        },
        
        showShortTop: function(message, successCallback, errorCallback) {
            this.show(message, 'short', 'top', successCallback, errorCallback);
        },
        
        showShortCenter: function(message, successCallback, errorCallback) {
            this.show(message, 'short', 'center', successCallback, errorCallback);
        },
        
        showShortBottom: function(message, successCallback, errorCallback) {
            this.show(message, 'short', 'bottom', successCallback, errorCallback);
        },
        
        showLongTop: function(message, successCallback, errorCallback) {
            this.show(message, 'long', 'top', successCallback, errorCallback);
        },
        
        showLongCenter: function(message, successCallback, errorCallback) {
            this.show(message, 'long', 'center', successCallback, errorCallback);
        },
        
        showLongBottom: function(message, successCallback, errorCallback) {
            this.show(message, 'long', 'bottom', successCallback, errorCallback);
        }
    };
    
    // ====================================================================
    // Battery Status
    // ====================================================================
    
    if (!navigator.getBattery && !window.battery) {
        window.battery = {
            level: 100,
            isPlugged: false,
            
            addEventListener: function(event, callback) {
                console.log('🔋 Mock: Battery addEventListener:', event);
            }
        };
        
        // Try to use real Battery API if available
        if (navigator.getBattery) {
            navigator.getBattery().then(function(battery) {
                window.battery = battery;
                console.log('🔋 Using real Battery API');
            });
        }
    }
    
    // ====================================================================
    // App Plugin
    // ====================================================================
    
    if (!navigator.app) {
        navigator.app = {
            exitApp: function() {
                console.log('📱 Mock: Exit app (not available in browser)');
                window.close();
            },
            
            clearCache: function(successCallback) {
                console.log('🗑️ Mock: Clear cache');
                if (successCallback) successCallback();
            },
            
            loadUrl: function(url, successCallback, errorCallback) {
                console.log('🌐 Mock: Load URL:', url);
                window.location.href = url;
            }
        };
    }
    
    // ====================================================================
    // Device Motion (Accelerometer)
    // ====================================================================
    
    if (!navigator.accelerometer) {
        navigator.accelerometer = {
            getCurrentAcceleration: function(success, error) {
                console.log('📊 Mock: Get current acceleration');
                if (window.DeviceMotionEvent) {
                    // Try to use real accelerometer
                    var handler = function(event) {
                        window.removeEventListener('devicemotion', handler);
                        if (success && event.accelerationIncludingGravity) {
                            success({
                                x: event.accelerationIncludingGravity.x,
                                y: event.accelerationIncludingGravity.y,
                                z: event.accelerationIncludingGravity.z,
                                timestamp: event.timeStamp
                            });
                        }
                    };
                    window.addEventListener('devicemotion', handler);
                } else {
                    if (error) error('Accelerometer not available');
                }
            },
            
            watchAcceleration: function(success, error, options) {
                console.log('📊 Mock: Watch acceleration');
                return setInterval(function() {
                    if (success) {
                        success({
                            x: Math.random() * 2 - 1,
                            y: Math.random() * 2 - 1,
                            z: Math.random() * 2 - 1,
                            timestamp: Date.now()
                        });
                    }
                }, (options && options.frequency) || 1000);
            },
            
            clearWatch: function(watchID) {
                console.log('📊 Mock: Clear acceleration watch');
                clearInterval(watchID);
            }
        };
    }
    
    // ====================================================================
    // Contacts Plugin
    // ====================================================================
    
    if (!navigator.contacts) {
        navigator.contacts = {
            create: function(properties) {
                console.log('👤 Mock: Create contact', properties);
                return properties;
            },
            
            find: function(fields, success, error, options) {
                console.log('👤 Mock: Find contacts', fields);
                if (error) {
                    error('Contacts not available in browser');
                }
            }
        };
    }
    
    // ====================================================================
    // Media Plugin
    // ====================================================================
    
    if (!window.Media) {
        window.Media = function(src, success, error, statusChange) {
            console.log('🎵 Mock: Media -', src);
            this.src = src;
            
            var audio = new Audio(src);
            
            this.play = function() {
                console.log('▶️ Mock: Media play');
                audio.play();
            };
            
            this.pause = function() {
                console.log('⏸️ Mock: Media pause');
                audio.pause();
            };
            
            this.stop = function() {
                console.log('⏹️ Mock: Media stop');
                audio.pause();
                audio.currentTime = 0;
            };
            
            this.release = function() {
                console.log('🗑️ Mock: Media release');
                audio.pause();
                audio.src = '';
            };
            
            this.seekTo = function(milliseconds) {
                console.log('⏩ Mock: Media seekTo', milliseconds);
                audio.currentTime = milliseconds / 1000;
            };
            
            this.setVolume = function(volume) {
                console.log('🔊 Mock: Media setVolume', volume);
                audio.volume = volume;
            };
            
            this.getCurrentPosition = function(success, error) {
                if (success) {
                    success(audio.currentTime);
                }
            };
            
            this.getDuration = function() {
                return audio.duration;
            };
        };
    }
    
    // ====================================================================
    // Event Handlers
    // ====================================================================
    
    // Pause event
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            console.log('⏸️ App paused (visibilitychange)');
            var pauseEvent = new Event('pause');
            document.dispatchEvent(pauseEvent);
        } else {
            console.log('▶️ App resumed (visibilitychange)');
            var resumeEvent = new Event('resume');
            document.dispatchEvent(resumeEvent);
        }
    });
    
    // Back button
    document.addEventListener('keydown', function(e) {
        if (e.keyCode === 27) { // ESC key
            console.log('◀️ Back button pressed (ESC)');
            var backEvent = new Event('backbutton');
            document.dispatchEvent(backEvent);
        }
    });
    
    // ====================================================================
    // Initialize Device Ready Event
    // ====================================================================
    
    // Fire deviceready event after DOM is loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(fireDeviceReady, 0);
    } else {
        document.addEventListener('DOMContentLoaded', fireDeviceReady);
    }
    
    function fireDeviceReady() {
        setTimeout(function() {
            var event = new Event('deviceready');
            document.dispatchEvent(event);

            console.log('%c✅ Cordova Mock: deviceready event fired', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
            console.log('%c💡 Running in browser mode. For actual mobile features, build with Cordova CLI.', 'color: #FF9800; font-size: 12px;');
            console.log('%cDevice Info:', 'font-weight: bold;', window.device);

            // ── Push notification registration ────────────────────────────
            initPushNotifications();
        }, 100);
    }

    function initPushNotifications() {
        // Only run when the real Cordova push plugin is available (on-device builds)
        if (typeof window.PushNotification === 'undefined') {
            console.log('📵 Push plugin not available (browser mode) — skipping registration');
            return;
        }

        var push = window.PushNotification.init({
            android: { sound: true, vibrate: true, clearNotifications: true },
            ios:     { alert: true, badge: true, sound: true },
        });

        push.on('registration', function(data) {
            console.log('📲 FCM token received:', data.registrationId);
            var userId = window._currentUserId || localStorage.getItem('userId');
            if (!userId || !data.registrationId) return;

            fetch('/api/notifications/device-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId:   userId,
                    token:    data.registrationId,
                    platform: window.device ? window.device.platform.toLowerCase() : 'android',
                }),
            }).catch(function(e) { console.warn('Token save failed:', e); });
        });

        push.on('notification', function(data) {
            console.log('🔔 Push received:', data);
            // Refresh notification bell count if app is open
            if (typeof window._refreshNotifications === 'function') {
                window._refreshNotifications();
            }
        });

        push.on('error', function(e) {
            console.warn('Push error:', e.message);
        });
    }
    
    // ====================================================================
    // Utility Functions
    // ====================================================================
    
    window.cordovaMock = {
        version: '12.0.0',
        
        // Check if running as Cordova app
        isCordovaApp: function() {
            return false; // Always false for mock
        },
        
        // Get all mocked plugins
        getPlugins: function() {
            return {
                device: window.device,
                splashscreen: navigator.splashscreen,
                statusBar: window.StatusBar,
                camera: navigator.camera,
                geolocation: navigator.geolocation,
                connection: navigator.connection,
                notification: navigator.notification,
                keyboard: window.Keyboard,
                toast: window.plugins.toast,
                battery: window.battery,
                accelerometer: navigator.accelerometer,
                contacts: navigator.contacts
            };
        },
        
        // Show mock info
        info: function() {
            console.table({
                'Version': this.version,
                'Platform': window.device.platform,
                'UUID': window.device.uuid,
                'Model': window.device.model,
                'Cordova App': this.isCordovaApp()
            });
        }
    };
    
    // ====================================================================
    // Export
    // ====================================================================
    
    console.log('%c========================================', 'color: #2196F3;');
    console.log('%c📱 Cordova Mock Ready', 'color: #4CAF50; font-weight: bold; font-size: 16px;');
    console.log('%c========================================', 'color: #2196F3;');
    console.log('Type cordovaMock.info() to see details');
    console.log('Type cordovaMock.getPlugins() to see available plugins');
    
})(window);