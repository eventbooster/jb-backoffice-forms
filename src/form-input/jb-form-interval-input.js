(function(undefined) {
    
    'use strict';

    var JBFormIntervalInputController = function ($scope, $attrs, $q, componentsService) {

        this.$scope     = $scope;
        this.$attrs     = $attrs;
        this.$q         = $q;
        this.componentsService  = componentsService;
        this.originalData       = undefined;
        this.required           = true;

    };

    JBFormIntervalInputController.prototype.isRequired = function(){
        return this.required === true;
    };

    JBFormIntervalInputController.prototype.isValid = function () {
        if(this.isRequired() && !this.isReadonly) return !!this.getValue();
        return true;
    };

    JBFormIntervalInputController.prototype.registerAt = function(parent){
        parent.registerGetDataHandler(this.updateData.bind(this));
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    JBFormIntervalInputController.prototype.unregisterAt = function(parent){
        parent.unregisterGetDataHandler(this.updateData.bind(this));
        parent.unregisterOptionsDataHandler(this.handleOptionsData.bind(this));
    };

    JBFormIntervalInputController.prototype.selectOptions = function(optionsData){
        var properties = (optionsData) ? optionsData.properties : optionsData;
        if(!properties || !properties.length) return;
        return properties.filter(function(property) { return property.name === this.name; }.bind(this))[0];
    };
    /**
     * @todo: switch into an error state
     * @param data
     */
    JBFormIntervalInputController.prototype.handleOptionsData = function(data){
        var spec = this.selectOptions(data);
        if(!angular.isDefined(spec)) return console.error('No options data available for interval field %o', this.name);
        this.options    = spec;
        this.required   = spec.nullable === false;
        this.isReadonly = this.isReadonly === true || spec.readonly === true;
    };

    JBFormIntervalInputController.prototype.getValue = function(){
        return (this.model || {}).value;
    };

    JBFormIntervalInputController.prototype.setValue = function(value){
        if(!this.model) this.model = {};
        this.model.value = value;
    };

    JBFormIntervalInputController.prototype.init = function (scope, element, attrs) {
        this.componentsService.registerComponent(scope, this);
        if(angular.isUndefined(this.showLabel)){
            this.showLabel = true;
        }
    };

    JBFormIntervalInputController.prototype.preLink = function (scope) {
    };

    JBFormIntervalInputController.prototype.getSelectFields = function(){
        return [this.name];
    };

    JBFormIntervalInputController.prototype.updateData = function (data) {
        //console.error('distribute %o', data, this.getValue());
        var fieldData = data[this.name];
        if (!fieldData) {
        	this.setValue('');
        	return;
        }
        // Convert data from server to string (which may be saved):
        // { days: 2, minutes: 4 } becomes "2 days 4 minutes"
        var valueString = Object.keys(fieldData).reduce(function(previous, current) {
        	return previous + fieldData[current] + ' ' + current + ' ';
        }, '').trim();
        this.setValue(valueString);
        // Only set originalData after model was updated, as getValue takes data from model.
        this.originalData = this.getValue();
    };

    JBFormIntervalInputController.prototype.displayLabel = function(){
        return this.hasLabel && this.showLabel !== false;
    };

    JBFormIntervalInputController.prototype.getSaveCalls = function () {

        //console.error(this.originalData, this.getValue());
    	// originalData may be undefined, while getValue is '' – no change, therefore don't
    	// store anything.
    	if (this.originalData === undefined && !this.getValue()) return [];

        if (this.originalData === this.getValue() || this.isReadonly) return [];

        var data = {};
        // If value is empty, explicitly store null (to make removals of a value possible),
        // see https://github.com/eventbooster/eventbooster-issues/issues/1289
        // Don't use null, but "null" as null won't be sent to the server
        data[this.name] = this.getValue() || '';
        return [{
            data: data
        }];
    };

    var _module = angular.module('jb.formComponents');
        _module.controller('JBFormIntervalInputController', [
            '$scope' ,
            '$attrs' ,
            '$q' ,
            'JBFormComponentsService' ,
            JBFormIntervalInputController]);

    /**
     * Directive for an autoFormElement for interval (see postgres docs)
     */
        _module.directive('jbFormIntervalInput', [function () {

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
                , controller: 'JBFormIntervalInputController'
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