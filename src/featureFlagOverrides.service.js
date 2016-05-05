angular.module('feature-flags').service('featureFlagOverrides', function($rootElement) {
    var appName = $rootElement.attr('ng-app'),
        keyPrefix = 'featureFlags.' + appName + '.',
        environment,

        prefixedKeyFor = function(flagName) {
            return keyPrefix + flagName;
        },

        isPrefixedKey = function(key) {
            return key.indexOf(keyPrefix) === 0;
        },

        set = function(value, flagName) {
            localStorage.setItem(prefixedKeyFor(flagName + '-' + environment), value);
        },

        get = function(flagName) {
            return localStorage.getItem(prefixedKeyFor(flagName + '-' + environment));
        },

        getEnvironment= function() {
            return environment;
        },

        setEnvironment= function(key) {
            environment = key;
        },

        remove = function(flagName) {
            localStorage.removeItem(prefixedKeyFor(flagName + '-' + environment));
        };

    return {
        isPresent: function(key) {
            return get(key) !== null;
        },
        get: get,
        set: function(flag, value) {
            if (angular.isObject(flag)) {
                angular.forEach(flag, set);
            } else {
                set(value, flag);
            }
        },
        remove: remove,
        reset: function() {
            var key;
            for (key in localStorage) {
                if (isPrefixedKey(key)) {
                    localStorage.removeItem(key + '-' + environment);
                }
            }
        },
        getEnvironment: getEnvironment,
        setEnvironment: setEnvironment
    };
});
