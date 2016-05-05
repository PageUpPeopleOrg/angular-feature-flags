/*!
 * Angular Feature Flags v1.1.0
 *
 * © 2016, Michael Taranto
 */

(function(){
angular.module('feature-flag-ui', [])

.run(['$http', 'featureFlags', 'featureFlagOverrides', '$location', '$rootScope', function($http, featureFlags, featureFlagOverrides, $location, $rootScope) {
        if ($location.$$search.flags) {
            $rootScope.showFeaturesPanel = true;
        }
        $http.get('../data/flags.json').then(function(res) {
            if ($location.absUrl().indexOf('/beta') > -1) {
                featureFlagOverrides.setEnvironment("beta");
                featureFlags.set(res.data.beta, "beta");
            } else {
                featureFlagOverrides.setEnvironment("live");
                featureFlags.set(res.data.live, "live");
            }
        });

    }])
    .directive('featureFlagUi', function() {
        return {
            restrict: 'A',
            template:
            '<div class="feature-panel transformable" ng-class="{\'feature-panel-small\':!showFeatures, \'feature-panel-big\':showFeatures}" ng-show="showFeaturesPanel">' +
            '    <i class="fa fa-lg fa-close" ng-click="showFeaturesPanel=false"></i>' +
            '    <div class="heading" ng-click="showFeatures=!showFeatures">Release toggle</div>' +
            '    <i class="fa fa-angle-down fa-2x" ng-class="{\'fa-angle-down\':!showFeatures,\'fa-angle-up\':showFeatures}" ng-click="showFeatures=!showFeatures"></i>' +
            '    <div class="feature-modal" ng-show="showFeatures">' +
            '        <div feature-flag-overrides></div>' +
            '    </div>' +
            '</div>'
        }
    })

angular.module('feature-flags', ['feature-flag-ui']);

angular.module('feature-flags').directive('featureFlag', ['featureFlags', '$interpolate', function(featureFlags, $interpolate) {
    return {
        transclude: 'element',
        priority: 599,
        terminal: true,
        restrict: 'A',
        $$tlb: true,
        compile: function featureFlagCompile(tElement, tAttrs) {
            var hasHideAttribute = 'featureFlagHide' in tAttrs;

            tElement[0].textContent = ' featureFlag: ' + tAttrs.featureFlag + ' is ' + (hasHideAttribute ? 'on' : 'off') + ' ';

            return function featureFlagPostLink($scope, element, attrs, ctrl, $transclude) {
                var featureEl, childScope;
                $scope.$watch(function featureFlagWatcher() {
                    var featureFlag = $interpolate(attrs.featureFlag)($scope);
                    return featureFlags.isOn(featureFlag);
                }, function featureFlagChanged(isEnabled) {
                    var showElement = hasHideAttribute ? !isEnabled : isEnabled;

                    if (showElement) {
                        childScope = $scope.$new();
                        $transclude(childScope, function(clone) {
                            featureEl = clone;
                            element.after(featureEl).remove();
                        });
                    } else {
                        if (childScope) {
                            childScope.$destroy();
                            childScope = null;
                        }
                        if (featureEl) {
                            featureEl.after(element).remove();
                            featureEl = null;
                        }
                    }
                });
            };
        }
    };
}]);

angular.module('feature-flags').directive('featureFlagOverrides', ['featureFlags', function(featureFlags) {
    return {
        restrict: 'A',
        link: function postLink($scope) {
            $scope.flags = featureFlags.get();

            $scope.isOn = featureFlags.isOn;
            $scope.isOverridden = featureFlags.isOverridden;
            $scope.enable = featureFlags.enable;
            $scope.disable = featureFlags.disable;
            $scope.reset = featureFlags.reset;
            $scope.isOnByDefault = featureFlags.isOnByDefault;
        },
        template: '<div class="feature-flags">' +
                  '    <h1>Feature Flags</h1>' +
                  '    <div id="feature-flag--{{flag.key}}" class="feature-flags-flag" ng-repeat="flag in flags">' +
                  '        <div class="feature-flags-name">{{flag.name || flag.key}}</div>' +
                  '        <div id="feature-flag--{{flag.key}}--enable" class="feature-flags-switch" ng-click="enable(flag)" ng-class="{\'active\': isOverridden(flag.key) && isOn(flag.key)}">ON</div>' +
                  '        <div id="feature-flag--{{flag.key}}--disable" class="feature-flags-switch" ng-click="disable(flag)" ng-class="{\'active\': isOverridden(flag.key) && !isOn(flag.key)}">OFF</div>' +
                  '        <div id="feature-flag--{{flag.key}}--reset" class="feature-flags-switch" ng-click="reset(flag)" ng-class="{\'active\': !isOverridden(flag.key)}">DEFAULT ({{isOnByDefault(flag.key) ? \'ON\' : \'OFF\'}})</div>' +
                  '        <div class="feature-flags-desc">{{flag.description}}</div>' +
                  '    </div>' +
                  '</div>',
        replace: true
    };
}]);

angular.module('feature-flags').service('featureFlagOverrides', ['$rootElement', function($rootElement) {
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
}]);

function FeatureFlags($q, featureFlagOverrides, initialFlags) {
    var serverFlagCache = {},
        flags = [],

        resolve = function(val) {
            var deferred = $q.defer();
            deferred.resolve(val);
            return deferred.promise;
        },

        isOverridden = function(key) {
            return featureFlagOverrides.isPresent(key);
        },

        isOn = function(key) {
            return isOverridden(key) ? featureFlagOverrides.get(key) === 'true' : serverFlagCache[key];
        },

        isOnByDefault = function(key) {
            return serverFlagCache[key];
        },

        updateFlagsAndGetAll = function(newFlags) {
            newFlags.forEach(function(flag) {
                serverFlagCache[flag.key] = flag.active;
                flag.active = isOn(flag.key);
            });
            angular.copy(newFlags, flags);

            return flags;
        },

        updateFlagsWithPromise = function(promise) {
            return promise.then(function(value) {
                return updateFlagsAndGetAll(value.data || value);
            });
        },

        get = function() {
            return flags;
        },

        set = function(newFlags) {
            return angular.isArray(newFlags) ? resolve(updateFlagsAndGetAll(newFlags)) : updateFlagsWithPromise(newFlags);
        },

        enable = function(flag) {
            flag.active = true;
            featureFlagOverrides.set(flag.key, true);
        },

        disable = function(flag) {
            flag.active = false;
            featureFlagOverrides.set(flag.key, false);
        },

        reset = function(flag) {
            flag.active = serverFlagCache[flag.key];
            featureFlagOverrides.remove(flag.key);
        },

        init = function() {
            if (initialFlags) {
                set(initialFlags);
            }
        };
    init();

    return {
        set: set,
        get: get,
        enable: enable,
        disable: disable,
        reset: reset,
        isOn: isOn,
        isOnByDefault: isOnByDefault,
        isOverridden: isOverridden
    };
}

angular.module('feature-flags').provider('featureFlags', function() {
    var initialFlags = [];

    this.setInitialFlags = function(flags) {
        initialFlags = flags;
    };

    this.$get = ['$q', 'featureFlagOverrides', function($q, featureFlagOverrides) {
        return new FeatureFlags($q, featureFlagOverrides, initialFlags);
    }];
});

}());