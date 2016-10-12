(function(undefined) {
    'use strict';

    /**
     *
     */
    var JBFormTextInputController = function ($scope, $attrs, $q, componentsService) {

        this.$scope = $scope;
        this.$attrs = $attrs;
        this.name = $attrs['for'];
        this.$q = $q;
        this.label =  this.name;
        this.select = this.name;
        this.componentsService = componentsService;
        this.originalData = undefined;
        this.required = true;
    };

    JBFormTextInputController.prototype.isRequired = function(){
        return this.required === true;
    };

    JBFormTextInputController.prototype.isValid = function () {
        if(this.isRequired()) return !!this.$scope.data.value;
        return true;
    };

    JBFormTextInputController.prototype.registerAt = function(parent){
        parent.registerGetDataHandler(this.updateData.bind(this));
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    /*AutoJBFormTextInputController.prototype.getBeforeSaveTasks = function(initialPromise){
        return initialPromise.then(function(entity){
            if (this.originalData !== this.$scope.data.value){
                entity[this.name] = this.$scope.data.value;
            }
            return entity;
        }.bind(this));
    };*/

    JBFormTextInputController.prototype.handleOptionsData = function(data){
        var spec = data[this.name];
        if(!angular.isDefined(spec)) return console.error('No options data available for text-field %o', this.name);
        this.required = spec.required === true;
    };

    JBFormTextInputController.prototype.init = function (scope) {
        this.componentsService.registerComponent(scope, this);
    };

    JBFormTextInputController.prototype.preLink = function (scope) {
        scope.data = {
              name: this.name
            , value: undefined
            , valid: false
        };
    };

    JBFormTextInputController.prototype.updateData = function (data) {
        if(!data) return;
        this.originalData = this.$scope.data.value = data[this.name];
    };

    JBFormTextInputController.prototype.getSaveCalls = function () {

        if (this.originalData === this.$scope.data.value) return [];

        var data = {};
        data[this.name] = this.$scope.data.value;

        return [{
            data: data
        }];
    };

    var _module = angular.module('jb.formComponents');
        _module.controller('JBFormTextInputController', [
            '$scope' ,
            '$attrs' ,
            '$q' ,
            'JBFormComponentsService' ,
            JBFormTextInputController]);

    /**
     * Directive for an autoFormElement of type 'text'
     */
        _module.directive('jbFormTextInput', [function () {

            return {
                  scope : {
                        label: '@'
                      , name: '@for'
                  }
                , controllerAs: '$ctrl'
                , bindToController: true
                , link: {
                    post: function (scope, element, attrs, ctrl) {
                        ctrl.init(scope, element, attrs);
                    }
                    , pre: function(scope, element, attrs, ctrl){
                        ctrl.preLink(scope, element, attrs);
                    }
                }
                , controller: 'JBFormTextInputController'
                , template: '<div class=\'form-group form-group-sm\'>' +
                                '<label jb-form-label-component data-label-identifier="{{$ctrl.label}}" data-is-valid="$ctrl.isValid()" data-is-required="$ctrl.isRequired()"></label>' +
                                '<div class="col-md-9">' +
                                    '<input type="text" data-ng-attr-id="data.name" class="form-control input-sm" data-ng-attrs-required="$ctrl.isRequired()" data-ng-model="data.value"/>' +
                                '</div>' +
                            '</div>'
            };

        }]);
})();