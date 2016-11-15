(function (undefined) {
    'use strict';

    /**
     * Auto checkbox input.
     *
     */

    var JBFormCheckboxInputController = function ($scope, $attrs, componentsService) {

        this.$attrs = $attrs;
        this.$scope = $scope;
        this.name   = $attrs['for'];
        this.label  = this.name;

        $attrs.$observe('label', function (value) {
            this.label = value;
        }.bind(this));

        this.subcomponentsService = componentsService;
    };

    JBFormCheckboxInputController.prototype.updateData = function (data) {
        this.originalData = this.$scope.data.value = data[this.name];
    };

    JBFormCheckboxInputController.prototype.getSelectFields = function(){
        return this.name;
    };

    JBFormCheckboxInputController.prototype.getSaveCalls = function () {
        if (this.originalData === this.$scope.data.value) return [];

        var data = {};
        data[this.$scope.data.name] = this.$scope.data.value === true;
        return [{
            data: data
        }];
    };

    JBFormCheckboxInputController.prototype.preLink = function (scope, element, attrs) {
        scope.data = {
            value: undefined
            , name: this.name
            , valid: true
        };
    };

    JBFormCheckboxInputController.prototype.isValid = function () {
        return true;
    };

    JBFormCheckboxInputController.prototype.isRequired = function(){
        return false;
    };

    JBFormCheckboxInputController.prototype.registerAt = function (parent) {
        parent.registerGetDataHandler(this.updateData.bind(this));
    };

    JBFormCheckboxInputController.prototype.unregisterAt = function (parent) {
        parent.unregisterGetDataHandler(this.updateData);
    };

    JBFormCheckboxInputController.prototype.init = function (scope, element, attrs) {
        this.subcomponentsService.registerComponent(scope, this);
    };

    var _module = angular.module('jb.formComponents');
    _module.directive('jbFormCheckboxInput', [function () {

        return {
              scope             : true
            , controller        : 'JBFormCheckboxInputController'
            , bindToController  : true
            , controllerAs      : '$ctrl'
            , link: {
                pre: function (scope, element, attrs, ctrl) {
                    ctrl.preLink(scope, element, attrs, ctrl);
                }
                , post: function (scope, element, attrs, ctrl) {
                    ctrl.init(scope, element, attrs);
                }
            }
            , template: '<div class="form-group">' +
            '<label jb-form-label-component data-label-identifier="{{$ctrl.label}}" data-is-valid="$ctrl.isValid()" data-is-required="$ctr.isRequired()"></label>' +
            '<div class="col-md-9">' +
            '<div class="checkbox">' +
            '<input type="checkbox" data-ng-model="data.value"/>' +
            '</div>' +
            '</div>' +
            '</div>'
        };

    }]);

    _module.controller('JBFormCheckboxInputController', [
        '$scope',
        '$attrs',
        'JBFormComponentsService',
        JBFormCheckboxInputController]);
})();