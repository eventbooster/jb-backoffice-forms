(function(undefined) {
    'use strict';

    var JBFormTextInputController = function ($scope, $attrs, $q, componentsService) {

        this.$scope     = $scope;
        this.$attrs     = $attrs;
        this.$q         = $q;
        this.componentsService  = componentsService;
        this.originalData       = undefined;
        this.required           = true;

        this.options;
    };

    JBFormTextInputController.prototype.isRequired = function(){
        return this.required === true;
    };

    /**
     * @todo: check if the readonly property should influence the behavior
     * @returns {boolean}
     */
    JBFormTextInputController.prototype.isValid = function () {
        if(this.isRequired() && !this.isReadonly) return !!this.value;
        return true;
    };

    JBFormTextInputController.prototype.registerAt = function(parent){
        parent.registerGetDataHandler(this.updateData.bind(this));
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    JBFormTextInputController.prototype.unregisterAt = function(parent){
        parent.unregisterGetDataHandler(this.updateData.bind(this));
        parent.unregisterOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    JBFormTextInputController.prototype.selectOptions = function(optionsData){
        var properties = (optionsData) ? optionsData.properties : optionsData;
        if(!properties || !properties.length) return;
        for( var i = 0; i < properties.length; i++ ) {
            if(properties[i].name == this.name) return properties[i];
        }
    };
    /**
     * @todo: switch into an error state
     * @param data
     */
    JBFormTextInputController.prototype.handleOptionsData = function(data){
        var spec = this.selectOptions(data);
        if(!angular.isDefined(spec)) return console.error('No options data available for text-field %o', this.name);
        this.options    = spec;
        this.required   = spec.nullable === false;
        this.isReadonly = this.isReadonly === true || spec.readonly === true;
    };

    JBFormTextInputController.prototype.init = function (scope) {
        this.componentsService.registerComponent(scope, this);
        if(angular.isUndefined(this.showLabel)){
            this.showLabel = true;
        }
    };

    JBFormTextInputController.prototype.preLink = function (scope) {
    };

    JBFormTextInputController.prototype.getSelectFields = function(){
        return [this.name];
    };

    JBFormTextInputController.prototype.updateData = function (data) {
        this.originalData = this.value;
        this.value = data ? data[this.name] : data;
    };

    JBFormTextInputController.prototype.getSaveCalls = function () {

        if (this.originalData === this.value || this.isReadonly) return [];

        var data = {};
        data[this.name] = this.value;

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
                        label       : '@'
                      , name        : '@for'
                      , isReadonly  : '<?'
                      , showLabel   : '<?'
                  }
                , controllerAs      : '$ctrl'
                , bindToController  : true
                , link: {
                    post: function (scope, element, attrs, ctrl) {
                        ctrl.init(scope, element, attrs);
                    }
                    , pre: function(scope, element, attrs, ctrl){
                        ctrl.preLink(scope, element, attrs);
                    }
                }
                , controller: 'JBFormTextInputController'
                , template: '<div class="form-group form-group-sm">' +
                                '<label ng-if="$ctrl.showLabel" jb-form-label-component label-identifier="{{$ctrl.label}}" is-valid="$ctrl.isValid()" is-required="$ctrl.isRequired()"></label>' +
                                '<div ng-class="{ \'col-md-9\' : $ctrl.showLabel, \'col-md-12\' : !$ctrl.showLabel }" >' +
                                    '<input type="text" ' +
                                            'ng-attr-id="$ctrl.name" ' +
                                            'ng-attrs-required="$ctrl.isRequired()" ' +
                                            'ng-model="$ctrl.value"' +
                                            'ng-disabled="$ctrl.isReadonly"' +
                                            'class="form-control input-sm" />' +
                                '</div>' +
                            '</div>'
            };

        }]);
})();