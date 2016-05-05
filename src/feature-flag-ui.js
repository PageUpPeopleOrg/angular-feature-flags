angular.module('feature-flag-ui', [])

.run(function($http, featureFlags, featureFlagOverrides, $location, $rootScope) {
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

    })
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
