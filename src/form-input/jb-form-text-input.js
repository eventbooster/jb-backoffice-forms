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
        if(!this.isRequired() || this.isReadonly) return true;
        return this.getValue() !== '' && this.getValue() !== undefined;
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
        console.log('JBFormTextInputController: Spec for %s is %o', this.name, spec);
        this.isReadonly = this.isReadonly === true || spec.readonly === true;
    };

    JBFormTextInputController.prototype.getValue = function(){
        return (this.model || {}).value;
    };

    JBFormTextInputController.prototype.setValue = function(value){
        if(!this.model) this.model = {};
        this.model.value = value;
    };

    JBFormTextInputController.prototype.init = function (scope, element, attrs) {
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
        this.originalData = this.getValue();
        this.setValue(data ? data[this.name] : data);
    };

    JBFormTextInputController.prototype.displayLabel = function(){
        return this.hasLabel && this.showLabel !== false;
    };

    JBFormTextInputController.prototype.getSaveCalls = function () {

        if (this.originalData === this.getValue() || this.isReadonly) return [];

        var data = {};
        data[this.name] = this.getValue();

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
                        name        : '@for'
                      , label       : '@?'
                      , isReadonly  : '<?'
                      , showLabel   : '<?'
                      , model       : '=?inputModel'
                  }
                , controllerAs      : '$ctrl'
                , bindToController  : true
                , link: {
                    post: function (scope, element, attrs, ctrl) {
                        ctrl.model          = {};
                        ctrl.hasInputModel  = attrs.hasOwnProperty('inputModel');
                        ctrl.hasLabel       = attrs.hasOwnProperty('label');
                        ctrl.init(scope, element, attrs);
                    }
                    , pre: function(scope, element, attrs, ctrl){
                        ctrl.preLink(scope, element, attrs);
                    }
                }
                , controller: 'JBFormTextInputController'
                , template: '<div class="form-group form-group-sm"> ' +
                                '<label ng-if="$ctrl.displayLabel()" jb-form-label-component label-identifier="{{$ctrl.label}}" is-valid="$ctrl.isValid()" is-required="$ctrl.isRequired()"></label> ' +
                                '<div ng-class="{ \'col-md-9\' : $ctrl.displayLabel(), \'col-md-12\' : !$ctrl.displayLabel() }" > ' +
                                    '<input type="text" ' +
                                            'ng-attr-id="$ctrl.name" ' +
                                            'ng-attrs-required="$ctrl.isRequired()" ' +
                                            'ng-model="$ctrl.model.value" ' +
                                            'ng-disabled="$ctrl.isReadonly" ' +
                                            'class="form-control input-sm" />' +
                                '</div> ' +
                            '</div> '
            };

        }]);
})();