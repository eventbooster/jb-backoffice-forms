(function (undefined) {


    'use strict';

    function pad(nr) {
        return nr < 10 ? '0' + nr : nr;
    }

    var JBFormDateTimeInputController = function (componentsService) {

        this.subcomponentsService   = componentsService;
        this.originalData = undefined;
        this.required = true;

    };

    JBFormDateTimeInputController.prototype.getSelectFields = function(){
        return [this.name];
    };

    JBFormDateTimeInputController.prototype.isRequired = function () {
        return this.required === true;
    };

    JBFormDateTimeInputController.prototype.isValid = function () {
        if(this.isRequired() && !this.isReadonly) return !!this.value && isNaN(this.value.getTime());
        return true;
    };

    JBFormDateTimeInputController.prototype.setValue = function(value) {
        if(!this.model) this.model = {};
        this.model.value = value;
    };

    JBFormDateTimeInputController.prototype.getValue = function() {
        return (this.model || {}).value;
    };

    JBFormDateTimeInputController.prototype.updateData = function (data) {
        var value = (data) ? data[this.name] : data;
        this.setValue(value ? new Date(value) : undefined);
        this.originalData = this.getValue();
    };

    JBFormDateTimeInputController.prototype.getSaveCalls = function () {

        var   currentDate   = this.getValue()
            , originalDate  = this.originalData
            , call          = { data: {}}
            , dateString = '';
        // No date set
        if (!currentDate && !originalDate) return [];
        // Dates are the same
        if (currentDate && originalDate && currentDate.getTime() == originalDate.getTime()) return [];
        // a new date was set
        if (currentDate) {
            dateString = currentDate.getFullYear()
                + '-' + pad(currentDate.getMonth() + 1)
                + '-' + pad(currentDate.getDate())
                + ' ' + pad(currentDate.getHours())
                + ':' + pad(currentDate.getMinutes())
                + ':' + pad(currentDate.getSeconds());
        } // else, date was deleted
        call.data[this.name] = dateString;
        return [call];
    };

    JBFormDateTimeInputController.prototype.init = function (scope) {
        this.subcomponentsService.registerComponent(scope, this);
    };

    JBFormDateTimeInputController.prototype.displayLabel = function(){
        return this.hasLabel && this.showLabel !== false;
    };

    JBFormDateTimeInputController.prototype.registerAt = function (parent) {
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.updateData.bind(this));
    };

    JBFormDateTimeInputController.prototype.unregisterAt = function (parent) {
        parent.unregisterOptionsDataHandler(this.handleOptionsData);
        parent.unregisterGetDataHandler(this.updateData);
    };

    /**
    * Get spec for current element from options data
    */
    JBFormDateTimeInputController.prototype.selectSpec = function(data){
        var properties = (data && data.properties) ? data.properties : [];
        if(!properties.length) return ;
        for(var i=0; i<properties.length; i++){
            var property = properties[i];
            if(property.name === this.name) return property;
        }
    };

    JBFormDateTimeInputController.prototype.handleOptionsData = function (data) {
        var spec = this.selectSpec(data);

        if (!spec) return console.error('JBFormDateTimeInputController: No field spec for %o', this.name);

        this.required       = spec.nullable === false;
        this.isReadonly     = this.isReadonly === true || spec.readonly === true;

        this.showDate       = spec.type !== 'time';
        this.showTime       = spec.type === 'datetime' || spec.type === 'time';
        //this.showDate = true;
        //this.showTime = true;
    };

    var _module = angular.module('jb.formComponents');
    _module.directive('jbFormDateTimeInput', [function () {

        return {
              scope : {
                    name        : '@for'
                  , label       : '@?'
                  , showLabel   : '<?'
                  , isReadonly  : '<?'
                  , model       : '=?inputModel'
              }
            , controller        : 'JBFormDateTimeInputController'
            , bindToController  : true
            , controllerAs      : '$ctrl'
            , link: function (scope, element, attrs, ctrl) {
                  ctrl.hasLabel = attrs.hasOwnProperty('label');
                  ctrl.hasModel = attrs.hasOwnProperty('inputModel');
                  ctrl.init(scope, element, attrs);
            }
            , template:
                '<div class="form-group form-group-sm">' +
                    '<label ng-if="$ctrl.displayLabel()" jb-form-label-component label-identifier="{{$ctrl.label}}" is-required="$ctrl.isRequired()" is-valid="$ctrl.isValid()"></label>' +
                    '<div ng-class="{\'col-md-9\' : $ctrl.displayLabel(), \'col-md-12\': !ctrl.displayLabel() }">' +
                        '<div class="row">' +
                            '<div ng-if="$ctrl.showDate" ng-class="{ \'col-md-6\': $ctrl.showTime, \'col-md-12\': !$ctrl.showTime }">' +
                                '<input type="date" class="form-control input-sm input-date" data-ng-model="$ctrl.model.value" ng-disabled="$ctrl.isReadonly">' +
                            '</div>' +
                            '<div ng-if="$ctrl.showTime" ng-class="{ \'col-md-6\': $ctrl.showDate, \'col-md-12\': !$ctrl.showDate }">' +
                                '<input type="time" class="form-control input-sm input-time" data-ng-model="$ctrl.model.value" ng-disabled="$ctrl.isReadonly"/>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
        };

    }]);

    _module.controller(
          'JBFormDateTimeInputController'
        , [
              'JBFormComponentsService'
            , JBFormDateTimeInputController
        ]);

})();