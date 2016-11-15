(function (undefined) {


    'use strict';

    var JBFormDateTimeInputController = function ($scope, $attrs, componentsService) {
        this.$attrs = $attrs;
        this.$scope = $scope;
        this.subcomponentsService = componentsService;

        this.originalData = undefined;
        this.date = undefined;

        this.time = false;
        this.required = true;
    };

    JBFormDateTimeInputController.prototype.getSelectFields = function(){
        return [this.name];
    };

    JBFormDateTimeInputController.prototype.isRequired = function () {
        return this.required === true;
    };

    JBFormDateTimeInputController.prototype.isValid = function () {
        if (this.isRequired()) return !!this.date;
        return true;
    };

    JBFormDateTimeInputController.prototype.updateData = function (data) {
        var value = (data) ? data[this.name] : data;
        this.date = (value) ? new Date(value) : undefined;
        this.originalData = this.date;
    };

    function pad(nr) {
        return nr < 10 ? '0' + nr : nr;
    }

    JBFormDateTimeInputController.prototype.getSaveCalls = function () {

        var   currentDate   = this.date
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

    JBFormDateTimeInputController.prototype.registerAt = function (parent) {
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.updateData.bind(this));
    };

    JBFormDateTimeInputController.prototype.unregisterAt = function (parent) {
        parent.unregisterOptionsDataHandler(this.handleOptionsData);
        parent.unregisterGetDataHandler(this.updateData);
    };

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
        this.time           = spec.type === 'datetime';
        this.showDate       = spec.type !== 'time';
    };

    JBFormDateTimeInputController.prototype.showTime = function () {
        return this.time;
    };

    var _module = angular.module('jb.formComponents');
    _module.directive('jbFormDateTimeInput', [function () {

        return {
              scope : {
                    label : '@'
                  , name  : '@for'
              }
            , controller        : 'JBFormDateTimeInputController'
            , bindToController  : true
            , controllerAs      : '$ctrl'
            , link: function (scope, element, attrs, ctrl) {
                ctrl.init(scope, element, attrs);
            }
            , template:
                '<div class="form-group form-group-sm">' +
                    '<label jb-form-label-component data-label-identifier="{{$ctrl.label}}" data-is-required="$ctrl.isRequired()" data-is-valid="$ctrl.isValid()"></label>' +
                    '<div data-ng-class="{ \'col-md-9\': !$ctrl.showTime(), \'col-md-5\': $ctrl.showTime() }">' +
                        '<input type="date" class="form-control input-sm input-date" data-ng-model="$ctrl.date">' +
                    '</div>' +
                    '<div class="col-md-4" data-ng-if="$ctrl.showTime()">' +
                        '<input type="time" class="form-control input-sm input-time" data-ng-model="$ctrl.date" />' +
                    '</div>' +
                '</div>'
        };

    }]);

    _module.controller('JBFormDateTimeInputController', [
        '$scope',
        '$attrs',
        'JBFormComponentsService',
        JBFormDateTimeInputController]);

})();