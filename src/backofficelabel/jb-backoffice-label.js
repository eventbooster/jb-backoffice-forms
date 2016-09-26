(function (undefined) {
    "use strict";

    var _module = angular.module('jb.backofficeAutoFormElement');

    _module.controller('backofficeLabelController', ['$scope', function ($scope) {
        this.$scope = $scope;
    }]);

    _module.directive('backofficeLabel', ['$templateCache', '$compile', function ($templateCache, $compile) {
        return {
            link: function ($scope, element, attrs, ctrl) {
                var tpl = angular.element($templateCache.get('backofficeLabelTemplate.html'));
                element.replaceWith(tpl);
                $compile(tpl)($scope);
            }
            , scope: {
                  labelIdentifier: '@'
                , isRequired: '&'
                , isValid: '&'
            }
        };
    }]);

    _module.run(function ($templateCache) {
            $templateCache.put('backofficeLabelTemplate.html',
                '<div class="col-md-3">' +
                    '<label class="control-label" data-ng-class="{invalid: !isValid()}">' +
                        '<span data-ng-if="isRequired()||required" class="required-indicator">*</span>' +
                        '<span data-translate="{{labelIdentifier}}"></span>' +
                    '</label>' +
                '</div>'
            );
        });
})();