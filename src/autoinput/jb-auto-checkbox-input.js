(function (undefined) {
    'use strict';

    /**
     * Auto checkbox input.
     *
     */

    var AutoCheckboxInputController = function ($scope, $attrs, componentsService) {

        this.$attrs = $attrs;
        this.$scope = $scope;
        this.name = $attrs['for'];
        this.label = this.name;

        $attrs.$observe('label', function (value) {
            this.label = value;
        }.bind(this));

        this.subcomponentsService = componentsService;
    };

    AutoCheckboxInputController.prototype.constructor = AutoCheckboxInputController;

    AutoCheckboxInputController.prototype.updateData = function (data) {
        this.originalData = this.$scope.data.value = data[this.name];
    };

    AutoCheckboxInputController.prototype.getSelectFields = function(){
        return this.name;
    };

    AutoCheckboxInputController.prototype.getSaveCalls = function () {
        if (this.originalData === this.$scope.data.value) return [];

        var data = {};
        data[this.$scope.data.name] = this.$scope.data.value === true;
        return [{
            data: data
        }];
    };

    AutoCheckboxInputController.prototype.preLink = function (scope, element, attrs) {
        scope.data = {
            value: undefined
            , name: this.name
            , valid: true
        };
    };

    AutoCheckboxInputController.prototype.isValid = function () {
        return true;
    };

    AutoCheckboxInputController.prototype.isRequired = function(){
        return false;
    };

    AutoCheckboxInputController.prototype.registerAt = function (parent) {
        parent.registerGetDataHandler(this.updateData.bind(this));
    };

    AutoCheckboxInputController.prototype.init = function (scope, element, attrs) {
        this.subcomponentsService.registerComponent(scope, this);
    };

    var _module;

    _module = angular.module('jb.backofficeAutoFormElement');
    _module.directive('autoCheckboxInput', [function () {

        return {
            scope: true
            , controller: 'AutoCheckboxInputController'
            , bindToController: true
            , controllerAs: '$ctrl'
            , link: {
                pre: function (scope, element, attrs, ctrl) {
                    ctrl.preLink(scope, element, attrs, ctrl);
                }
                , post: function (scope, element, attrs, ctrl) {
                    ctrl.init(scope, element, attrs);
                }
            }
            , template: '<div class="form-group">' +
            '<label data-backoffice-label data-label-identifier="{{$ctrl.label}}" data-is-valid="$ctrl.isValid()" data-is-required="$ctr.isRequired()"></label>' +
            '<div class="col-md-9">' +
            '<div class="checkbox">' +
            '<input type="checkbox" data-ng-model="data.value"/>' +
            '</div>' +
            '</div>' +
            '</div>'
        };

    }]);

    _module.controller('AutoCheckboxInputController', [
        '$scope',
        '$attrs',
        'backofficeSubcomponentsService',
        AutoCheckboxInputController]);
})();