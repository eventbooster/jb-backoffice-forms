(function (undefined) {
    'use strict';

    /**
     * Auto checkbox input.
     */

    var JBFormCheckboxInputController = function (componentsService) {
        this.subcomponentsService = componentsService;
    };

    JBFormCheckboxInputController.prototype.updateData = function (data) {
        this.setValue(data[this.name]);
        this.originalData = this.getValue();
    };

    JBFormCheckboxInputController.prototype.setValue = function(value){
        if(!this.hasModel) this.model = {};
        this.model.value = value;
    };

    JBFormCheckboxInputController.prototype.getValue = function(){
        return (this.model || {}).value;
    };

    JBFormCheckboxInputController.prototype.getSelectFields = function(){
        return [this.name];
    };

    JBFormCheckboxInputController.prototype.getSaveCalls = function () {
        if (this.originalData === this.getValue() || this.isReadonly) return [];

        var data = {};
        data[this.name] = this.getValue() === true;
        return [{
            data: data
        }];
    };

    JBFormCheckboxInputController.prototype.preLink = function (scope, element, attrs) {
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
        if(angular.isUndefined(this.showLabel)){
            this.showLabel = true;
        }
    };

    JBFormCheckboxInputController.prototype.displayLabel = function(){
        return this.hasLabel && this.showLabel !== false;
    };

    var _module = angular.module('jb.formComponents');
    _module.directive('jbFormCheckboxInput', [function () {

        return {
            scope : {

                  name        : '@for'
                , isReadonly  : '<?'
                , label       : '@?'
                , showLabel   : '<?'
                , model       : '=?inputModel'
            }
            , controller        : 'JBFormCheckboxInputController'
            , bindToController  : true
            , controllerAs      : '$ctrl'
            , link: {
                pre: function (scope, element, attrs, ctrl) {
                    ctrl.preLink(scope, element, attrs, ctrl);
                }
                , post: function (scope, element, attrs, ctrl) {
                    ctrl.hasLabel = attrs.hasOwnProperty('label');
                    ctrl.hasModel = attrs.hasOwnProperty('inputModel');
                    ctrl.init(scope, element, attrs);
                }
            }
            , template:
                '<div class="form-group">' +
                    '<label ng-if="$ctrl.displayLabel()" ' +
                            'jb-form-label-component ' +
                            'label-identifier="{{$ctrl.label}}" ' +
                            'is-valid="$ctrl.isValid()" ' +
                            'is-required="$ctr.isRequired()">' +
                    '</label>' +
                    '<div ng-class="{ \'col-md-9\' : $ctrl.displayLabel(), \'col-md-12\' : !$ctrl.displayLabel() }">' +
                        '<div class="checkbox">' +
                            '<input type="checkbox" data-ng-model="$ctrl.model.value"/>' +
                        '</div>' +
                    '</div>' +
                '</div>'
        };

    }]);

    _module.controller('JBFormCheckboxInputController', [
        'JBFormComponentsService',
        JBFormCheckboxInputController]);
})();