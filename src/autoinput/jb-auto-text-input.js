(function(undefined) {
    'use strict';

    /**
     *
     */
    var AutoTextInputController = function ($scope, $attrs, componentsService) {

        this.$scope = $scope;
        this.$attrs = $attrs;
        this.name = $attrs['for'];
        this.label =  this.name;
        this.select = this.name;
        this.componentsService = componentsService;
        this.originalData = undefined;
        this.required = true;

        $attrs.$observe('label', function(label){
            this.label = label;
        }.bind(this))
    };

    AutoTextInputController.prototype.isRequired = function(){
        return this.required === true;
    };

    AutoTextInputController.prototype.isValid = function () {
        if(this.isRequired()) return !!this.$scope.data.value;
        return true;
    };

    AutoTextInputController.prototype.registerAt = function(parent){
        parent.registerGetDataHandler(this.updateData.bind(this));
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    AutoTextInputController.prototype.handleOptionsData = function(data){
        var spec = data[this.name];
        if(!angular.isDefined(spec)) return console.error('No options data available for text-field %o', this.name);
        this.required = spec.required === true;
    };

    AutoTextInputController.prototype.init = function (scope) {
        this.componentsService.registerComponent(scope, this);
    };

    AutoTextInputController.prototype.preLink = function (scope) {
        scope.data = {
              name: this.name
            , value: undefined
            , valid: false
        };
    };

    AutoTextInputController.prototype.updateData = function (data) {
        this.originalData = this.$scope.data.value = data[this.name];
    };

    AutoTextInputController.prototype.getSaveCalls = function () {

        if (this.originalData === this.$scope.data.value) return [];

        var data = {};
        data[this.name] = this.$scope.data.value;

        return [{
            data: data
        }];
    };

    var _module = angular.module('jb.backofficeAutoFormElement');
        _module.controller('AutoTextInputController', [
            '$scope' ,
            '$attrs' ,
            'backofficeSubcomponentsService' ,
            AutoTextInputController]);

    /**
     * Directive for an autoFormElement of type 'text'
     */
        _module.directive('autoTextInput', [function () {

            return {
                  scope : true
                , controllerAs: '$ctrl'
                , link: {
                    post: function (scope, element, attrs, ctrl) {
                        ctrl.init(scope, element, attrs);
                    }
                    , pre: function(scope, element, attrs, ctrl){
                        ctrl.preLink(scope, element, attrs);
                    }
                }
                , controller: 'AutoTextInputController'
                , template: '<div class=\'form-group form-group-sm\'>' +
                                '<label data-backoffice-label data-label-identifier="{{$ctrl.label}}" data-is-valid="$ctrl.isValid()" data-is-required="$ctrl.isRequired()"></label>' +
                                '<div class="col-md-9">' +
                                    '<input type="text" data-ng-attr-id="data.name" class="form-control input-sm" data-ng-attrs-required="$ctrl.isRequired()" data-ng-model="data.value"/>' +
                                '</div>' +
                            '</div>'
            };

        }]);
})();